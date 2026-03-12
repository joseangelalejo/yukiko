#!/usr/bin/env bash
# ============================================================
# Yukiko — Mantenimiento del sistema de vinculación de cuentas
# Uso: bash scripts/link-maintenance.sh [--cleanup | --stats | --check]
# ============================================================

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

ok()   { echo -e "  ${GREEN}✓${RESET} $*"; }
warn() { echo -e "  ${YELLOW}⚠${RESET} $*"; }
info() { echo -e "  ${CYAN}→${RESET} $*"; }
err()  { echo -e "  ${RED}✗${RESET} $*"; }

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Cargar .env
if [[ -f .env ]]; then
  # shellcheck disable=SC1091
  set -a; source .env; set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  err "DATABASE_URL no configurado en .env"
  exit 1
fi

MODE="${1:---stats}"

echo -e "\n${BOLD}🌨️ Yukiko — Sistema de vinculación de cuentas${RESET}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "Modo: ${BOLD}$MODE${RESET} | $(date '+%Y-%m-%d %H:%M:%S')\n"

run_query() {
  node --input-type=module << EOF
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
const result = await sql\`$1\`;
console.log(JSON.stringify(result, null, 2));
EOF
}

case "$MODE" in

  # ── Estadísticas del sistema de links ────────────────────
  --stats)
    echo -e "${BOLD}📊 Estadísticas de vinculación${RESET}\n"

    # Total usuarios por plataforma
    info "Usuarios totales por plataforma:"
    node --input-type=module << 'EOF'
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
const rows = await sql`
  SELECT
    platform,
    COUNT(*) as total,
    COUNT(linked_to_user_id) as linked,
    COUNT(*) - COUNT(linked_to_user_id) as standalone
  FROM users
  GROUP BY platform
  ORDER BY platform
`;
rows.forEach(r => {
  console.log(`    ${r.platform.padEnd(10)} total: ${r.total}  vinculadas: ${r.linked}  independientes: ${r.standalone}`);
});
EOF

    echo ""
    info "Grupos de cuentas vinculadas:"
    node --input-type=module << 'EOF'
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
const rows = await sql`
  SELECT
    COUNT(DISTINCT linked_to_user_id) as grupos_vinculados,
    COUNT(*) as cuentas_secundarias
  FROM users
  WHERE linked_to_user_id IS NOT NULL
`;
console.log(`    Grupos vinculados: ${rows[0].grupos_vinculados}`);
console.log(`    Cuentas secundarias: ${rows[0].cuentas_secundarias}`);
EOF

    echo ""
    info "Tokens activos (no expirados, no usados):"
    node --input-type=module << 'EOF'
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
const rows = await sql`
  SELECT
    COUNT(*) FILTER (WHERE expires_at > NOW() AND used_at IS NULL) as activos,
    COUNT(*) FILTER (WHERE expires_at <= NOW() AND used_at IS NULL) as expirados_sin_limpiar,
    COUNT(*) FILTER (WHERE used_at IS NOT NULL) as usados
  FROM link_tokens
`;
console.log(`    Activos: ${rows[0].activos}  Expirados: ${rows[0].expirados_sin_limpiar}  Usados: ${rows[0].usados}`);
EOF

    echo ""
    info "Últimas 5 vinculaciones:"
    node --input-type=module << 'EOF'
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
const rows = await sql`
  SELECT
    l.linked_at,
    l.linked_platform,
    l.balance_merged,
    l.xp_merged,
    u_master.display_name as master_name,
    u_master.platform as master_platform,
    u_linked.display_name as linked_name
  FROM linked_accounts_log l
  JOIN users u_master ON l.master_user_id = u_master.id
  JOIN users u_linked  ON l.linked_user_id = u_linked.id
  ORDER BY l.linked_at DESC
  LIMIT 5
`;
if (rows.length === 0) {
  console.log('    Sin vinculaciones aún.');
} else {
  rows.forEach(r => {
    const ts = new Date(r.linked_at).toLocaleString('es-ES');
    console.log(`    [${ts}] ${r.master_name} (${r.master_platform}) ← ${r.linked_name} (${r.linked_platform}) | +${r.balance_merged}🪙 +${r.xp_merged}XP`);
  });
}
EOF
    ;;

  # ── Limpiar tokens expirados ─────────────────────────────
  --cleanup)
    echo -e "${BOLD}🧹 Limpiando tokens expirados${RESET}\n"
    node --input-type=module << 'EOF'
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

// Tokens expirados sin usar (más de 1 hora)
const r1 = await sql`
  DELETE FROM link_tokens
  WHERE expires_at < NOW() - INTERVAL '1 hour'
    AND used_at IS NULL
`;
console.log(`  ✓ Tokens expirados sin usar eliminados: ${r1.count ?? '?'}`);

// Tokens usados (más de 24 horas)
const r2 = await sql`
  DELETE FROM link_tokens
  WHERE used_at IS NOT NULL
    AND used_at < NOW() - INTERVAL '24 hours'
`;
console.log(`  ✓ Tokens usados (>24h) eliminados: ${r2.count ?? '?'}`);
EOF
    ok "Limpieza completada"
    ;;

  # ── Verificar integridad del sistema de links ────────────
  --check)
    echo -e "${BOLD}🔍 Verificando integridad${RESET}\n"

    node --input-type=module << 'EOF'
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
let issues = 0;

// Verificar cuentas que apuntan a masters que no existen
const orphans = await sql`
  SELECT u.id, u.platform, u.display_name, u.linked_to_user_id
  FROM users u
  LEFT JOIN users m ON u.linked_to_user_id = m.id
  WHERE u.linked_to_user_id IS NOT NULL AND m.id IS NULL
`;
if (orphans.length > 0) {
  console.log(`  ✗ Cuentas con linked_to_user_id inválido: ${orphans.length}`);
  orphans.forEach(o => console.log(`    - ${o.display_name} (${o.platform})`));
  issues++;
} else {
  console.log('  ✓ Sin referencias huérfanas');
}

// Verificar que ninguna cuenta master apunte a otra cuenta
const chainedLinks = await sql`
  SELECT u.id, u.display_name, u.platform, u.linked_to_user_id
  FROM users u
  JOIN users m ON u.linked_to_user_id = m.id
  WHERE m.linked_to_user_id IS NOT NULL
`;
if (chainedLinks.length > 0) {
  console.log(`  ✗ Links encadenados detectados (posible ciclo): ${chainedLinks.length}`);
  issues++;
} else {
  console.log('  ✓ Sin links encadenados');
}

// Tokens con usuario inexistente
const badTokens = await sql`
  SELECT t.id, t.token
  FROM link_tokens t
  LEFT JOIN users u ON t.user_id = u.id
  WHERE u.id IS NULL
`;
if (badTokens.length > 0) {
  console.log(`  ✗ Tokens sin usuario asociado: ${badTokens.length}`);
  issues++;
} else {
  console.log('  ✓ Todos los tokens tienen usuario válido');
}

console.log('');
if (issues === 0) {
  console.log('  🎉 Sistema de links: OK — Sin problemas de integridad');
} else {
  console.log(`  ⚠️  Problemas encontrados: ${issues}. Revisar manualmente.`);
  process.exit(1);
}
EOF
    ;;

  *)
    echo "Uso: bash scripts/link-maintenance.sh [--stats | --cleanup | --check]"
    echo ""
    echo "  --stats    Muestra estadísticas del sistema de vinculación"
    echo "  --cleanup  Elimina tokens expirados y usados"
    echo "  --check    Verifica integridad de las relaciones en BD"
    exit 1
    ;;
esac

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "Completado — $(date '+%H:%M:%S')\n"
