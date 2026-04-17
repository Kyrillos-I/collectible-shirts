# Collectible Shirts

React frontend + Express backend + PostgreSQL for the Rutgers-themed pack opening app.

## Stack

- `client`: React + Vite
- `server`: Node.js + Express + `pg`
- `db`: PostgreSQL
- Email delivery: Resend
- Live updates: Server-Sent Events

## Local setup

1. Start Postgres:

   ```bash
   docker compose up -d db
   ```

2. Copy environment files:

   ```bash
   cp server/.env.example server/.env
   cp client/.env.example client/.env
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

The client runs on `http://localhost:5173` and the API runs on `http://localhost:3001`.

## Resend

Set these in [`server/.env.example`](/Users/kyrillosibrahim/repos/collectible-shirts/server/.env.example):

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

If those are not present, the backend still creates a code and logs it locally for development.

## Deployment

Recommended setup: build the React app and serve it from the Express server on the
same origin.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Build the frontend bundle:

   ```bash
   npm run build
   ```

3. Set production server env values:

   ```bash
   NODE_ENV=production
   DATABASE_URL=postgresql://...
   JWT_SECRET=replace-with-a-long-random-secret
   RESEND_API_KEY=...
   RESEND_FROM_EMAIL=...
   ```

4. Start the server:

   ```bash
   npm start
   ```

Notes:

- In production, the server now refuses to boot if `DATABASE_URL`, `JWT_SECRET`,
  `RESEND_API_KEY`, or `RESEND_FROM_EMAIL` are missing or unsafe.
- For same-origin deploys, the client can use the default API behavior and no
  `VITE_API_URL` is required.
- For separate frontend and API deploys:
  - Build the client with `VITE_API_URL=https://api.example.com`
  - Set `CLIENT_URL=https://app.example.com` on the server
  - Set `COOKIE_SAME_SITE=none`
  - Set `COOKIE_SECURE=true`
