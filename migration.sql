-- ============================================================
-- MIGRATION : Gestion des courriers
-- À exécuter dans l'ordre sur votre base PostgreSQL
-- ============================================================

-- ─── 1. CRÉER LA TABLE SERVICES ──────────────────────────────
CREATE TABLE IF NOT EXISTS services (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nom         VARCHAR(100) NOT NULL,
  code        VARCHAR(50)  NOT NULL UNIQUE,
  description TEXT,
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Insérer les services de base (adaptez selon votre organisation)
INSERT INTO services (nom, code, description) VALUES
  ('Service Administratif', 'SERVICE_ADMINISTRATIF', 'Gestion du courrier entrant et sortant'),
  ('Direction Générale',    'DIRECTION_GENERALE',    'Direction de l''organisation'),
  ('Ressources Humaines',   'RESSOURCES_HUMAINES',   'Gestion du personnel'),
  ('Comptabilité',          'COMPTABILITE',          'Gestion financière')
ON CONFLICT (code) DO NOTHING;

-- ─── 2. AJOUTER service_id SUR LA TABLE USERS ────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES services(id) ON DELETE SET NULL;

-- ─── 3. MODIFIER LA TABLE COURRIERS ──────────────────────────

-- Ajouter le champ nature (INTERNE / EXTERNE)
ALTER TABLE courriers
  ADD COLUMN IF NOT EXISTS nature VARCHAR(10) NOT NULL DEFAULT 'EXTERNE'
  CHECK (nature IN ('INTERNE', 'EXTERNE'));

-- Ajouter les clés étrangères vers les services
ALTER TABLE courriers
  ADD COLUMN IF NOT EXISTS service_expediteur_id   UUID REFERENCES services(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS service_destinataire_id UUID REFERENCES services(id) ON DELETE SET NULL;

-- Mettre à jour l'ENUM statut si nécessaire (déjà correct en principe)
-- ALTER TYPE "enum_courriers_statut" ADD VALUE IF NOT EXISTS 'EN_TRAITEMENT';

-- ─── 4. CRÉER LA TABLE COURRIER_HISTORIQUES ───────────────────
CREATE TABLE IF NOT EXISTS courrier_historiques (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  courrier_id UUID         NOT NULL REFERENCES courriers(id) ON DELETE CASCADE,
  user_id     UUID         REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(30)  NOT NULL
    CHECK (action IN ('CREATION', 'MODIFICATION', 'CHANGEMENT_STATUT', 'SUPPRESSION', 'ARCHIVAGE')),
  details     TEXT,
  metadata    JSONB        NOT NULL DEFAULT '{}',
  created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
  -- Pas de updated_at : un historique ne se modifie jamais
);

-- Index pour accélérer la récupération de l'historique d'un courrier
CREATE INDEX IF NOT EXISTS idx_courrier_historiques_courrier_id
  ON courrier_historiques(courrier_id);

-- ─── 5. METTRE À JOUR LES PERMISSIONS DES RÔLES ──────────────
-- Ajouter les nouvelles permissions courrier dans le JSONB existant

-- ADMIN : toutes les permissions
UPDATE roles
SET permissions = permissions || '{
  "courrier.externe.access": true,
  "courrier.interne.access": true,
  "courrier.create":         true,
  "courrier.update":         true,
  "courrier.statut.change":  true,
  "courrier.delete":         true,
  "courrier.stats":          true
}'::jsonb
WHERE name = 'ADMIN';

-- MANAGER : accès complet sauf suppression
UPDATE roles
SET permissions = permissions || '{
  "courrier.externe.access": true,
  "courrier.interne.access": true,
  "courrier.create":         true,
  "courrier.update":         true,
  "courrier.statut.change":  true,
  "courrier.delete":         false,
  "courrier.stats":          true
}'::jsonb
WHERE name = 'MANAGER';

-- EMPLOYEE : accès interne uniquement par défaut
-- (Le service administratif devra avoir un rôle dédié ou une permission overridée)
UPDATE roles
SET permissions = permissions || '{
  "courrier.externe.access": false,
  "courrier.interne.access": true,
  "courrier.create":         true,
  "courrier.update":         false,
  "courrier.statut.change":  false,
  "courrier.delete":         false,
  "courrier.stats":          false
}'::jsonb
WHERE name = 'EMPLOYEE';

-- VIEWER : lecture seule sur les courriers internes
UPDATE roles
SET permissions = permissions || '{
  "courrier.externe.access": false,
  "courrier.interne.access": true,
  "courrier.create":         false,
  "courrier.update":         false,
  "courrier.statut.change":  false,
  "courrier.delete":         false,
  "courrier.stats":          false
}'::jsonb
WHERE name = 'VIEWER';

-- ─── 6. CRÉER UN RÔLE DÉDIÉ "AGENT ADMINISTRATIF" (optionnel) 
-- Ce rôle peut être assigné aux employés du service administratif
INSERT INTO roles (id, name, label, color, description, permissions, is_system)
VALUES (
  gen_random_uuid(),
  'AGENT_ADMINISTRATIF',
  'Agent Administratif',
  '#2563eb',
  'Employé du service administratif avec accès complet aux courriers',
  '{
    "canUpload": true, "canDownload": true, "canSubmit": true,
    "canApprove": false, "canSign": false, "canArchive": true,
    "canManageUsers": false, "canManageRoles": false, "canViewAll": false,
    "courrier.externe.access": true,
    "courrier.interne.access": true,
    "courrier.create":         true,
    "courrier.update":         true,
    "courrier.statut.change":  true,
    "courrier.delete":         false,
    "courrier.stats":          true
  }'::jsonb,
  false
)
ON CONFLICT (name) DO NOTHING;

-- ─── VÉRIFICATION FINALE ──────────────────────────────────────
-- Lancez ces requêtes pour vérifier que tout est bien en place :
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'courriers';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'users';
-- SELECT name, permissions FROM roles;
-- SELECT * FROM services;
