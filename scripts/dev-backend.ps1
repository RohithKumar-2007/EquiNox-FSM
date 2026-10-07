<#
Runs the Spring Boot backend on this PC with automatic restart, using the database and file storage
from Docker (docker-compose.dev.yml).

Usage (from the repo root):
  .\scripts\dev-backend.ps1
  .\scripts\dev-backend.ps1 -JavaHome "C:\path\to\jdk-21"

When you save a .java file (or anything under src/main/resources), the code is recompiled and
Spring Boot DevTools restarts the app in a few seconds. Press Ctrl+C to stop.
#>
param(
    [string]$JavaHome = "D:\",
    [string]$DbHostPort = "localhost:5433",
    [string]$DbName = "atlas",
    [string]$MinioBucket = "atlas-bucket",
    [string]$FrontendUrl = "http://localhost:3001",
    [switch]$NoWatch
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$apiDir = Join-Path $repoRoot "api"

if (-not (Test-Path (Join-Path $JavaHome "bin\java.exe"))) {
    throw "No Java found at '$JavaHome'. Pass -JavaHome with the folder that contains bin\java.exe (JDK 17 or 21)."
}
$env:JAVA_HOME = $JavaHome
$env:Path = (Join-Path $JavaHome "bin") + ";" + $env:Path

# Load the same settings Docker uses from the root .env (KEY=VALUE lines).
$envFile = Join-Path $repoRoot ".env"
if (-not (Test-Path $envFile)) { throw "Missing $envFile" }
$settings = @{}
foreach ($line in Get-Content $envFile) {
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$') {
        $settings[$Matches[1]] = $Matches[2].Trim()
    }
}
foreach ($key in $settings.Keys) {
    Set-Item -Path "Env:$key" -Value $settings[$key]
}

# Settings that docker-compose.yml derives for the container, adjusted for running on this PC.
$env:DB_URL = "$DbHostPort/$DbName"
$env:DB_USER = $settings["POSTGRES_USER"]
$env:DB_PWD = $settings["POSTGRES_PWD"]
$env:PUBLIC_FRONT_URL = $FrontendUrl
$env:PUBLIC_API_URL = "$FrontendUrl/api"
$env:STORAGE_TYPE = if ($settings["STORAGE_TYPE"]) { $settings["STORAGE_TYPE"] } else { "minio" }
$env:MINIO_ENDPOINT = "http://localhost:9000"
$env:MINIO_BUCKET = $MinioBucket
$env:MINIO_ACCESS_KEY = $settings["MINIO_USER"]
$env:MINIO_SECRET_KEY = $settings["MINIO_PASSWORD"]
$env:PUBLIC_MINIO_ENDPOINT = "$FrontendUrl/storage"
if (-not $env:GEMINI_MODEL) { $env:GEMINI_MODEL = "gemini-3.8-flash" }

# Check that the database from docker-compose.dev.yml is reachable before starting.
$dbPort = [int]($DbHostPort.Split(":")[1])
$dbReachable = Test-NetConnection -ComputerName "localhost" -Port $dbPort -InformationLevel Quiet -WarningAction SilentlyContinue
if (-not $dbReachable) {
    throw "The database isn't reachable on $DbHostPort. Start it first:`n  docker compose -p atlas-cmms -f docker-compose.yml -f docker-compose.local.yml -f docker-compose.dev.yml up -d postgres minio"
}

$mvnw = Join-Path $apiDir "mvnw.cmd"
$watcherJob = $null
if (-not $NoWatch) {
    # Recompile on save; DevTools notices the new classes and restarts the app.
    $watcherJob = Start-Job -ArgumentList $apiDir, $mvnw, $JavaHome -ScriptBlock {
        param($apiDir, $mvnw, $javaHome)
        $env:JAVA_HOME = $javaHome
        $watcher = New-Object System.IO.FileSystemWatcher (Join-Path $apiDir "src\main"), "*.*"
        $watcher.IncludeSubdirectories = $true
        $watcher.NotifyFilter = [System.IO.NotifyFilters]'LastWrite, FileName'
        while ($true) {
            $change = $watcher.WaitForChanged([System.IO.WatcherChangeTypes]::All, 1000)
            if ($change.TimedOut) { continue }
            # Let editors finish writing (and batch "save all") before compiling.
            do { $more = $watcher.WaitForChanged([System.IO.WatcherChangeTypes]::All, 1500) } while (-not $more.TimedOut)
            Write-Output "[watch] Change detected, recompiling..."
            Push-Location $apiDir
            & $mvnw -q -o compile 2>&1 | ForEach-Object { "[watch] $_" }
            if ($LASTEXITCODE -eq 0) { Write-Output "[watch] Compiled. The app restarts in a few seconds." }
            else { Write-Output "[watch] Compile failed. Fix the error above and save again." }
            Pop-Location
        }
    }
}

Write-Host "Starting backend on http://localhost:8080 (database $DbHostPort/$DbName). First run downloads Maven libraries and takes a while." -ForegroundColor Cyan
Push-Location $apiDir
try {
    if ($watcherJob) {
        # Relay watcher output while the app runs.
        $timer = New-Object System.Timers.Timer 1000
        Register-ObjectEvent -InputObject $timer -EventName Elapsed -MessageData $watcherJob -Action {
            Receive-Job $Event.MessageData | ForEach-Object { Write-Host $_ -ForegroundColor Yellow }
        } | Out-Null
        $timer.Start()
    }
    & $mvnw "-Dspring-boot.run.jvmArguments=--add-opens=java.base/java.lang=ALL-UNNAMED -Xmx1024m" spring-boot:run
}
finally {
    Pop-Location
    if ($watcherJob) {
        Stop-Job $watcherJob -ErrorAction SilentlyContinue
        Remove-Job $watcherJob -Force -ErrorAction SilentlyContinue
    }
    Get-EventSubscriber -ErrorAction SilentlyContinue | Unregister-Event -ErrorAction SilentlyContinue
}
