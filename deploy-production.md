# Production deployment

From the repository root in WSL, run:

```bash
./deploy-production.sh
```

The script uploads the current local checkout, including uncommitted changes, to the production Droplet. It preserves server-side `.env` files and Docker data volumes.

The Droplet must already have Docker Compose, rsync, curl, OpenSSL, production `.env`, `apps/api/.env`, and `apps/live/.env` files, and readable TLS files `/etc/tenfold/tls/origin.pem` and `/etc/tenfold/tls/origin.key`. This deploys the Compose stack, including PostgreSQL, Redis, RabbitMQ, and MinIO; it does not provision a new server.

Deployment retains previous application image tags and environment files, builds every application image before migrating, starts infrastructure, rejects model changes without migrations, and takes a PostgreSQL custom-format backup. It then configures Grist, applies migrations, replaces application containers, and waits for health checks. Before reporting success it checks database, Redis, broker, and bucket access, public API/Live/admin/Spaces routes, the public frontend build, and Grist form CSS.

To use a different SSH key:

```bash
DEPLOY_SSH_KEY=/path/to/key ./deploy-production.sh
```

## Failure and recovery

A failure exits nonzero and prints its deployment stage. A failed build, migration consistency check, or database backup stops before migrations and application replacement. A failure after migrations needs investigation; the script does not automatically reverse migrations or restore data.

Each attempt prints a private recovery directory under `/opt/plane/app/deployment-backups/`, outside the upload destination. It contains the previous environment files and a `rollback.yml` override pointing at retained images. `database.dump` exists only after the database backup succeeds; `.partial` files are incomplete. Retained tags protect images from ordinary dangling-image cleanup, but not `docker image prune -a`. Remove older recovery directories and image tags manually once you no longer need them, and keep independent off-host backups.

To return to previous application images **only when they are compatible with the current database**, run on the Droplet, substituting the directory printed for the deployment attempt:

```bash
cd /opt/plane/app/ten-fold-plane
recovery_dir=/opt/plane/app/deployment-backups/REPLACE_WITH_ATTEMPT_DIRECTORY
cp "$recovery_dir/root.env" .env
cp "$recovery_dir/api.env" apps/api/.env
cp "$recovery_dir/live.env" apps/live/.env
docker compose -f docker-compose.yml -f "$recovery_dir/rollback.yml" up -d --no-build --wait --wait-timeout 300 grist api worker beat-worker copilot web admin space live proxy
```

The override records services that had existing containers. It does not preserve an old Compose file, TLS certificates, or mounted CSS. If those changed incompatibly, restore their corresponding previous versions too. The recovery override disables the new beat health probe because older images do not create its PID file; inspect beat logs to confirm the scheduler started. After recovery, inspect logs and verify public routes before considering the incident resolved.

The database dump targets Django’s configured database, using the PostgreSQL client in `plane-db`. An external database must be reachable from that container and compatible with its PostgreSQL 15 client; otherwise the backup fails and deployment stops. The dump does not include MinIO uploads or Grist documents. A full data restoration requires downtime, stopping application writers, and a deliberate PostgreSQL restore procedure; restoring a dump loses subsequent writes. Do not restore it automatically just because a deployment failed.

## Local regression checks

```bash
bash -n deploy-production.sh
bash deploy-production.test.sh
```

These require Bash and Python 3. They exercise the deployment shell with mocked Docker and HTTP boundaries, plus a real local HTTP test of the API health probe; they do not replace a real container build or application end-to-end tests.
