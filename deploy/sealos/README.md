# Sealos Deploy

Frametale currently runs on Sealos as a split stack:

- `frametale-frontend`
- `frametale-backend`
- `frametale-postgres`
- `frametale-redis`

Public URL:

- `https://frametale.studio`
- `https://www.frametale.studio`

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

## 4. Cut over from live `storyforge-*` resources

If the namespace is still running the legacy `storyforge`, `storyforge-backend`, `storyforge-frontend`, `storyforge-postgres`, and `storyforge-redis` resources, use the cutover script instead of doing the migration by hand:

```bash
pwsh ./scripts/cutover_storyforge_to_frametale.ps1 -DeleteLegacyResources
```

What the script does:

- copies `storyforge-env` to `frametale-env`
- creates the checked-in `frametale-*` PVC, Postgres, Redis, backend, and frontend resources
- freezes legacy writes by scaling down the `storyforge-*` deployments
- copies `storyforge-projects-data`, `storyforge-data`, and `storyforge-redis-data`
- copies PostgreSQL data from `storyforge-postgres` into `frametale-postgres`
- starts `frametale-backend` and `frametale-frontend`, validates them internally, then switches the shared ingress to `frametale-frontend`
- optionally removes the old `storyforge-*` workloads and services

If you also want to delete the old PVCs after validation, run:

```bash
pwsh ./scripts/cutover_storyforge_to_frametale.ps1 -DeleteLegacyResources -DeleteLegacyStorage
```

The default recommendation is to keep the old PVCs for one more verification window, then remove them in a second pass.

## 5. Migrate old SQLite data into PostgreSQL only

If you are upgrading from the old single-pod SQLite deployment and do not have a live `storyforge-*` split stack to cut over from, copy the legacy `/app/projects` volume first, then run:

```bash
kubectl exec -n ns-qkcc8vj1 deploy/frametale-backend -- \
  python scripts/migrate_sqlite_to_postgres.py \
    --source-sqlite /app/projects/.autovideo.db \
    --target-database-url "postgresql+asyncpg://frametale:<postgres-password>@frametale-postgres:5432/frametale"
```

Make sure the target PostgreSQL schema is already on the latest Alembic revision before running the copy.

## 6. Verify

```bash
kubectl get pods -n ns-qkcc8vj1
kubectl get ingress -n ns-qkcc8vj1
curl -I https://frametale.studio
curl https://frametale.studio/health
```

Expected result:

- frontend, backend, postgres, and redis pods are all `Running`
- ingress resolves to the public URL
- `/health` returns the Frametale health payload

## 7. Notes

- The Sealos `App` resource in the manifest points at `frametale-frontend:80`
- Public brand is `Frametale / 叙影工场`
- Internal compatibility identifiers may still use `autovideo` in filenames and migration scripts
