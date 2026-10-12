# Lethabo M Connect

Lethabo M Connect is a client project portal for **Lethabo M Solutions**.

The system is being developed as a shared platform where Lethabo M Solutions can manage clients, projects, progress, tasks and project information while allowing clients to follow the progress of their projects.

The solution currently consists of:

- **React web application**
- **Flutter mobile application**
- **ASP.NET Core Web API**
- **Azure SQL database**
- **Azure App Service**

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
| Cloud Hosting | Microsoft Azure App Service |
| Authentication | PBKDF2 password hashing |
| Source Control | Git / GitHub |

---

# Current Development Status

The project is currently under active development.

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
- Flutter mobile application created
- Flutter splash screen created
- Flutter login screen created
- Flutter dashboard created
- Flutter projects screen created
- Flutter connected to the Azure API
- Flutter project data retrieved from the API
- Real mobile login connected to the ASP.NET Core API
- Successful end-to-end login from Flutter to Azure SQL

The current authentication flow is:

```text
Flutter Mobile App
        ↓
Azure App Service
        ↓
ASP.NET Core API
        ↓
Azure SQL
        ↓
Password verification
        ↓
Authenticated user
        ↓
Flutter Dashboard
```

---

# Next Development Phase

The next major phase is **authentication and authorization security**.

The current login endpoint validates the user's email address and password successfully, but the final token-based authentication system still needs to be implemented.

Next tasks include:

- Add JWT authentication
- Generate authentication tokens after successful login
- Securely store authentication tokens in Flutter
- Add logout functionality
- Keep users signed in securely
- Protect API endpoints
- Implement role-based authorization
- Restrict client access to their own projects
- Restrict developers to assigned work
- Add Project Manager permissions
- Add Administrator permissions
- Connect remaining mobile screens to the API
- Connect the React web application to the API
- Implement forgot-password functionality
- Continue project details, tasks, milestones, comments and files
- Add notifications
- Perform security and application testing

The intended roles are:

| Role | Intended Access |
| --- | --- |
| Administrator | System administration and broad system access |
| Project Manager | Manage projects, clients and team allocations |
| Developer | View and update assigned projects/tasks |
| Client | View only projects and information belonging to their organisation |

> **Important:** Role-based API authorization is still under development. The current project endpoints must not yet be considered production-secure.

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

Stop the application with:

```text
Ctrl + C
```

---

# Demo Accounts

The development database contains the following demo accounts.

The current demo password is:

```text
connect123
```

| User | Email | Role |
| --- | --- | --- |
| Boitumelo Sithole | admin@lethabom.co.za | Administrator |
| Naledi Khumalo | naledi@lethabom.co.za | Project Manager |
| Sipho Dlamini | sipho@lethabom.co.za | Developer |
| Thandi Kunene | thandi@kunene.co.za | Client — Kunene Attorneys |
| Lindiwe Ndlovu | lindiwe@vukaretail.co.za | Client — Vuka Retail |

These accounts are intended for **development and demonstration purposes only**.

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
  "email": "thandi@kunene.co.za",
  "password": "connect123"
}
```

A successful login currently returns basic information about the authenticated user, including:

- User ID
- Name
- Email
- Role
- Client ID
- Team member ID
- Title

JWT/token authentication and protected API endpoints are the next security development phase.

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

The current mobile application includes:

- Splash screen
- Login screen
- Dashboard
- Projects screen
- Azure API connectivity
- Real user authentication

The Flutter login screen currently communicates with:

```text
POST /api/auth/login
```

on the deployed Azure API.

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

- Never commit the Azure SQL password.
- Never store user passwords as plain text.
- Development passwords must be changed before production use.
- Protect API endpoints using authentication and authorization.
- Clients must only be allowed to access their own project information.
- Developers must only access authorised/assigned project information.
- Sensitive configuration should use user secrets during local development and environment variables in Azure.
- Production applications should use HTTPS.
- Demo credentials are for development/testing only.

---

# Current Milestone

As of the current development milestone:

**Foundation & Database:** Complete  
**API & Azure Integration:** Complete  
**Basic API Authentication:** Complete  
**Flutter API Integration:** Complete  
**Flutter Login:** Complete  
**JWT & Role-Based Authorization:** Next  
**Remaining Portal Features:** In Progress  
**React API Integration:** Pending  
**Security Hardening & Final Testing:** Pending
