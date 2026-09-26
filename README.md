# The Ledger

A personal expense tracker with a React frontend and an Express API backed by a local JSON file.

## Run locally

```bash
npm install
npm run dev
```

The development frontend runs on `http://localhost:5173` and proxies API requests to port `4000`.

## Run in production

```bash
npm install
npm run build
npm start
```

The production server serves both the API and the compiled frontend from port `4000`.

PowerShell users can also set the environment explicitly with `$env:NODE_ENV="production"; npm run server`, but `npm start` already applies production mode on every platform.

Copy `.env.example` to `.env` to configure `PORT`, `HOST`, `DATA_DIR`, or `CORS_ORIGIN`. The default data file is `data/transactions.json`. Set `DATA_DIR` to a persistent volume when deploying to a host with an ephemeral application filesystem.

## API

- `GET /api/health` reports service status.
- `GET /api/transactions` returns all transactions.
- `POST /api/transactions` creates a validated transaction.
- `PUT /api/transactions/:id` updates a validated transaction.
- `DELETE /api/transactions/:id` removes a transaction.

The JSON store is intentionally simple and appropriate for a personal, single-process app. A multi-user deployment should replace it with a database and authentication layer.

## Deploy on Render

The repository includes `render.yaml` for a persistent Render web service. In the Render dashboard, choose **New > Blueprint**, connect `abiraisingh/ExpenseTrackerWebsite`, and apply the blueprint. Render will build the frontend, start the Express server, and mount `/var/data` so transactions survive redeploys.

The Blueprint uses Render's Starter plan because persistent disks are required for the JSON data file. For a free deployment, remove the disk and `DATA_DIR`, but data may be lost whenever the service restarts or redeploys.
