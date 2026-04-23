param(
    [string]$Namespace = "ns-qkcc8vj1",
    [string]$ManifestPath = (Join-Path $PSScriptRoot "..\deploy\sealos\frametale.yaml"),
    [string]$LegacySecretName = "storyforge-env",
    [string]$TargetSecretName = "frametale-env",
    [switch]$DeleteLegacyResources,
    [switch]$DeleteLegacyStorage
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Require-Command {
    param([string]$Name)

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Missing required command: $Name"
    }
}

function Invoke-Step {
    param(
        [string]$Label,
        [scriptblock]$Command
    )

    Write-Host "==> $Label"
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "Step failed: $Label"
    }
}

function Get-Stdout {
    param(
        [string]$Label,
        [scriptblock]$Command
    )

    Write-Host "==> $Label"
    $output = & $Command 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Step failed: $Label"
    }

    return ($output | Out-String).Trim()
}

function Join-ManifestDocuments {
    param([string[]]$Documents)

    return (($Documents | Where-Object { $_ -and $_.Trim() }) -join "`n---`n")
}

function Apply-ManifestString {
    param([string]$Manifest)

    if (-not $Manifest.Trim()) {
        throw "Refusing to apply an empty manifest."
    }

    $Manifest | kubectl apply -f - | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "kubectl apply failed."
    }
}

function Get-ManifestDocument {
    param(
        [string[]]$Documents,
        [string]$Kind,
        [string]$Name
    )

    foreach ($document in $Documents) {
        if (
            $document -match "(?m)^kind:\s*$([regex]::Escape($Kind))\s*$" -and
            $document -match "(?m)^  name:\s*$([regex]::Escape($Name))\s*$"
        ) {
            return $document.Trim()
        }
    }

    throw "Unable to find manifest document for $Kind/$Name in $ManifestPath"
}

function Set-DeploymentReplicas {
    param(
        [string]$Document,
        [int]$Replicas
    )

    return ($Document -replace "(?m)^  replicas:\s*\d+\s*$", "  replicas: $Replicas")
}

function Copy-Secret {
    param(
        [string]$SourceName,
        [string]$TargetName,
        [string]$Namespace
    )

    $secret = kubectl get secret $SourceName -n $Namespace -o json | ConvertFrom-Json
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to read secret/$SourceName"
    }

    $secret.metadata.name = $TargetName
    [void]$secret.metadata.PSObject.Properties.Remove("resourceVersion")
    [void]$secret.metadata.PSObject.Properties.Remove("uid")
    [void]$secret.metadata.PSObject.Properties.Remove("creationTimestamp")
    [void]$secret.metadata.PSObject.Properties.Remove("managedFields")
    [void]$secret.metadata.PSObject.Properties.Remove("ownerReferences")
    if ($secret.metadata.annotations) {
        [void]$secret.metadata.annotations.PSObject.Properties.Remove("kubectl.kubernetes.io/last-applied-configuration")
    }
    [void]$secret.PSObject.Properties.Remove("status")

    $secret | ConvertTo-Json -Depth 100 | kubectl apply -f - | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to apply secret/$TargetName"
    }
}

function Wait-ForRollout {
    param(
        [ValidateSet("deployment", "statefulset")]
        [string]$Kind,
        [string]$Name,
        [string]$Namespace,
        [int]$TimeoutSeconds = 300
    )

    Invoke-Step "Wait $Kind/$Name rollout" {
        kubectl rollout status "$Kind/$Name" -n $Namespace --timeout="${TimeoutSeconds}s"
    }
}

function Remove-PodIfExists {
    param(
        [string]$Name,
        [string]$Namespace
    )

    kubectl delete pod $Name -n $Namespace --ignore-not-found | Out-Null
}

function New-UtilityPod {
    param(
        [string]$Name,
        [string]$Namespace,
        [string]$Manifest
    )

    Remove-PodIfExists -Name $Name -Namespace $Namespace
    Apply-ManifestString -Manifest $Manifest
    Invoke-Step "Wait pod/$Name ready" {
        kubectl wait --for=condition=Ready "pod/$Name" -n $Namespace --timeout=180s
    }
}

function Apply-FrametaleServices {
    param([string]$Namespace)

    Apply-ManifestString -Manifest @"
apiVersion: v1
kind: Service
metadata:
  name: frametale-backend
  namespace: $Namespace
  labels:
    app.kubernetes.io/name: frametale-backend
spec:
  selector:
    app: frametale-backend
  ports:
    - name: http
      port: 1241
      targetPort: 1241
---
apiVersion: v1
kind: Service
metadata:
  name: frametale-frontend
  namespace: $Namespace
  labels:
    app.kubernetes.io/name: frametale-frontend
spec:
  selector:
    app: frametale-frontend
  ports:
    - name: http
      port: 80
      targetPort: 8080
"@
}

Require-Command kubectl
Require-Command curl.exe

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$documents = ((Get-Content $ManifestPath -Raw) -replace "`r`n", "`n") -split "(?m)^---\s*$" | Where-Object { $_.Trim() }
$bootstrapManifest = Join-ManifestDocuments @(
    Get-ManifestDocument -Documents $documents -Kind "PersistentVolumeClaim" -Name "frametale-projects-data"
    Get-ManifestDocument -Documents $documents -Kind "PersistentVolumeClaim" -Name "frametale-redis-data"
    Get-ManifestDocument -Documents $documents -Kind "Service" -Name "frametale-postgres"
    Get-ManifestDocument -Documents $documents -Kind "StatefulSet" -Name "frametale-postgres"
    Get-ManifestDocument -Documents $documents -Kind "Service" -Name "frametale-redis"
    Set-DeploymentReplicas -Document (Get-ManifestDocument -Documents $documents -Kind "Deployment" -Name "frametale-redis") -Replicas 0
    Set-DeploymentReplicas -Document (Get-ManifestDocument -Documents $documents -Kind "Deployment" -Name "frametale-backend") -Replicas 0
    Set-DeploymentReplicas -Document (Get-ManifestDocument -Documents $documents -Kind "Deployment" -Name "frametale-frontend") -Replicas 0
)

$projectsSourcePod = "storyforge-projects-src"
$projectsTargetPod = "frametale-projects-dst"
$legacySourcePod = "storyforge-legacy-src"
$redisSourcePod = "storyforge-redis-src"
$redisTargetPod = "frametale-redis-dst"
$postgresCopyPod = "frametale-postgres-copy"

$tempRoot = ".tmp-cutover-sync"
$projectsLocal = Join-Path $tempRoot "projects-pvc"
$legacyLocal = Join-Path $tempRoot "legacy-pvc"
$redisLocal = Join-Path $tempRoot "redis-pvc"

Push-Location $repoRoot
try {
    Invoke-Step "Check namespace access" {
        kubectl get namespace $Namespace
    }
    Invoke-Step "Check legacy secret access" {
        kubectl get secret $LegacySecretName -n $Namespace
    }

    Write-Host "==> Copy frametale runtime secret"
    Copy-Secret -SourceName $LegacySecretName -TargetName $TargetSecretName -Namespace $Namespace

    Write-Host "==> Bootstrap frametale storage and database"
    Apply-ManifestString -Manifest $bootstrapManifest
    Wait-ForRollout -Kind statefulset -Name "frametale-postgres" -Namespace $Namespace -TimeoutSeconds 300

    Write-Host "==> Create helper pods"
    New-UtilityPod -Name $projectsSourcePod -Namespace $Namespace -Manifest @"
apiVersion: v1
kind: Pod
metadata:
  name: $projectsSourcePod
  namespace: $Namespace
spec:
  restartPolicy: Never
  containers:
    - name: shell
      image: alpine:3.20
      command: ["sh", "-lc", "sleep 3600"]
      securityContext:
        allowPrivilegeEscalation: false
      volumeMounts:
        - name: data
          mountPath: /data
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: storyforge-projects-data
"@
    New-UtilityPod -Name $projectsTargetPod -Namespace $Namespace -Manifest @"
apiVersion: v1
kind: Pod
metadata:
  name: $projectsTargetPod
  namespace: $Namespace
spec:
  restartPolicy: Never
  containers:
    - name: shell
      image: alpine:3.20
      command: ["sh", "-lc", "sleep 3600"]
      securityContext:
        allowPrivilegeEscalation: false
      volumeMounts:
        - name: data
          mountPath: /data
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: frametale-projects-data
"@
    New-UtilityPod -Name $legacySourcePod -Namespace $Namespace -Manifest @"
apiVersion: v1
kind: Pod
metadata:
  name: $legacySourcePod
  namespace: $Namespace
spec:
  restartPolicy: Never
  containers:
    - name: shell
      image: alpine:3.20
      command: ["sh", "-lc", "sleep 3600"]
      securityContext:
        allowPrivilegeEscalation: false
      volumeMounts:
        - name: data
          mountPath: /data
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: storyforge-data
"@
    New-UtilityPod -Name $redisSourcePod -Namespace $Namespace -Manifest @"
apiVersion: v1
kind: Pod
metadata:
  name: $redisSourcePod
  namespace: $Namespace
spec:
  restartPolicy: Never
  containers:
    - name: shell
      image: alpine:3.20
      command: ["sh", "-lc", "sleep 3600"]
      securityContext:
        allowPrivilegeEscalation: false
      volumeMounts:
        - name: data
          mountPath: /data
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: storyforge-redis-data
"@
    New-UtilityPod -Name $redisTargetPod -Namespace $Namespace -Manifest @"
apiVersion: v1
kind: Pod
metadata:
  name: $redisTargetPod
  namespace: $Namespace
spec:
  restartPolicy: Never
  containers:
    - name: shell
      image: alpine:3.20
      command: ["sh", "-lc", "sleep 3600"]
      securityContext:
        allowPrivilegeEscalation: false
      volumeMounts:
        - name: data
          mountPath: /data
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: frametale-redis-data
"@

    Invoke-Step "Scale down legacy deployments" {
        kubectl scale deployment storyforge storyforge-backend storyforge-frontend storyforge-redis -n $Namespace --replicas=0
    }
    Wait-ForRollout -Kind deployment -Name "storyforge" -Namespace $Namespace -TimeoutSeconds 300
    Wait-ForRollout -Kind deployment -Name "storyforge-backend" -Namespace $Namespace -TimeoutSeconds 300
    Wait-ForRollout -Kind deployment -Name "storyforge-frontend" -Namespace $Namespace -TimeoutSeconds 300
    Wait-ForRollout -Kind deployment -Name "storyforge-redis" -Namespace $Namespace -TimeoutSeconds 300

    Invoke-Step "Scale down frametale deployments for final sync" {
        kubectl scale deployment frametale-backend frametale-frontend frametale-redis -n $Namespace --replicas=0
    }
    Wait-ForRollout -Kind deployment -Name "frametale-backend" -Namespace $Namespace -TimeoutSeconds 300
    Wait-ForRollout -Kind deployment -Name "frametale-frontend" -Namespace $Namespace -TimeoutSeconds 300
    Wait-ForRollout -Kind deployment -Name "frametale-redis" -Namespace $Namespace -TimeoutSeconds 300

    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
    New-Item -ItemType Directory -Path $tempRoot | Out-Null
    New-Item -ItemType Directory -Path $projectsLocal | Out-Null
    New-Item -ItemType Directory -Path $legacyLocal | Out-Null
    New-Item -ItemType Directory -Path $redisLocal | Out-Null

    Invoke-Step "Copy storyforge projects PVC to local temp" {
        kubectl cp "${Namespace}/${projectsSourcePod}:/data/." $projectsLocal
    }
    Invoke-Step "Copy storyforge legacy PVC to local temp" {
        kubectl cp "${Namespace}/${legacySourcePod}:/data/." $legacyLocal
    }
    Invoke-Step "Copy storyforge redis PVC to local temp" {
        kubectl cp "${Namespace}/${redisSourcePod}:/data/." $redisLocal
    }

    Remove-Item -LiteralPath (Join-Path $projectsLocal "lost+found") -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath (Join-Path $legacyLocal "lost+found") -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath (Join-Path $redisLocal "lost+found") -Recurse -Force -ErrorAction SilentlyContinue

    Invoke-Step "Reset frametale projects PVC contents" {
        kubectl exec -n $Namespace $projectsTargetPod -- sh -lc "rm -rf /data/projects /data/vertex_keys /data/claude_data /data/legacy_storyforge_data && mkdir -p /data/projects /data/vertex_keys /data/claude_data /data/legacy_storyforge_data"
    }
    Invoke-Step "Copy projects PVC contents into frametale projects PVC" {
        kubectl cp ".\.tmp-cutover-sync\projects-pvc\." "${Namespace}/${projectsTargetPod}:/data"
    }
    Invoke-Step "Copy legacy storyforge backup into frametale projects PVC" {
        kubectl cp ".\.tmp-cutover-sync\legacy-pvc\." "${Namespace}/${projectsTargetPod}:/data/legacy_storyforge_data"
    }

    Invoke-Step "Reset frametale redis PVC contents" {
        kubectl exec -n $Namespace $redisTargetPod -- sh -lc "rm -rf /data/appendonlydir /data/dump.rdb && mkdir -p /data"
    }
    Invoke-Step "Copy redis PVC contents into frametale redis PVC" {
        kubectl cp ".\.tmp-cutover-sync\redis-pvc\." "${Namespace}/${redisTargetPod}:/data"
    }

    New-UtilityPod -Name $postgresCopyPod -Namespace $Namespace -Manifest @"
apiVersion: v1
kind: Pod
metadata:
  name: $postgresCopyPod
  namespace: $Namespace
spec:
  restartPolicy: Never
  containers:
    - name: postgres
      image: postgres:16-alpine
      command: ["sh", "-lc", "sleep 3600"]
      env:
        - name: PGPASSWORD
          valueFrom:
            secretKeyRef:
              name: $TargetSecretName
              key: POSTGRES_PASSWORD
"@
    Invoke-Step "Copy PostgreSQL data from storyforge to frametale" {
        kubectl exec -n $Namespace $postgresCopyPod -- sh -lc "pg_dump --clean --if-exists --no-owner --no-privileges -h storyforge-postgres -U storyforge -d storyforge | psql -h frametale-postgres -U frametale -d frametale"
    }

    $legacyTables = Get-Stdout "Read legacy PostgreSQL table count" {
        kubectl exec -n $Namespace $postgresCopyPod -- sh -lc "psql -h storyforge-postgres -U storyforge -d storyforge -Atqc `"SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';`""
    }
    $frametaleTables = Get-Stdout "Read frametale PostgreSQL table count" {
        kubectl exec -n $Namespace $postgresCopyPod -- sh -lc "psql -h frametale-postgres -U frametale -d frametale -Atqc `"SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';`""
    }
    if ($legacyTables -and $frametaleTables -and $legacyTables -ne $frametaleTables) {
        throw "PostgreSQL table count mismatch after copy: storyforge=$legacyTables frametale=$frametaleTables"
    }

    Write-Host "==> Apply frametale services"
    Apply-FrametaleServices -Namespace $Namespace

    Invoke-Step "Scale up frametale deployments" {
        kubectl scale deployment frametale-redis frametale-backend frametale-frontend -n $Namespace --replicas=1
    }
    Wait-ForRollout -Kind deployment -Name "frametale-redis" -Namespace $Namespace -TimeoutSeconds 300
    Wait-ForRollout -Kind deployment -Name "frametale-backend" -Namespace $Namespace -TimeoutSeconds 300
    Wait-ForRollout -Kind deployment -Name "frametale-frontend" -Namespace $Namespace -TimeoutSeconds 300

    $backendHealth = Get-Stdout "Check frametale-backend health" {
        kubectl exec -n $Namespace deploy/frametale-backend -- python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:1241/health').read().decode())"
    }
    $frontendHealth = Get-Stdout "Check frametale-frontend health" {
        kubectl exec -n $Namespace deploy/frametale-frontend -- sh -lc "wget -q -O - http://127.0.0.1:8080/health"
    }
    if (-not $backendHealth) {
        throw "Frametale backend health check returned an empty response."
    }
    if (-not $frontendHealth) {
        throw "Frametale frontend health check returned an empty response."
    }

    Invoke-Step "Apply checked-in frametale manifest" {
        kubectl apply -f $ManifestPath
    }

    Start-Sleep -Seconds 5
    $externalHealth = Get-Stdout "Check public frametale health endpoint" {
        curl.exe -fsS https://frametale.studio/health
    }
    if (-not $externalHealth) {
        throw "Public frametale health endpoint returned an empty response."
    }

    if ($DeleteLegacyResources) {
        Invoke-Step "Delete legacy storyforge deployments" {
            kubectl delete deployment storyforge storyforge-backend storyforge-frontend storyforge-redis -n $Namespace --ignore-not-found
        }
        Invoke-Step "Delete legacy storyforge statefulset" {
            kubectl delete statefulset storyforge-postgres -n $Namespace --ignore-not-found
        }
        Invoke-Step "Delete legacy storyforge services" {
            kubectl delete service storyforge storyforge-backend storyforge-frontend storyforge-postgres storyforge-redis -n $Namespace --ignore-not-found
        }
        Invoke-Step "Delete legacy storyforge secret" {
            kubectl delete secret $LegacySecretName -n $Namespace --ignore-not-found
        }
        Invoke-Step "Delete legacy storyforge app" {
            kubectl delete app storyforge-app -n $Namespace --ignore-not-found
        }
    }

    if ($DeleteLegacyStorage) {
        Invoke-Step "Delete legacy storyforge PVCs" {
            kubectl delete pvc storyforge-projects-data storyforge-data storyforge-redis-data postgres-data-storyforge-postgres-0 -n $Namespace --ignore-not-found
        }
    }

    Write-Host "Frametale cutover completed."
    Write-Host "Legacy tables: $legacyTables"
    Write-Host "Frametale tables: $frametaleTables"
    Write-Host "Backend health: $backendHealth"
    Write-Host "Frontend health: $frontendHealth"
    Write-Host "External health: $externalHealth"
}
finally {
    Remove-PodIfExists -Name $projectsSourcePod -Namespace $Namespace
    Remove-PodIfExists -Name $projectsTargetPod -Namespace $Namespace
    Remove-PodIfExists -Name $legacySourcePod -Namespace $Namespace
    Remove-PodIfExists -Name $redisSourcePod -Namespace $Namespace
    Remove-PodIfExists -Name $redisTargetPod -Namespace $Namespace
    Remove-PodIfExists -Name $postgresCopyPod -Namespace $Namespace
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
    Pop-Location
}
