# Lethabo M Connect

Client project portal for Lethabo M Solutions. The web app is what the team runs now: sign in, the manager workspace, and the client view of progress, files, and invoices.

The mobile app is still a starter folder. The API uses the Azure SQL database `CientPortal`.

## What you need

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) 20 or newer (includes npm)
- [.NET SDK](https://dotnet.microsoft.com/download) 10 or newer

Check them from a terminal:

```bash
git --version
node --version
npm --version
dotnet --version
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
| Administrator | admin@lethabom.co.za | User accounts and project health |
| Project Manager | naledi@lethabom.co.za | Team dashboard |
| Developer | sipho@lethabom.co.za | Assigned tasks only |
| Client — Kunene Attorneys | thandi@kunene.co.za | That client's projects only |
| Client — Vuka Retail | lindiwe@vukaretail.co.za | That client's projects only |

On the sign-in page, **Sign in as** fills the matching email. After the password is accepted, enter the 6-digit email code. Until the API sends that email, the code is shown in the demo inbox on the same screen. Creating an account uses the same code before the account is opened.

Data lives in the browser for the session. A refresh keeps you signed in, and project changes reset to the sample data.

## Other commands

From `web/lethabo-portal-web`:

```bash
npm run lint
npm run build
```

`npm run build` checks that the app compiles. The result is written to `web/lethabo-portal-web/dist`.

## Run the API

The API is in `backend/LethaboPortal.Api`. It uses Azure SQL:

| Setting | Value |
| --- | --- |
| Server | `st1050624server.database.windows.net` |
| Database | `CientPortal` |
| Login | `st10506234serveradmin` |

The database password is not in the repo. Each machine stores it once with the command below. Ask the team for the password. Do not commit it.

The first time on a machine, from the project folder:

```bash
dotnet tool restore
cd backend/LethaboPortal.Api
dotnet user-secrets set "PortalDb:Password" "<the Azure SQL password>"
dotnet ef database update
dotnet run
```

`dotnet tool restore` installs the Entity Framework command used by `dotnet ef`. `dotnet ef database update` creates or updates the tables. `dotnet run` starts the API.

After that, starting it again is only:

```bash
cd backend/LethaboPortal.Api
dotnet run
```

The API listens on **http://localhost:5219/**. Open **http://localhost:5219/api/health**. A result of `"status": "ok"` means it reached `CientPortal`. Stop the API with `Ctrl+C`.

Azure only accepts connections from allowed addresses. In the portal, open the SQL server `st1050624server`, then **Networking**, turn on public network access for selected networks, and add your current IP.

When a table changes, from `backend/LethaboPortal.Api`:

```bash
dotnet ef migrations add <NameOfChange>
dotnet ef database update
```

The web app still keeps its own sample data in the browser. It is not calling this API yet.
