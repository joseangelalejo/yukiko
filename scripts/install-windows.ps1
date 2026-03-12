# ============================================================
# Yukiko Bot — Script de instalación para Windows
# Autor: joseangelalejo — https://github.com/joseangelalejo/yukiko
# Uso: Ejecutar como Administrador en PowerShell
#      Set-ExecutionPolicy Bypass -Scope Process
#      .\scripts\install-windows.ps1
# ============================================================

#Requires -RunAsAdministrator

$ErrorActionPreference = "Stop"

# ─── Colores y helpers ───────────────────────────────────────
function Write-Step($n, $text) {
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta
    Write-Host "[$n] $text" -ForegroundColor Cyan -NoNewline
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta
}

function Write-OK($text)   { Write-Host "  ✓ $text" -ForegroundColor Green }
function Write-Warn($text) { Write-Host "  ⚠ $text" -ForegroundColor Yellow }
function Write-Info($text) { Write-Host "  → $text" -ForegroundColor Cyan }
function Write-Err($text)  { Write-Host "  ✗ $text" -ForegroundColor Red }

function Test-Command($cmd) { return (Get-Command $cmd -ErrorAction SilentlyContinue) -ne $null }

# ─── Banner ──────────────────────────────────────────────────
Clear-Host
Write-Host @"
  ██╗   ██╗██╗   ██╗██╗  ██╗██╗██╗  ██╗ ██████╗
  ╚██╗ ██╔╝██║   ██║██║ ██╔╝██║██║ ██╔╝██╔═══██╗
   ╚████╔╝ ██║   ██║█████╔╝ ██║█████╔╝ ██║   ██║
    ╚██╔╝  ██║   ██║██╔═██╗ ██║██╔═██╗ ██║   ██║
     ██║   ╚██████╔╝██║  ██╗██║██║  ██╗╚██████╔╝
     ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚═╝╚═╝  ╚═╝ ╚═════╝
"@ -ForegroundColor Magenta

Write-Host "  🌨️  Yukiko Bot — Instalador Windows (PowerShell Admin)" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Herramientas a instalar:" -ForegroundColor White
Write-Host "    Winget: Node.js 20 LTS, Git, Docker Desktop, Redis (WSL), ffmpeg, jq, gh" -ForegroundColor Gray
Write-Host "    npm -g: pm2, tsx, vercel" -ForegroundColor Gray
Write-Host "    SSH:    generación de clave para deploy" -ForegroundColor Gray
Write-Host ""

$confirm = Read-Host "¿Continuar? [S/n]"
if ($confirm -eq "n" -or $confirm -eq "N") { Write-Host "Cancelado."; exit 0 }

# ─── Verificar Winget ─────────────────────────────────────────
Write-Step "1/8" "Verificando winget..."
if (-not (Test-Command "winget")) {
    Write-Warn "winget no encontrado. Instala App Installer desde Microsoft Store."
    Write-Info "https://apps.microsoft.com/detail/9NBLGGH4NNS1"
    exit 1
}
Write-OK "winget disponible: $(winget --version)"

# ─── Instalar herramientas base ───────────────────────────────
Write-Step "2/8" "Instalando herramientas base con winget..."

$wingetPackages = @(
    @{ id = "OpenJS.NodeJS.LTS";           name = "Node.js 20 LTS" },
    @{ id = "Git.Git";                     name = "Git" },
    @{ id = "GitHub.cli";                  name = "GitHub CLI" },
    @{ id = "Gyan.FFmpeg";                 name = "ffmpeg" },
    @{ id = "jqlang.jq";                   name = "jq" },
    @{ id = "Microsoft.WindowsTerminal";   name = "Windows Terminal" },
    @{ id = "Microsoft.VisualStudioCode";  name = "VS Code" }
)

foreach ($pkg in $wingetPackages) {
    Write-Info "Instalando $($pkg.name)..."
    try {
        winget install --id $pkg.id --silent --accept-package-agreements --accept-source-agreements 2>&1 | Out-Null
        Write-OK "$($pkg.name) instalado"
    } catch {
        Write-Warn "$($pkg.name) falló o ya está instalado — continuando..."
    }
}

# ─── Docker Desktop ───────────────────────────────────────────
Write-Step "3/8" "Docker Desktop..."
if (Test-Command "docker") {
    Write-OK "Docker ya instalado: $(docker --version)"
} else {
    Write-Info "Instalando Docker Desktop..."
    winget install --id Docker.DockerDesktop --silent --accept-package-agreements --accept-source-agreements 2>&1 | Out-Null
    Write-OK "Docker Desktop instalado"
    Write-Warn "Deberás reiniciar Windows y abrir Docker Desktop manualmente para completar la configuración."
}

# ─── Refrescar PATH ───────────────────────────────────────────
Write-Step "4/8" "Refrescando PATH..."
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
Write-OK "PATH actualizado en sesión actual"

# ─── Verificar Node.js ────────────────────────────────────────
Write-Step "5/8" "Verificando Node.js..."
try {
    $nodeVer = (node --version 2>&1).ToString()
    $nodeMajor = [int]($nodeVer -replace 'v(\d+)\..*','$1')
    if ($nodeMajor -lt 20) {
        Write-Warn "Node.js $nodeVer detectado — se recomienda v20+. Reinicia PowerShell tras la instalación."
    } else {
        Write-OK "Node.js $nodeVer OK"
    }
} catch {
    Write-Warn "Node.js no encontrado en PATH aún — cierra y abre PowerShell de nuevo."
}

# ─── npm globales ────────────────────────────────────────────
Write-Step "6/8" "Instalando herramientas npm globales..."
$npmGlobals = @("pm2", "tsx", "vercel")
foreach ($pkg in $npmGlobals) {
    Write-Info "Instalando $pkg..."
    try {
        npm install -g $pkg --silent 2>&1 | Out-Null
        Write-OK "$pkg instalado"
    } catch {
        Write-Warn "Error al instalar $pkg — puede que Node.js no esté en PATH aún. Instala manualmente: npm install -g $pkg"
    }
}

# ─── Redis en WSL (recomendado) ──────────────────────────────
Write-Step "7/8" "Redis (WSL2 recomendado)..."
$wslCheck = wsl --status 2>&1
if ($wslCheck -notmatch "error") {
    Write-Info "WSL detectado. Instalando Redis en WSL Ubuntu..."
    try {
        wsl -e bash -c "which redis-server || (sudo apt-get update -qq && sudo apt-get install -y redis-server -qq && sudo service redis-server start)" 2>&1 | Out-Null
        Write-OK "Redis instalado en WSL"
        Write-Info "Para iniciar Redis: wsl -e sudo service redis-server start"
    } catch {
        Write-Warn "No se pudo instalar Redis en WSL automáticamente."
        Write-Info "Instala manualmente en WSL: sudo apt install redis-server"
    }
} else {
    Write-Warn "WSL2 no disponible. Redis se levantará via Docker Compose automáticamente."
    Write-Info "Activa WSL2: wsl --install"
}

# ─── SSH Key para deploy ─────────────────────────────────────
Write-Step "8/8" "Configurando clave SSH para deploy..."
$sshDir = "$env:USERPROFILE\.ssh"
$keyPath = "$sshDir\yukiko_rsa"

if (-not (Test-Path $sshDir)) {
    New-Item -ItemType Directory -Path $sshDir -Force | Out-Null
}

if (-not (Test-Path $keyPath)) {
    try {
        ssh-keygen -t ed25519 -C "yukiko-deploy" -f $keyPath -N '""' 2>&1 | Out-Null
        Write-OK "Clave SSH generada: $keyPath"
        Write-Info "Clave pública (cópiala a tu homelab):"
        Write-Host ""
        Get-Content "$keyPath.pub" -ErrorAction SilentlyContinue
        Write-Host ""
    } catch {
        Write-Warn "Error generando SSH key — instala OpenSSH primero."
    }
} else {
    Write-OK "Clave SSH ya existe: $keyPath"
}

# ─── GitHub CLI auth ─────────────────────────────────────────
if (Test-Command "gh") {
    $ghStatus = gh auth status 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Info "Iniciando autenticación GitHub CLI..."
        try { gh auth login --web } catch { Write-Warn "Puedes autenticarte después: gh auth login" }
    } else {
        Write-OK "GitHub CLI ya autenticado"
    }
}

# ─── Resumen ─────────────────────────────────────────────────
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta
Write-Host "🎉 ¡Instalación completa!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta
Write-Host ""
Write-Host "Siguientes pasos:" -ForegroundColor White
Write-Host "  1. Cierra y reabre PowerShell (para cargar PATH)"
Write-Host "  2. Abre Docker Desktop y espera a que arranque"
Write-Host "  3. cd yukiko" -ForegroundColor Cyan
Write-Host "  4. cp .env.example .env  → edita .env con tus tokens" -ForegroundColor Cyan
Write-Host "  5. npm install" -ForegroundColor Cyan
Write-Host "  6. npx drizzle-kit push" -ForegroundColor Cyan
Write-Host "  7. npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Docs: https://joseangelalejo.github.io/yukiko" -ForegroundColor Blue
Write-Host ""
Write-Host "  ⚠ IMPORTANTE: Reinicia Windows si instalaste Docker Desktop" -ForegroundColor Yellow
Write-Host ""
