# Sealos Deploy

Storyforge deploys to Sealos with one public container image and one runtime secret.

## 1. Create runtime secret

```bash
kubectl create secret generic storyforge-env \
  --namespace ns-vg9l39bk \
  --from-literal=AUTH_USERNAME=admin \
  --from-literal=AUTH_PASSWORD='<your-login-password>' \
  --from-literal=AUTH_TOKEN_SECRET='<generate-a-long-random-secret>' \
  --dry-run=client -o yaml | kubectl apply -f -
```

## 2. Apply workload

```bash
kubectl apply -f deploy/sealos/storyforge.yaml
```

## 3. Verify

```bash
kubectl rollout status deployment/storyforge -n ns-vg9l39bk
kubectl get ingress storyforge -n ns-vg9l39bk
```

The default public URL in this manifest is `https://bjmmuazhczom.cloud.sealos.io`.
