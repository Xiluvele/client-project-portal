# Lethabo M Connect

Lethabo M Connect is a client project portal for **Lethabo M Solutions**.

The system is being developed as a shared platform where Lethabo M Solutions can manage clients, projects, progress, tasks and project information while allowing clients to follow the progress of their projects.

The solution currently consists of:

- **React web application**
- **Flutter mobile application**
- **ASP.NET Core Web API**
- **Azure SQL database**
- **Azure App Service**
- **Render Static Site hosting**

Both the web and mobile applications are intended to use the same ASP.NET Core API and Azure SQL database.

---

## Project Structure

```text
clientPortal/
│
├── backend/
│   └── LethaboPortal.Api/
│
├── database/
│
├── mobile/
│   └── lethabo_portal_mobile/
│
└── web/
    └── lethabo-portal-web/
```

### Technologies

| Component | Technology |
| --- | --- |
| Web | React / Vite |
| Mobile | Flutter |
| Backend | ASP.NET Core Web API (.NET 10) |
| Database | Azure SQL |
| ORM | Entity Framework Core |
| Web Hosting | Render Static Site |
| API Hosting | Microsoft Azure App Service |
| Authentication | JWT bearer tokens, PBKDF2 password hashing |
| Source Control | Git / GitHub |

---

# Current Development Status

## Completed

The following functionality has been implemented:

- ASP.NET Core backend created
- Entity Framework Core configured
- Azure SQL database connected
- Database migrations configured
- Initial database seed data created
- Clients stored in the database
- Users and roles stored in the database
- Projects stored in the database
- Project creation API implemented
- Project retrieval API implemented
- Client retrieval API implemented
- API health check implemented
- Password hashing using PBKDF2
- Login API implemented
- User credentials verified against password hashes
- Account active/locked checks implemented
- Backend deployed to Azure App Service
- React web application deployed to Render
- React web application connected to the deployed Azure API
- Render production environment configured with `VITE_API_URL`
- React Router rewrite configured on Render for direct page routes
- Azure API CORS configured to allow the production Render website
- Account creation and activation API implemented
- Email sign-in/verification code API implemented
- Flutter mobile application created
- Flutter splash screen created
- Flutter login screen created
- Flutter dashboard created
- Flutter projects screen created
- Flutter connected to the Azure API
- Flutter project data retrieved from the API
- Real mobile login connected to the ASP.NET Core API
- Successful end-to-end login from Flutter to Azure SQL
- JWT issued after a successful password check and sent as a Bearer token
- Web session stores the token and sends it on later API calls
- Mobile screens send the same token on API calls
- Logout on the website and the phone
- Role checks on project changes, invoices, accounts, and the audit trail
- Forgot-password and reset-password
- Email sign-in code after the password
- Account activation for people added by an administrator
- Tasks, files, comments, change requests, requirements, milestones, and invoices saved through the API
- Notifications stored in the database and shown on the website and the phone
- Role menus on the website and the phone
- Local website and phone call the hosted Azure API

The sign-in flow is:

```text
Website or phone
        ↓
POST /api/auth/login
        ↓
Password check against Azure SQL
        ↓
JWT with the user id and role
        ↓
6-digit email code
        ↓
Role menu
```

Sign-in uses two-step authentication. After the password is accepted, the user must enter the 6-digit code sent to their email before the role menu opens. The code is required on every login.

If the password is forgotten, the sign-in page links to **Forgot password**. The API emails a 6-digit reset code, and `POST /api/auth/reset-password` stores the new password.

## Roles

| Role | Access |
| --- | --- |
| Administrator | Adds people, edits role and company, activates or deactivates accounts, and reads the audit trail |
| Project Manager | Creates projects, assigns developers, adds tasks, files, messages, milestones, and invoices, reminds the client, and approves work in review |
| Developer | Sees assigned projects, moves tasks through To Do, In Progress, In Review, and Done, and uploads files and comments |
| Client | Sees their own projects, confirms requirements, sends change requests, comments, and approves or declines files and invoices |

Each signed-in person only sees the menu for their role. Project changes require the Bearer token and the matching role.

---

# Requirements

Install the following development tools:

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) 20 or newer
- [.NET SDK](https://dotnet.microsoft.com/download) 10 or newer
- Flutter SDK
- Android Studio or an Android emulator
- Visual Studio Code or Visual Studio

Check the main tools from a terminal:

```bash
git --version
node --version
npm --version
dotnet --version
flutter --version
```

---

# Get the Latest Code

From the project folder:

```bash
git pull
```

If this is your first time using the repository, clone the repository first and then move into the project folder.

---

# Run the Web Application

From the project root:

```bash
cd web/lethabo-portal-web
npm install
npm run dev
```

`npm install` is required the first time and whenever `package.json` changes.

Vite will display the local development address, normally:

```text
http://localhost:5173/
```

Open the address in a browser.

The local website uses the hosted Azure API from `web/lethabo-portal-web/.env.development`. A local database firewall rule is not required to sign in or load projects. Restart Vite after that file changes.

Stop the application with:

```text
Ctrl + C
```

---

# Accounts

An administrator creates each person on **Team & Access**:

1. Choose **Add user** and enter the name, email, and role. A client also needs a company name.
2. **Save account**. The person receives an activation email.
3. They open **Activate account**, choose a password, and sign in.
4. After the password, they enter the 6-digit code sent to that inbox.

If a password is forgotten, use **Forgot password?** on the sign-in page. The reset code expires in 15 minutes. The new password must be at least 8 characters.

---

# Run the Backend API

The ASP.NET Core API is located at:

```text
backend/LethaboPortal.Api
```

It uses the Azure SQL database:

| Setting | Value |
| --- | --- |
| Server | `st1050624server.database.windows.net` |
| Database | `CientPortal` |
| Login | `st10506234serveradmin` |

The database password is **not stored in the repository**.

Do not commit database passwords, API secrets or other credentials to GitHub.

---

## Configure the Database Password

The first time the backend is configured on a development machine:

```bash
dotnet tool restore

cd backend/LethaboPortal.Api

dotnet user-secrets set "PortalDb:Password" "<Azure SQL password>"

dotnet ef database update

dotnet run
```

`dotnet tool restore` installs the Entity Framework command used by `dotnet ef`.

`dotnet ef database update` applies database migrations.

`dotnet run` starts the API.

After initial configuration, start the API with:

```bash
cd backend/LethaboPortal.Api
dotnet run
```

The local API currently listens on:

```text
http://localhost:5219/
```

---

# API Endpoints

The following endpoints are currently available:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Check API/database connectivity |
| GET | `/api/projects` | Retrieve projects |
| POST | `/api/projects` | Create a project |
| GET | `/api/clients` | Retrieve clients |
| POST | `/api/auth/login` | Authenticate a user |
| POST | `/api/auth/email-code` | Send an email sign-in/verification code |
| POST | `/api/accounts` | Create a new account and activation code |
| POST | `/api/accounts/activate` | Activate an account and set its password |
| POST | `/api/auth/forgot-password` | Email a 6-digit password reset code |
| POST | `/api/auth/reset-password` | Save a new password with that code |

Project changes, invoices, accounts, notifications, and the audit trail require:

```text
Authorization: Bearer <token>
```

The token is the `token` value returned by `POST /api/auth/login`. It expires after 8 hours.

Example local health check:

```text
http://localhost:5219/api/health
```

A successful response should contain:

```json
{
  "status": "ok",
  "database": "CientPortal"
}
```

---

# Authentication

Passwords are not stored as plain text.

The API currently uses **PBKDF2 with SHA-256** for password hashing and verification.

The login endpoint is:

```text
POST /api/auth/login
```

Example request:

```json
{
  "email": "person@example.com",
  "password": "their-password"
}
```

A successful login returns a JWT and the signed-in user:

- Token
- Expiry time
- User ID
- Name
- Email
- Role
- Client ID
- Team member ID
- Title

The website and the phone keep that token for the session and send it as `Authorization: Bearer <token>`. Logging out clears the session. For login security, the user must also enter the 6-digit code sent to their email. The role menu does not open until that code is provided.

---

# Render Web Deployment

The React/Vite web application is now deployed online using **Render Static Site**.

Production website:

```text
https://client-project-portal-a28c.onrender.com
```

The Render service builds the frontend from:

```text
web/lethabo-portal-web
```

The production frontend uses the following environment variable:

```text
VITE_API_URL=https://lethabo-portal-api-g6dzc3gphwbsameu.southafricanorth-01.azurewebsites.net
```

This makes sure that the deployed React website sends API requests to the Azure-hosted ASP.NET Core API instead of the local development API.

Because the React application uses client-side routing, Render also has the following rewrite configured:

```text
Source:       /*
Destination:  /index.html
Action:       Rewrite
```

This allows pages such as `/login`, `/register`, `/activate` and dashboard routes to work when opened directly.

When a `VITE_*` environment variable is added or changed on Render, the site must be rebuilt/redeployed because Vite includes these values during the build process.

## Production CORS

The ASP.NET Core API CORS policy allows requests from the local React application and the deployed Render website.

Allowed frontend origins include:

```text
http://localhost:5173
http://127.0.0.1:5173
https://client-project-portal-a28c.onrender.com
```

The production Render origin must match exactly and must not contain an extra space.

The current deployed architecture is:

```text
React Web Application (Render)
            │
            │ HTTPS
            ▼
ASP.NET Core Web API (Azure App Service)
            │
            ▼
      Azure SQL Database
            ▲
            │ HTTPS
Flutter Mobile Application
```

The web application and Flutter mobile application therefore use the same backend API and the same Azure SQL database.

---

# Azure Deployment

The ASP.NET Core API is deployed to **Microsoft Azure App Service**.

Azure App Service:

```text
lethabo-portal-api
```

Public API base address:

```text
https://lethabo-portal-api-g6dzc3gphwbsameu.southafricanorth-01.azurewebsites.net
```

Health endpoint:

```text
https://lethabo-portal-api-g6dzc3gphwbsameu.southafricanorth-01.azurewebsites.net/api/health
```

The Azure App Service stores the database password using the environment variable:

```text
PortalDb__Password
```

The password itself must never be committed to the repository.

The Azure App Service also stores the email configuration using environment variables:

```text
Email__User
Email__AppPassword
Email__Host
Email__Port
Email__FromName
```

The actual email password or app password must never be committed to GitHub.

---

# Publishing the Backend

From:

```text
backend/LethaboPortal.Api
```

run:

```bash
dotnet publish -c Release -o ./publish
```

The generated deployment files are placed in:

```text
backend/LethaboPortal.Api/publish
```

The `publish` folder can then be deployed to the existing Azure App Service:

```text
lethabo-portal-api
```

The publish folder itself should not be committed to Git.

---

# Azure SQL Networking

Azure SQL only accepts connections according to its configured networking rules.

If a development machine cannot connect to the database:

1. Open the Azure Portal.
2. Open the SQL server `st1050624server`.
3. Open **Networking**.
4. Check the public network access configuration.
5. Add the required development IP address if necessary.

Do not expose the SQL database more broadly than required.

---

# Entity Framework Migrations

When the database model changes, create a migration from:

```text
backend/LethaboPortal.Api
```

Example:

```bash
dotnet ef migrations add <NameOfChange>
dotnet ef database update
```

Migration files should be committed to Git so database schema changes can be tracked.

---

# Run the Flutter Mobile Application

Move to the Flutter application:

```bash
cd mobile/lethabo_portal_mobile
```

Install/restore packages:

```bash
flutter pub get
```

Check the project:

```bash
flutter analyze
```

Run the application:

```bash
flutter run
```

An Android emulator or physical Android device must be available.

The phone uses the same hosted Azure API as the website. It does not call a database on the development machine.

The current mobile application includes:

- Splash screen
- Login screen
- Sign-in code screen
- Profile and logout
- Administrator: Team & Access and Audit trail
- Project manager: Projects, Invoices, and Team
- Developer: Projects and My tasks
- Client: Dashboard and Invoices
- Messages for notifications

The Flutter login screen communicates with:

```text
POST /api/auth/login
```

on the deployed Azure API, then sends the returned token on later calls.

---

# Web Commands

From:

```text
web/lethabo-portal-web
```

Run:

```bash
npm run lint
npm run build
```

`npm run build` verifies that the React application compiles successfully.

The production build is generated in:

```text
web/lethabo-portal-web/dist
```

---

# Git Workflow

Before starting work:

```bash
git pull origin main
```

After completing a working development milestone:

```bash
git status
git add .
git commit -m "Add API authentication and Flutter login integration"
git push origin main
```

Always review `git status` before committing to make sure passwords, secrets, generated build files and publish files are not included.

---

# Security Notes

- Two-step sign-in is required. After the password, the user must enter the 6-digit code sent to their email on every login.
- Never commit the Azure SQL password.
- Never store user passwords as plain text.
- Project changes, invoices, accounts, and the audit trail require a valid Bearer token and the matching role.
- Clients work with their own projects, files, and invoices.
- Developers work with projects and tasks assigned to them.
- Sensitive configuration should use user secrets during local development and environment variables in Azure.
- Production applications should use HTTPS.
- Do not commit account passwords. People receive their own activation or reset email.

---

# Current Milestone

As of the current development milestone:

**Foundation & Database:** Complete  
**API & Azure Integration:** Complete  
**Basic API Authentication:** Complete  
**Flutter API Integration:** Complete  
**Flutter Login:** Complete  
**React API Integration:** Complete  
**React Render Deployment:** Complete  
**Account Creation & Activation:** Complete  
**Email Code API Integration:** Complete  
**JWT & Role-Based Authorization:** Complete  
**Forgot Password:** Complete  
**Role-Aware Website and Phone:** Complete  
**Tasks, Files, Comments, Invoices, and Notifications:** Complete
