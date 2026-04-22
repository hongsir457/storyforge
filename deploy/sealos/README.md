# Sealos Deploy

Frametale currently runs on Sealos as a split stack:

- `frametale-frontend`
- `frametale-backend`
- `frametale-postgres`
- `frametale-redis`

Public URL:

- `https://bjmmuazhczom.cloud.sealos.io`

## 1. Target namespace

The checked-in manifest targets the isolated Frametale workspace namespace:

- `ns-qkcc8vj1`

## 2. Create the runtime secret

Create the secret used by the frontend, backend, and database workloads:

```bash
kubectl create secret generic frametale-env \
  --namespace ns-qkcc8vj1 \
  --from-literal=POSTGRES_PASSWORD='<postgres-password>' \
  --from-literal=AUTH_USERNAME='admin' \
  --from-literal=AUTH_PASSWORD='<bootstrap-admin-password>' \
  --from-literal=AUTH_EMAIL='admin@frametale.local' \
  --from-literal=AUTH_TOKEN_SECRET='<long-random-secret>' \
  --from-literal=SMTP_HOST='' \
  --from-literal=SMTP_PORT='587' \
  --from-literal=SMTP_USERNAME='' \
  --from-literal=SMTP_PASSWORD='' \
  --from-literal=SMTP_FROM_EMAIL='' \
  --from-literal=SMTP_FROM_NAME='Frametale' \
  --dry-run=client -o yaml | kubectl apply -f -
```

If SMTP is not ready yet and you still want registration, verification, and password reset flows to be testable:

```bash
kubectl create secret generic frametale-env \
  --namespace ns-qkcc8vj1 \
  --from-literal=AUTH_EMAIL_DEBUG='true' \
  --dry-run=client -o yaml | kubectl apply -f -
```

If you want OpenRouter available immediately after deploy, add these literals to the same secret update:

```bash
--from-literal=ANTHROPIC_BASE_URL='https://openrouter.ai/api' \
--from-literal=AUTONOVEL_API_BASE_URL='https://openrouter.ai/api' \
--from-literal=ANTHROPIC_AUTH_TOKEN='<openrouter-api-key>'
```

That enables the Anthropic-compatible OpenRouter path for `Frametale Agent` and the novel workbench. You can also leave these unset and configure them later in `/app/settings`.

## 3. Apply the manifest

```bash
kubectl apply -f deploy/sealos/frametale.yaml
kubectl rollout status statefulset/frametale-postgres -n ns-qkcc8vj1
kubectl rollout status deployment/frametale-redis -n ns-qkcc8vj1
kubectl rollout status deployment/frametale-backend -n ns-qkcc8vj1
kubectl rollout status deployment/frametale-frontend -n ns-qkcc8vj1
```

## 4. Migrate old SQLite data into PostgreSQL

If you are upgrading from the old single-pod SQLite deployment, copy the legacy `/app/projects` volume first, then run:

```bash
kubectl exec -n ns-qkcc8vj1 deploy/frametale-backend -- \
  python scripts/migrate_sqlite_to_postgres.py \
    --source-sqlite /app/projects/.autovideo.db \
    --target-database-url "postgresql+asyncpg://frametale:<postgres-password>@frametale-postgres:5432/frametale"
```

Make sure the target PostgreSQL schema is already on the latest Alembic revision before running the copy.

## 5. Verify

```bash
kubectl get pods -n ns-qkcc8vj1
kubectl get ingress -n ns-qkcc8vj1
curl -I https://bjmmuazhczom.cloud.sealos.io
curl https://bjmmuazhczom.cloud.sealos.io/health
```

Expected result:

- frontend, backend, postgres, and redis pods are all `Running`
- ingress resolves to the public URL
- `/health` returns the Frametale health payload

## 6. Notes

- The Sealos `App` resource in the manifest points at `frametale-frontend:80`
- Public brand is `Frametale / 叙影工场`
- Internal compatibility identifiers may still use `autovideo` in filenames and migration scripts
