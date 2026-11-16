# ============================================================
# Lethabo M Connect - API security tests
# Proves: authentication + role/ownership checks on every sensitive read
#
# Run:   .\security-tests.ps1
# Output: security-test-log.txt (full log) and security-test-results.csv (table)
# ============================================================

# ---------- 1. EDIT THESE ----------------------------------------------------
$BaseUrl = "http://localhost:5219"     # local API (from launchSettings.json). Hosted: https://lethabo-portal-api-g6dzc3gphwbsameu.southafricanorth-01.azurewebsites.net

# An inbox YOU own. On the OLD code the email-code test can really send an email
# to this address, so never leave it as someone else's address.
$TestEmail = "your.own.address@example.com"

# Passwords are typed when the script runs, so they are never saved in this file.
# Client A and Client B must belong to DIFFERENT companies and each needs at least
# one project. The developer must be assigned to some projects but not all.
$Manager   = @{ Email = "pearlmashele98@gmail.com";    Password = (Read-Host "Manager password") }
$Developer = @{ Email = "xiluvele.mashele@cpsi.co.za"; Password = (Read-Host "Developer password") }
$Admin     = @{ Email = "thabedenokubonga5@gmail.com"; Password = (Read-Host "Administrator password") }
$ClientA   = @{ Email = "CLIENT_A_EMAIL_HERE";         Password = (Read-Host "Client A password") }
$ClientB   = @{ Email = "CLIENT_B_EMAIL_HERE";         Password = (Read-Host "Client B password") }

# Lockout test: leave OFF unless you have a throwaway user. It locks that account
# after 5 wrong passwords. NEVER point it at a real person's account.
$RunLockoutTest = $false
$LockoutEmail = "throwaway@example.com"
$LockoutRealPassword = ""
# -----------------------------------------------------------------------------

$ErrorActionPreference = "Stop"
$logFile = Join-Path $PSScriptRoot "security-test-log.txt"
$csvFile = Join-Path $PSScriptRoot "security-test-results.csv"
Start-Transcript -Path $logFile -Force | Out-Null

$results = New-Object System.Collections.Generic.List[object]

# Allow the local https development certificate on Windows PowerShell 5.1
if ($BaseUrl -like "https://localhost*" -and $PSVersionTable.PSVersion.Major -lt 7) {
    Add-Type @"
using System.Net;
using System.Security.Cryptography.X509Certificates;
public class TrustAllCerts : ICertificatePolicy {
    public bool CheckValidationResult(ServicePoint s, X509Certificate c, WebRequest r, int p) { return true; }
}
"@
    [System.Net.ServicePointManager]::CertificatePolicy = New-Object TrustAllCerts
}

function Api($Method, $Path, $Token = $null, $Body = $null) {
    $p = @{ Uri = "$BaseUrl$Path"; Method = $Method; UseBasicParsing = $true }
    if ($Token) { $p.Headers = @{ Authorization = "Bearer $Token" } }
    if ($null -ne $Body) {
        $p.Body = ($Body | ConvertTo-Json -Depth 5)
        $p.ContentType = "application/json"
    }
    if ($PSVersionTable.PSVersion.Major -ge 7) {
        $p.SkipCertificateCheck = $true
        $p.SkipHttpErrorCheck = $true
    }
    $code = 0; $content = ""
    try {
        $r = Invoke-WebRequest @p
        $code = [int]$r.StatusCode
        $content = $r.Content
    } catch {
        if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
    }
    $json = $null
    if ($content) { try { $json = $content | ConvertFrom-Json } catch { } }
    [pscustomobject]@{ Status = $code; Json = $json }
}

function Check($Name, [bool]$Pass, $Detail = "") {
    $label = if ($Pass) { "PASS" } else { "FAIL" }
    $results.Add([pscustomobject]@{ Result = $label; Test = $Name; Detail = $Detail })
    $color = if ($Pass) { "Green" } else { "Red" }
    Write-Host ("{0}  {1}  ({2})" -f $label, $Name, $Detail) -ForegroundColor $color
}

function Login($Account) {
    $r = Api POST "/api/auth/login" $null @{ email = $Account.Email; password = $Account.Password }
    if ($r.Status -ne 200) { throw "Could not sign in as $($Account.Email) (HTTP $($r.Status)). Check the accounts at the top of the script." }
    [pscustomobject]@{ Token = $r.Json.token; ClientId = $r.Json.user.clientId; Role = $r.Json.user.role }
}

Write-Host "`nSecurity test run: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  Target: $BaseUrl`n" -ForegroundColor Cyan

# ---------- sign in as each role ----------
$mgr  = Login $Manager
$cA   = Login $ClientA
$cB   = Login $ClientB
$dev  = Login $Developer

$all = @((Api GET "/api/projects" $mgr.Token).Json)
$projA = $all | Where-Object { $_.clientId -eq $cA.ClientId } | Select-Object -First 1
$projB = $all | Where-Object { $_.clientId -eq $cB.ClientId } | Select-Object -First 1
if (-not $projA -or -not $projB) { throw "Client A and Client B each need at least one project (and different clients)." }

$devVisibleIds = @((Api GET "/api/projects" $dev.Token).Json | ForEach-Object { $_.id })
$projNotDev = $all | Where-Object { $devVisibleIds -notcontains $_.id } | Select-Object -First 1

# ---------- A. No token ----------
Write-Host "`n--- A. No login token ---" -ForegroundColor Cyan
foreach ($path in @("/api/projects", "/api/projects/$($projA.id)", "/api/clients", "/api/team-members",
                    "/api/invoices", "/api/notifications", "/api/accounts", "/api/audit")) {
    $r = Api GET $path
    Check "No token: GET $path is blocked" ($r.Status -eq 401) "HTTP $($r.Status), expected 401"
}
$r = Api POST "/api/projects" $null @{ name = "x" }
Check "No token: POST /api/projects is blocked" ($r.Status -eq 401) "HTTP $($r.Status), expected 401"
$r = Api POST "/api/auth/email-code" $null @{ email = $TestEmail; code = "123456" }
Check "No token: POST /api/auth/email-code is blocked" ($r.Status -eq 401) "HTTP $($r.Status), expected 401"

# ---------- B. Public routes still work ----------
Write-Host "`n--- B. Public routes still open ---" -ForegroundColor Cyan
$r = Api GET "/api/health"
Check "Health check is public" ($r.Status -eq 200 -or $r.Status -eq 503) "HTTP $($r.Status), reachable without a token"
$r = Api POST "/api/auth/login" $null @{ email = "nobody@example.com"; password = "wrong-password" }
Check "Login is public (bad credentials give 401, not a blocked route)" ($r.Status -eq 401) "HTTP $($r.Status)"

# ---------- C. Client A ----------
Write-Host "`n--- C. Client A (must only see Client A data) ---" -ForegroundColor Cyan
$rows = @((Api GET "/api/projects" $cA.Token).Json)
$foreign = @($rows | Where-Object { $_.clientId -ne $cA.ClientId })
Check "Client A: GET /api/projects returns only own projects" ($rows.Count -gt 0 -and $foreign.Count -eq 0) "$($rows.Count) projects, $($foreign.Count) belong to other clients"

$r = Api GET "/api/projects/$($projA.id)" $cA.Token
Check "Client A: can open own project" ($r.Status -eq 200) "HTTP $($r.Status), expected 200"

$r = Api GET "/api/projects/$($projB.id)" $cA.Token
Check "Client A: cannot open Client B's project" ($r.Status -eq 403) "HTTP $($r.Status), expected 403"

$r = Api POST "/api/projects/$($projB.id)/comments" $cA.Token @{ body = "security test" }
Check "Client A: cannot comment on Client B's project" ($r.Status -eq 403) "HTTP $($r.Status), expected 403"

$r = Api POST "/api/projects/$($projB.id)/files" $cA.Token @{ name = "test.txt" }
Check "Client A: cannot upload to Client B's project" ($r.Status -eq 403) "HTTP $($r.Status), expected 403"

$r = Api POST "/api/projects" $cA.Token @{ clientId = $cA.ClientId; name = "x" }
Check "Client A: cannot create projects (role check)" ($r.Status -eq 403) "HTTP $($r.Status), expected 403"

$clients = @((Api GET "/api/clients" $cA.Token).Json)
$otherClients = @($clients | Where-Object { $_.id -ne $cA.ClientId })
Check "Client A: GET /api/clients shows only own company" ($otherClients.Count -eq 0) "$($clients.Count) returned, $($otherClients.Count) belong to others"

$team = @((Api GET "/api/team-members" $cA.Token).Json)
$withEmail = @($team | Where-Object { $_.email })
Check "Client A: team list does not expose staff emails" ($withEmail.Count -eq 0) "$($withEmail.Count) members with an email"

$ws = (Api GET "/api/projects/$($projA.id)" $cA.Token).Json
$drafts = @($ws.invoices | Where-Object { $_.status -eq "draft" })
Check "Client A: no draft invoices visible" ($drafts.Count -eq 0) "$($drafts.Count) draft invoices"

# ---------- D. Developer ----------
Write-Host "`n--- D. Developer (only assigned projects) ---" -ForegroundColor Cyan
if ($projNotDev) {
    $r = Api GET "/api/projects/$($projNotDev.id)" $dev.Token
    Check "Developer: cannot open a project they are not assigned to" ($r.Status -eq 403) "HTTP $($r.Status), expected 403"
} else {
    Write-Host "SKIP  Developer is assigned to every project - assign them to fewer to run this test" -ForegroundColor Yellow
}
$clients = @((Api GET "/api/clients" $dev.Token).Json)
Check "Developer: GET /api/clients returns nothing" ($clients.Count -eq 0) "$($clients.Count) returned"

# ---------- E. Manager ----------
Write-Host "`n--- E. Manager (full access) ---" -ForegroundColor Cyan
$r = Api GET "/api/projects/$($projB.id)" $mgr.Token
Check "Manager: can open any client's project" ($r.Status -eq 200) "HTTP $($r.Status), expected 200"
Check "Manager: GET /api/projects returns all projects" ($all.Count -ge $rows.Count) "$($all.Count) projects"

# ---------- F. Lockout (optional) ----------
if ($RunLockoutTest) {
    Write-Host "`n--- F. Login lockout ---" -ForegroundColor Cyan
    $codes = @()
    1..5 | ForEach-Object {
        $codes += (Api POST "/api/auth/login" $null @{ email = $LockoutEmail; password = "wrong-password-$_" }).Status
    }
    Check "5 wrong passwords are rejected" (@($codes | Where-Object { $_ -eq 401 }).Count -eq 5) "codes: $($codes -join ',')"
    $r = Api POST "/api/auth/login" $null @{ email = $LockoutEmail; password = $LockoutRealPassword }
    Check "Correct password is refused once locked" ($r.Status -eq 403) "HTTP $($r.Status), expected 403"

    # Unlock the throwaway account again
    $adm = Login $Admin
    $acct = @((Api GET "/api/accounts" $adm.Token).Json) | Where-Object { $_.email -eq $LockoutEmail } | Select-Object -First 1
    if ($acct) {
        Api POST "/api/accounts/$($acct.id)/status" $adm.Token @{ active = $true } | Out-Null
        $r = Api POST "/api/auth/login" $null @{ email = $LockoutEmail; password = $LockoutRealPassword }
        Check "Account works again after an admin unlocks it" ($r.Status -eq 200) "HTTP $($r.Status), expected 200"
    }
}

# ---------- G. Password rules (no account is changed) ----------
# Password rules are checked before the code is, so a made-up email and code is enough.
Write-Host "`n--- G. Password rules enforced by the API ---" -ForegroundColor Cyan
$weak = @("short1!", "123456", "password", "qwerty", "admin123", "Password1234!!", "P@ssw0rd2024!!", "qwertyuiop12", "aaaaaaaaaaaa", "123456789012")
foreach ($endpoint in @("/api/auth/reset-password", "/api/accounts/activate")) {
    foreach ($pw in $weak) {
        $r = Api POST $endpoint $null @{ email = "nobody@example.com"; code = "000000"; password = $pw }
        $msg = if ($r.Json) { "$($r.Json.message)" } else { "" }
        Check "Weak password '$pw' rejected by $endpoint" ($r.Status -eq 400 -and $msg -like "Password not accepted*") "HTTP $($r.Status) $msg"
    }
    # A strong password passes the rules, so the request only fails later on the unknown account or code.
    $r = Api POST $endpoint $null @{ email = "nobody@example.com"; code = "000000"; password = "Mango-River-Lantern-47" }
    $msg = if ($r.Json) { "$($r.Json.message)" } else { "" }
    Check "Strong password passes the rules at $endpoint" ($msg -notlike "Password not accepted*") "HTTP $($r.Status) $msg"
}

# ---------- Summary ----------
$pass = @($results | Where-Object { $_.Result -eq "PASS" }).Count
$fail = @($results | Where-Object { $_.Result -eq "FAIL" }).Count
Write-Host "`n==== SUMMARY: $pass passed, $fail failed ====" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
$results | Export-Csv -Path $csvFile -NoTypeInformation
Write-Host "Saved: $logFile`n       $csvFile"
Stop-Transcript | Out-Null