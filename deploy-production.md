# Production deployment

From the repository root in WSL, run:

```bash
./deploy-production.sh
```

The script uploads the current repository to the production Droplet, preserves server-side `.env` files, configures the Grist runtime, runs migrations, and rebuilds Grist, the API and background workers, CopilotKit, web, and proxy services. It waits for service health before reporting completion.

To use a different SSH key without editing the script:

```bash
DEPLOY_SSH_KEY=/path/to/key ./deploy-production.sh
```
