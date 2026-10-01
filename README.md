# Lethabo M Connect

Client project portal for Lethabo M Solutions. The web app is what the team runs now: sign in, the manager workspace, and the client view of progress, files, and invoices.

The API and mobile app are still starter folders. Do not start those yet.

## What you need

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) 20 or newer (includes npm)

Check both from a terminal:

```bash
git --version
node --version
npm --version
```

## Get the latest code

From the project folder:

```bash
git pull
```

If this is your first time on the repo, clone it, then move into the folder before the steps below.

## Run the web app

```bash
cd web/lethabo-portal-web
npm install
npm run dev
```

`npm install` is required the first time, and again whenever `package.json` changes after a pull.

Vite prints a local address, usually **http://localhost:5173/**. Open that in a browser.

Stop the app with `Ctrl+C` in the same terminal.

## Sign in

Password for every demo account: `connect123`

| Sign in as | Email | Opens |
| --- | --- | --- |
| Project Manager | naledi@lethabom.co.za | Team dashboard |
| Client — Kunene Attorneys | thandi@kunene.co.za | That client's projects only |
| Client — Vuka Retail | lindiwe@vukaretail.co.za | That client's projects only |

On the sign-in page, **Sign in as** fills the matching email. You can also create an account from that page.

Data lives in the browser for the session. A refresh keeps you signed in, and project changes reset to the sample data.

## Other commands

From `web/lethabo-portal-web`:

```bash
npm run lint
npm run build
```

`npm run build` checks that the app compiles. The result is written to `web/lethabo-portal-web/dist`.
