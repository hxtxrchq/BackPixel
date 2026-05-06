-- Ejecutar este script en el SQL Editor de Supabase:
-- https://supabase.com/dashboard/project/rkrkvskjlxqujlmluciw/sql/new

CREATE TABLE IF NOT EXISTS "RoleConfig" (
    "key"         TEXT NOT NULL,
    "label"       TEXT NOT NULL,
    "description" TEXT,
    "color"       TEXT,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    CONSTRAINT "RoleConfig_pkey" PRIMARY KEY ("key")
);

-- Seed initial role definitions
INSERT INTO "RoleConfig" ("key", "label", "description", "color", "updatedAt")
VALUES
  ('GLOBAL_ADMIN', 'Administrador global', 'Acceso completo al sistema',       '#e73c50', NOW()),
  ('TI_ADMIN',     'TI',                  'Administrador de tecnología',       '#6c84ff', NOW()),
  ('STAFF',        'Staff',               'Usuario estándar del equipo',       '#35c98f', NOW())
ON CONFLICT ("key") DO NOTHING;
