# Sealos Deploy

Storyforge now deploys as four workloads:

- `storyforge-frontend`
- `storyforge-backend`
- `storyforge-postgres`
- `storyforge-redis`

The public URL stays `https://bjmmuazhczom.cloud.sealos.io`.

## 1. Target namespace

The checked-in manifest is wired to the current Sealos workspace namespace: `ns-qkcc8vj1`.

## 2. Create the runtime secret

```bash
kubectl create secret generic storyforge-env \
  --namespace ns-qkcc8vj1 \
  --from-literal=POSTGRES_PASSWORD='<postgres-password>' \
  --from-literal=AUTH_USERNAME=admin \
  --from-literal=AUTH_PASSWORD='<bootstrap-admin-password>' \
  --from-literal=AUTH_EMAIL='admin@storyforge.local' \
  --from-literal=AUTH_TOKEN_SECRET='<long-random-secret>' \
  --from-literal=SMTP_HOST='' \
  --from-literal=SMTP_PORT='587' \
  --from-literal=SMTP_USERNAME='' \
  --from-literal=SMTP_PASSWORD='' \
  --from-literal=SMTP_FROM_EMAIL='' \
  --from-literal=SMTP_FROM_NAME='Storyforge' \
  --dry-run=client -o yaml | kubectl apply -f -
```

If you want registration and forgot-password to work before SMTP is ready, add:

```bash
--from-literal=AUTH_EMAIL_DEBUG='true'
```

That mode logs verification and reset codes in the backend container logs.

## 3. Apply the split-stack manifest

```bash
kubectl apply -f deploy/sealos/storyforge.yaml
kubectl rollout status statefulset/storyforge-postgres -n ns-qkcc8vj1
kubectl rollout status deployment/storyforge-redis -n ns-qkcc8vj1
kubectl rollout status deployment/storyforge-backend -n ns-qkcc8vj1
kubectl rollout status deployment/storyforge-frontend -n ns-qkcc8vj1
```

## 4. Migrate SQLite data into PostgreSQL

If you are upgrading from the old single-pod SQLite deployment, copy the old `/app/projects` volume first, then run:

```bash
kubectl exec -n ns-qkcc8vj1 deploy/storyforge-backend -- \
  python scripts/migrate_sqlite_to_postgres.py \
    --source-sqlite /app/projects/.autovedio.db \
    --target-database-url "postgresql+asyncpg://storyforge:<postgres-password>@storyforge-postgres:5432/storyforge"
```

The target PostgreSQL schema must already be on the latest Alembic revision before running the copy.

## 5. Verify

```bash
kubectl get pods -n ns-qkcc8vj1
kubectl get ingress -n ns-qkcc8vj1
curl -I https://bjmmuazhczom.cloud.sealos.io
curl https://bjmmuazhczom.cloud.sealos.io/health
```

The default Sealos `App` resource in the manifest points at `storyforge-frontend:80`, so Storyforge appears as its own app entry in the Sealos workspace UI.

