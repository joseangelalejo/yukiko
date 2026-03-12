#!/usr/bin/env python3
"""
============================================================
Yukiko Bot — Script de instalación para Windows (Python)
Autor: joseangelalejo — https://github.com/joseangelalejo/yukiko
Uso:   python scripts/install-windows.py
       (No requiere PowerShell Admin — usa winget en modo usuario)
Req:   Python 3.8+ (viene preinstalado en Windows 10/11)
       o instala desde: https://python.org
============================================================
"""

import subprocess
import sys
import os
import platform
import urllib.request
import json
from pathlib import Path
from shutil import which

# ─── Colores (ANSI en Windows Terminal / PowerShell 7) ──────
class C:
    RESET  = "\033[0m"
    BOLD   = "\033[1m"
    PINK   = "\033[1;35m"
    CYAN   = "\033[1;36m"
    GREEN  = "\033[1;32m"
    YELLOW = "\033[1;33m"
    RED    = "\033[1;31m"
    BLUE   = "\033[1;34m"

# Activar ANSI en Windows
if platform.system() == "Windows":
    os.system("")

def ok(msg):   print(f"  {C.GREEN}✓{C.RESET} {msg}")
def warn(msg): print(f"  {C.YELLOW}⚠{C.RESET} {msg}")
def info(msg): print(f"  {C.CYAN}→{C.RESET} {msg}")
def err(msg):  print(f"  {C.RED}✗{C.RESET} {msg}")
def step(n, msg):
    print(f"\n{C.PINK}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{C.RESET}")
    print(f"{C.CYAN}[{n}]{C.RESET} {C.BOLD}{msg}{C.RESET}")
    print(f"{C.PINK}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{C.RESET}")

def run(cmd, check=True, capture=True, shell=True):
    """Ejecuta un comando y retorna (returncode, stdout, stderr)."""
    result = subprocess.run(
        cmd, shell=shell, capture_output=capture, text=True
    )
    if check and result.returncode != 0:
        raise subprocess.CalledProcessError(result.returncode, cmd, result.stdout, result.stderr)
    return result

def cmd_exists(name):
    """Comprueba si un comando existe en PATH."""
    return which(name) is not None

def winget_install(pkg_id, pkg_name):
    """Instala un paquete via winget."""
    info(f"Instalando {pkg_name}...")
    result = subprocess.run(
        f'winget install --id {pkg_id} --silent --accept-package-agreements --accept-source-agreements',
        shell=True, capture_output=True, text=True
    )
    if result.returncode == 0 or "already installed" in result.stdout.lower():
        ok(f"{pkg_name} instalado")
        return True
    else:
        warn(f"{pkg_name} falló o ya instalado — continuando")
        return False

def npm_global_install(packages):
    """Instala paquetes npm globalmente."""
    for pkg in packages:
        info(f"npm install -g {pkg}")
        result = subprocess.run(
            f"npm install -g {pkg}",
            shell=True, capture_output=True, text=True
        )
        if result.returncode == 0:
            ok(f"{pkg} instalado")
        else:
            warn(f"Error con {pkg} — puede que Node.js no esté en PATH aún")

# ────────────────────────────────────────────────────────────
# BANNER
# ────────────────────────────────────────────────────────────
os.system("cls" if platform.system() == "Windows" else "clear")
print(f"""{C.PINK}
  ██╗   ██╗██╗   ██╗██╗  ██╗██╗██╗  ██╗ ██████╗
  ╚██╗ ██╔╝██║   ██║██║ ██╔╝██║██║ ██╔╝██╔═══██╗
   ╚████╔╝ ██║   ██║█████╔╝ ██║█████╔╝ ██║   ██║
    ╚██╔╝  ██║   ██║██╔═██╗ ██║██╔═██╗ ██║   ██║
     ██║   ╚██████╔╝██║  ██╗██║██║  ██╗╚██████╔╝
     ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚═╝╚═╝  ╚═╝ ╚═════╝
{C.RESET}""")
print(f"  {C.CYAN}🌨️  Yukiko Bot — Instalador Windows (Python){C.RESET}")
print(f"  {C.BLUE}Versión sin PowerShell Admin — usa winget{C.RESET}")
print()

# Sistema
if platform.system() != "Windows":
    err("Este script es solo para Windows.")
    err("Para Arch Linux usa: bash scripts/install-arch.sh")
    sys.exit(1)

print(f"  Python: {C.CYAN}{sys.version.split()[0]}{C.RESET}")
print(f"  SO:     {C.CYAN}{platform.version()[:60]}{C.RESET}")
print()

confirm = input(f"  {C.YELLOW}¿Continuar la instalación? [S/n]: {C.RESET}").strip().lower()
if confirm == "n":
    print("Cancelado.")
    sys.exit(0)

# ────────────────────────────────────────────────────────────
# PASO 1 — Verificar winget
# ────────────────────────────────────────────────────────────
step("1/7", "Verificando winget...")
if not cmd_exists("winget"):
    err("winget no encontrado.")
    info("Instala 'App Installer' desde Microsoft Store:")
    info("https://apps.microsoft.com/detail/9NBLGGH4NNS1")
    input("Presiona Enter para abrir la URL en el navegador...")
    os.startfile("https://apps.microsoft.com/detail/9NBLGGH4NNS1")
    sys.exit(1)

result = run("winget --version", capture=True)
ok(f"winget {result.stdout.strip()}")

# ────────────────────────────────────────────────────────────
# PASO 2 — Herramientas base
# ────────────────────────────────────────────────────────────
step("2/7", "Instalando herramientas base...")

packages = [
    ("OpenJS.NodeJS.LTS",          "Node.js 20 LTS"),
    ("Git.Git",                    "Git"),
    ("GitHub.cli",                 "GitHub CLI"),
    ("Gyan.FFmpeg",                "ffmpeg"),
    ("jqlang.jq",                  "jq"),
    ("Microsoft.WindowsTerminal",  "Windows Terminal"),
    ("Microsoft.VisualStudioCode", "VS Code"),
    ("Docker.DockerDesktop",       "Docker Desktop"),
]

for pkg_id, pkg_name in packages:
    winget_install(pkg_id, pkg_name)

# ────────────────────────────────────────────────────────────
# PASO 3 — Refrescar PATH
# ────────────────────────────────────────────────────────────
step("3/7", "Actualizando PATH en sesión actual...")

# Intentar añadir rutas típicas de Node.js / Git al PATH de esta sesión
common_paths = [
    r"C:\Program Files\nodejs",
    r"C:\Program Files\Git\bin",
    r"C:\Program Files\GitHub CLI",
    str(Path.home() / "AppData" / "Roaming" / "npm"),
]
current_path = os.environ.get("PATH", "")
for p in common_paths:
    if os.path.isdir(p) and p not in current_path:
        os.environ["PATH"] = p + ";" + os.environ["PATH"]
        info(f"PATH += {p}")

ok("PATH actualizado para esta sesión")
warn("Abre una nueva terminal para que los cambios sean permanentes")

# ────────────────────────────────────────────────────────────
# PASO 4 — Verificar Node.js
# ────────────────────────────────────────────────────────────
step("4/7", "Verificando Node.js...")
if cmd_exists("node"):
    result = run("node --version", capture=True)
    node_ver = result.stdout.strip()
    major = int(node_ver.lstrip("v").split(".")[0])
    if major < 20:
        warn(f"Node.js {node_ver} — se recomienda v20+. Reinicia la terminal.")
    else:
        ok(f"Node.js {node_ver} OK")
else:
    warn("Node.js no encontrado en PATH. Reinicia la terminal e intenta de nuevo.")
    warn("Si el problema persiste, instala manualmente: https://nodejs.org")

# ────────────────────────────────────────────────────────────
# PASO 5 — npm globales
# ────────────────────────────────────────────────────────────
step("5/7", "Instalando herramientas npm globales...")
if cmd_exists("npm"):
    npm_global_install(["pm2", "tsx", "vercel"])
else:
    warn("npm no disponible aún. Instala manualmente después:")
    info("npm install -g pm2 tsx vercel")

# ────────────────────────────────────────────────────────────
# PASO 6 — SSH Key
# ────────────────────────────────────────────────────────────
step("6/7", "Configurando clave SSH para deploy...")
ssh_dir  = Path.home() / ".ssh"
key_path = ssh_dir / "yukiko_rsa"
ssh_dir.mkdir(exist_ok=True)

if not key_path.exists():
    if cmd_exists("ssh-keygen"):
        result = subprocess.run(
            f'ssh-keygen -t ed25519 -C "yukiko-deploy" -f "{key_path}" -N ""',
            shell=True, capture_output=True, text=True
        )
        if result.returncode == 0:
            ok(f"Clave SSH generada: {key_path}")
            pub_key = (key_path.with_suffix(".pub")).read_text().strip()
            print(f"\n  {C.YELLOW}Clave pública (cópiala a tu homelab):{C.RESET}")
            print(f"  {C.CYAN}{pub_key}{C.RESET}\n")
        else:
            warn("Error generando SSH key. Instala OpenSSH desde Configuración → Apps → Características opcionales.")
    else:
        warn("ssh-keygen no encontrado. Activa OpenSSH en Windows:")
        info("Configuración → Sistema → Características opcionales → OpenSSH Client")
else:
    ok(f"Clave SSH ya existe: {key_path}")

# ────────────────────────────────────────────────────────────
# PASO 7 — GitHub CLI auth
# ────────────────────────────────────────────────────────────
step("7/7", "GitHub CLI...")
if cmd_exists("gh"):
    result = subprocess.run("gh auth status", shell=True, capture_output=True, text=True)
    if result.returncode == 0:
        ok("GitHub CLI ya autenticado")
    else:
        info("Iniciando autenticación GitHub CLI...")
        subprocess.run("gh auth login --web", shell=True)
else:
    warn("GitHub CLI no encontrado en PATH. Autentícate más tarde con: gh auth login")

# ────────────────────────────────────────────────────────────
# RESUMEN
# ────────────────────────────────────────────────────────────
print(f"\n{C.PINK}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{C.RESET}")
print(f"{C.GREEN}{C.BOLD}🎉 ¡Instalación completa!{C.RESET}")
print(f"{C.PINK}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{C.RESET}\n")

print("  Siguientes pasos:\n")
print(f"  {C.CYAN}1.{C.RESET} Abre Docker Desktop y espera a que arranque")
print(f"  {C.CYAN}2.{C.RESET} Abre una nueva terminal (para cargar PATH)")
print(f"  {C.CYAN}3.{C.RESET} cd yukiko")
print(f"  {C.CYAN}4.{C.RESET} copy .env.example .env  → edita .env con tus tokens")
print(f"  {C.CYAN}5.{C.RESET} npm install")
print(f"  {C.CYAN}6.{C.RESET} npx drizzle-kit push")
print(f"  {C.CYAN}7.{C.RESET} npm run dev")
print()
print(f"  Docs: {C.BLUE}https://joseangelalejo.github.io/yukiko{C.RESET}")
print()
warn("IMPORTANTE: Reinicia Windows si instalaste Docker Desktop.")
print()

input("  Presiona Enter para salir...")
