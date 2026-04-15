param(
    [Parameter(Mandatory = $true)]
    [string]$TargetNamespace,
    [string]$SourceNamespace = "ns-vg9l39bk",
    [string]$DeploymentName = "storyforge",
    [string]$SecretName = "storyforge-env",
    [string]$PvcName = "storyforge-data",
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
    $json.metadata.resourceVersion = $null
    $json.metadata.uid = $null
    $json.metadata.creationTimestamp = $null
    $json.metadata.annotations.'kubectl.kubernetes.io/last-applied-configuration' = $null
    $json.metadata.managedFields = $null
    $json.status = $null
    $json | ConvertTo-Json -Depth 100 | kubectl apply -f -
}

Require-Command kubectl

$workspace = Join-Path ([System.IO.Path]::GetTempPath()) ("storyforge-migrate-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $workspace | Out-Null
$backupDir = Join-Path $workspace "projects"
$manifestPath = Join-Path $workspace "storyforge.yaml"

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
    Set-Content -Path $manifestPath -Value $manifest -Encoding UTF8

    Write-Host "Applying workload in target namespace..."
    kubectl apply -f $manifestPath | Out-Null

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
    kubectl cp "$backupDir/." "${TargetNamespace}/${targetPod}:/data"

    Write-Host "Restarting target deployment..."
    kubectl rollout restart deploy/$DeploymentName -n $TargetNamespace | Out-Null
    kubectl rollout status deploy/$DeploymentName -n $TargetNamespace --timeout=300s | Out-Null

    Write-Host "Cleaning temporary pods..."
    kubectl delete pod $sourcePod -n $SourceNamespace --ignore-not-found | Out-Null
    kubectl delete pod $targetPod -n $TargetNamespace --ignore-not-found | Out-Null

    if ($DeleteSourceAfterCutover) {
        Write-Host "Deleting source storyforge resources from shared namespace..."
        kubectl delete ingress network-boyqxnosbdrk -n $SourceNamespace --ignore-not-found | Out-Null
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
