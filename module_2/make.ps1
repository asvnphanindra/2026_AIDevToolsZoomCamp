# Mini Kanban task runner for Windows PowerShell (Makefile alternative).
# Usage: .\make.ps1 help | install | dev | backend | frontend | test | ...

param(
    [Parameter(Position = 0)]
    [ValidateSet(
        "help",
        "install",
        "install-backend",
        "install-frontend",
        "dev",
        "backend",
        "frontend",
        "test",
        "test-backend",
        "test-frontend"
    )]
    [string]$Target = "help",

    [int]$BackendPort = 8000,
    [int]$FrontendPort = 8080
)

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot

function Invoke-InDir {
    param(
        [string]$Dir,
        [scriptblock]$Script
    )
    Push-Location (Join-Path $Root $Dir)
    try {
        & $Script
        if ($LASTEXITCODE -ne 0 -and $null -ne $LASTEXITCODE) {
            exit $LASTEXITCODE
        }
    }
    finally {
        Pop-Location
    }
}

function Stop-ProcessTree {
    param([int]$ProcessId)
    if ($ProcessId -le 0) { return }
    & taskkill.exe /PID $ProcessId /T /F 2>$null | Out-Null
}

switch ($Target) {
    "help" {
        Write-Host "Mini Kanban commands"
        Write-Host ""
        Write-Host "  .\make.ps1 install          Install backend + frontend deps"
        Write-Host "  .\make.ps1 dev              Run backend + frontend together"
        Write-Host "  .\make.ps1 backend          Run API on http://127.0.0.1:$BackendPort"
        Write-Host "  .\make.ps1 frontend         Run UI on http://localhost:$FrontendPort"
        Write-Host "  .\make.ps1 test             Run backend + frontend tests"
        Write-Host "  .\make.ps1 test-backend     Run backend tests only"
        Write-Host "  .\make.ps1 test-frontend    Run frontend tests only"
        Write-Host ""
        Write-Host "Override ports: .\make.ps1 backend -BackendPort 8091"
    }
    "install" {
        Invoke-InDir backend { uv sync }
        Invoke-InDir frontend { npm install }
    }
    "install-backend" {
        Invoke-InDir backend { uv sync }
    }
    "install-frontend" {
        Invoke-InDir frontend { npm install }
    }
    "dev" {
        $uv = (Get-Command uv).Source
        $backendDir = Join-Path $Root "backend"
        Write-Host "Starting backend on http://127.0.0.1:$BackendPort"
        Write-Host "Starting frontend on http://localhost:$FrontendPort"
        Write-Host "Ctrl+C stops both."
        $backend = Start-Process -FilePath $uv `
            -ArgumentList @(
                "run", "uvicorn", "app.main:app",
                "--reload", "--host", "127.0.0.1", "--port", "$BackendPort"
            ) `
            -WorkingDirectory $backendDir `
            -PassThru `
            -NoNewWindow
        try {
            Invoke-InDir frontend {
                npm run dev -- --port $FrontendPort
            }
        }
        finally {
            Stop-ProcessTree -ProcessId $backend.Id
        }
    }
    "backend" {
        Invoke-InDir backend {
            uv run uvicorn app.main:app --reload --port $BackendPort
        }
    }
    "frontend" {
        Invoke-InDir frontend {
            npm run dev -- --port $FrontendPort
        }
    }
    "test" {
        Invoke-InDir backend { uv run pytest }
        Invoke-InDir frontend { npm test }
    }
    "test-backend" {
        Invoke-InDir backend { uv run pytest }
    }
    "test-frontend" {
        Invoke-InDir frontend { npm test }
    }
}
