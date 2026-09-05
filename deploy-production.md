# Production deployment

From the repository root in WSL, run:

```bash
./deploy-production.sh
```

The script uploads the current repository to the production Droplet, preserves server-side `.env` files, and rebuilds the `web` and `proxy` services.

To use a different SSH key without editing the script:

```bash
DEPLOY_SSH_KEY=/path/to/key ./deploy-production.sh
```
