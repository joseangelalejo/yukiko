-- ============================================================
-- Yukiko Bot — Migración: Sistema de vinculación de cuentas
-- Ejecutar con: psql $DATABASE_URL -f scripts/migrate-link-accounts.sql
-- O aplicar automáticamente: npx drizzle-kit push
-- ============================================================

-- ── 1. Añadir columna linked_to_user_id a users ──────────────
-- (referencia self, nullable — null = cuenta independiente o master)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS linked_to_user_id UUID
  REFERENCES users(id) ON DELETE SET NULL;

-- Índice para buscar todas las cuentas vinculadas a un master
CREATE INDEX IF NOT EXISTS idx_users_linked_to
  ON users (linked_to_user_id)
  WHERE linked_to_user_id IS NOT NULL;

-- ── 2. Tabla de tokens de vinculación ────────────────────────
CREATE TABLE IF NOT EXISTS link_tokens (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform     VARCHAR(20) NOT NULL,
  token        VARCHAR(12) NOT NULL UNIQUE,        -- formato: YUK-XXXX-XXXX
  expires_at   TIMESTAMP   NOT NULL,               -- 10 minutos desde creación
  used_at      TIMESTAMP,                          -- NULL = no usado aún
  created_at   TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- Índice para lookup rápido por token (la operación más frecuente)
CREATE INDEX IF NOT EXISTS idx_link_tokens_token
  ON link_tokens (token)
  WHERE used_at IS NULL;

-- Índice para limpieza de tokens expirados
CREATE INDEX IF NOT EXISTS idx_link_tokens_expires
  ON link_tokens (expires_at);

-- ── 3. Tabla de historial de vinculaciones ───────────────────
CREATE TABLE IF NOT EXISTS linked_accounts_log (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  master_user_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  linked_user_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  linked_platform  VARCHAR(20) NOT NULL,
  linked_at        TIMESTAMP   NOT NULL DEFAULT NOW(),
  balance_merged   INTEGER     NOT NULL DEFAULT 0,
  xp_merged        INTEGER     NOT NULL DEFAULT 0
);

-- Índice para el panel de admin
CREATE INDEX IF NOT EXISTS idx_linked_log_master
  ON linked_accounts_log (master_user_id);

-- ── 4. Limpieza automática de tokens expirados (función) ─────
-- Ejecutar periódicamente o añadir a un cron job en el servidor
CREATE OR REPLACE FUNCTION cleanup_expired_link_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM link_tokens
  WHERE expires_at < NOW() - INTERVAL '1 hour'
     OR (used_at IS NOT NULL AND used_at < NOW() - INTERVAL '24 hours');
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comentario de verificación
COMMENT ON TABLE link_tokens IS
  'Tokens temporales (10 min) para vincular cuentas entre plataformas. '
  'Generados con /linkcode, consumidos con /link <token>.';

COMMENT ON TABLE linked_accounts_log IS
  'Historial inmutable de vinculaciones de cuentas. '
  'Una fila por cada par (master, secondary) vinculado exitosamente.';

COMMENT ON COLUMN users.linked_to_user_id IS
  'Si no es NULL, esta cuenta es secundaria y los stats se leen del master. '
  'La cuenta master tiene este campo en NULL.';
