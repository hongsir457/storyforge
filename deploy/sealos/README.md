# Sealos Deploy

Storyforge should run in its own Sealos workspace or namespace, not mixed into another app's user namespace.

## 1. Create the target workspace

Create a dedicated Sealos workspace or namespace first. The standalone manifest assumes the target namespace is named `storyforge`.

If your Sealos account only has access to a single user namespace, create the new workspace in the Sealos Cloud UI first, then grant your current account access before applying any Kubernetes resources.

## 2. Create the runtime secret

```bash
kubectl create secret generic storyforge-env \
  --namespace storyforge \
  --from-literal=AUTH_USERNAME=admin \
  --from-literal=AUTH_PASSWORD='<your-login-password>' \
  --from-literal=AUTH_TOKEN_SECRET='<generate-a-long-random-secret>' \
  --dry-run=client -o yaml | kubectl apply -f -
```

## 3. Apply the standalone workload

```bash
kubectl apply -f deploy/sealos/storyforge.yaml
kubectl rollout status deployment/storyforge -n storyforge
```

## 4. Migrate data from the shared namespace

If you are moving an existing deployment out of a shared namespace, use the migration helper:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/migrate_storyforge_workspace.ps1 `
  -TargetNamespace storyforge
```

This script:

- freezes the source deployment to stop SQLite writes
- copies `/app/projects` into the new PVC
- copies the runtime secret
- applies the standalone Storyforge manifest in the target namespace
- restarts the new deployment

When you are ready to remove the old shared deployment too:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/migrate_storyforge_workspace.ps1 `
  -TargetNamespace storyforge `
  -DeleteSourceAfterCutover
```

## 5. Verify

```bash
kubectl get pods -n storyforge
kubectl get ingress -n storyforge
curl -I https://bjmmuazhczom.cloud.sealos.io
```

The default public URL in this manifest is `https://bjmmuazhczom.cloud.sealos.io`.
