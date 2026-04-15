param(
    [Parameter(Mandatory = $true)]
    [string]$TargetNamespace,
    [string]$SourceNamespace = "ns-vg9l39bk",
    [string]$DeploymentName = "storyforge",
    [string]$SecretName = "storyforge-env",
    [string]$PvcName = "storyforge-data",
    [string]$SourceIngressName = "network-boyqxnosbdrk",
    [string]$IngressHost = "bjmmuazhczom.cloud.sealos.io",
    [switch]$DeleteSourceAfterCutover
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Require-Command {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Missing required command: $Name"
    }
}

function Wait-ForPodReady {
    param(
        [string]$Namespace,
        [string]$Name
    )

    kubectl wait --for=condition=Ready "pod/$Name" -n $Namespace --timeout=180s | Out-Null
}

function Copy-JsonResource {
    param(
        [string]$Kind,
        [string]$Name,
        [string]$Namespace,
        [string]$TargetNamespace
    )

    $json = kubectl get $Kind $Name -n $Namespace -o json | ConvertFrom-Json
    $json.metadata.namespace = $TargetNamespace
    [void]$json.metadata.PSObject.Properties.Remove("resourceVersion")
    [void]$json.metadata.PSObject.Properties.Remove("uid")
    [void]$json.metadata.PSObject.Properties.Remove("creationTimestamp")
    [void]$json.metadata.PSObject.Properties.Remove("managedFields")
    if ($json.metadata.annotations) {
        [void]$json.metadata.annotations.PSObject.Properties.Remove("kubectl.kubernetes.io/last-applied-configuration")
    }
    $json.status = $null
    $json | ConvertTo-Json -Depth 100 | kubectl apply -f -
}

function Copy-BackupItemsToTarget {
    param(
        [string]$LocalBackupDir,
        [string]$Namespace,
        [string]$PodName
    )

    $items = Get-ChildItem -Force $LocalBackupDir
    foreach ($item in $items) {
        $targetPath = "/data/$($item.Name)"
        if ($item.PSIsContainer) {
            kubectl exec -n $Namespace $PodName -- sh -lc "mkdir -p '$targetPath'" | Out-Null
        }
        kubectl cp $item.FullName "${Namespace}/${PodName}:$targetPath"
    }
}

function Apply-ManifestString {
    param([string]$Manifest)
    $Manifest | kubectl apply -f - | Out-Null
}

Require-Command kubectl

$workspace = ".tmp-storyforge-migrate-$([guid]::NewGuid().ToString("N"))"
New-Item -ItemType Directory -Path $workspace | Out-Null
$backupDir = Join-Path $workspace "projects"

try {
    Write-Host "Checking source namespace access..."
    kubectl get deploy $DeploymentName -n $SourceNamespace | Out-Null

    Write-Host "Checking target namespace access..."
    kubectl get namespace $TargetNamespace | Out-Null
    kubectl auth can-i create deployments -n $TargetNamespace | Out-Null

    Write-Host "Scaling down source deployment to freeze writes..."
    kubectl scale deploy $DeploymentName -n $SourceNamespace --replicas=0 | Out-Null
    kubectl rollout status deploy/$DeploymentName -n $SourceNamespace --timeout=180s | Out-Null

    $sourcePod = "storyforge-migrate-source"
    $targetPod = "storyforge-migrate-target"

    Write-Host "Creating temporary source pod..."
    @"
apiVersion: v1
kind: Pod
metadata:
  name: $sourcePod
  namespace: $SourceNamespace
spec:
  restartPolicy: Never
  containers:
    - name: copy
      image: busybox:1.36
      command: ["sh", "-lc", "sleep 3600"]
      volumeMounts:
        - name: data
          mountPath: /data
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: $PvcName
"@ | kubectl apply -f - | Out-Null
    Wait-ForPodReady -Namespace $SourceNamespace -Name $sourcePod

    Write-Host "Copying data out of source PVC..."
    kubectl cp "$SourceNamespace/${sourcePod}:/data/." $backupDir

    Write-Host "Copying runtime secret into target namespace..."
    Copy-JsonResource -Kind secret -Name $SecretName -Namespace $SourceNamespace -TargetNamespace $TargetNamespace

    Write-Host "Rendering standalone manifest for target namespace..."
    $manifest = Get-Content (Join-Path $PSScriptRoot "..\\deploy\\sealos\\storyforge.yaml") -Raw
    $manifest = $manifest.Replace("`r`n", "`n")
    $manifest = $manifest.Replace("kind: Namespace`nmetadata:`n  name: storyforge", "kind: Namespace`nmetadata:`n  name: $TargetNamespace")
    $manifest = $manifest.Replace("namespace: storyforge", "namespace: $TargetNamespace")
    $manifest = $manifest.Replace("host: bjmmuazhczom.cloud.sealos.io", "host: $IngressHost")
    $nonIngressManifest = (($manifest -split "(?m)^---\s*$") | Where-Object { $_ -and ($_ -notmatch "(?m)^kind:\s*Ingress\s*$") }) -join "`n---`n"
    $nonIngressManifest = $nonIngressManifest.Replace("replicas: 1", "replicas: 0")
    $ingressManifest = (($manifest -split "(?m)^---\s*$") | Where-Object { $_ -and ($_ -match "(?m)^kind:\s*Ingress\s*$") }) -join "`n---`n"

    Write-Host "Applying non-ingress workload in target namespace..."
    Apply-ManifestString -Manifest $nonIngressManifest

    Write-Host "Creating temporary target pod..."
    @"
apiVersion: v1
kind: Pod
metadata:
  name: $targetPod
  namespace: $TargetNamespace
spec:
  restartPolicy: Never
  containers:
    - name: copy
      image: busybox:1.36
      command: ["sh", "-lc", "sleep 3600"]
      volumeMounts:
        - name: data
          mountPath: /data
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: $PvcName
"@ | kubectl apply -f - | Out-Null
    Wait-ForPodReady -Namespace $TargetNamespace -Name $targetPod

    Write-Host "Restoring data into target PVC..."
    Copy-BackupItemsToTarget -LocalBackupDir $backupDir -Namespace $TargetNamespace -PodName $targetPod

    Write-Host "Stopping temporary target pod..."
    kubectl delete pod $targetPod -n $TargetNamespace --ignore-not-found | Out-Null

    Write-Host "Starting target deployment..."
    kubectl scale deploy $DeploymentName -n $TargetNamespace --replicas=1 | Out-Null
    kubectl rollout status deploy/$DeploymentName -n $TargetNamespace --timeout=300s | Out-Null

    Write-Host "Verifying target application health..."
    kubectl exec -n $TargetNamespace deploy/$DeploymentName -- sh -lc "curl -fsS http://127.0.0.1:1241/health >/dev/null" | Out-Null

    Write-Host "Switching ingress to target namespace..."
    kubectl delete ingress $SourceIngressName -n $SourceNamespace --ignore-not-found | Out-Null
    Apply-ManifestString -Manifest $ingressManifest

    Write-Host "Cleaning temporary pods..."
    kubectl delete pod $sourcePod -n $SourceNamespace --ignore-not-found | Out-Null

    if ($DeleteSourceAfterCutover) {
        Write-Host "Deleting source storyforge resources from shared namespace..."
        kubectl delete svc storyforge-lomeuvwyfvlj -n $SourceNamespace --ignore-not-found | Out-Null
        kubectl delete deploy $DeploymentName -n $SourceNamespace --ignore-not-found | Out-Null
        kubectl delete pvc $PvcName -n $SourceNamespace --ignore-not-found | Out-Null
        kubectl delete secret $SecretName -n $SourceNamespace --ignore-not-found | Out-Null
    }

    Write-Host "Migration completed."
    Write-Host "Target namespace: $TargetNamespace"
    Write-Host "Public host: https://$IngressHost"
}
finally {
    if (Test-Path $workspace) {
        Remove-Item -Recurse -Force $workspace
    }
}
