-- Migration Debat Haiti v2
-- 1. Ajout categorie + dateDebut sur Debat
-- 2. Ajout stance sur Message  
-- 3. Création table votes_debats (Pour/Contre sur le débat global)

-- ── Debat ──
ALTER TABLE "debats" ADD COLUMN IF NOT EXISTS "categorie" TEXT;
ALTER TABLE "debats" ADD COLUMN IF NOT EXISTS "date_debut" TIMESTAMP(3);

-- ── Message : stance ──
DO $$ BEGIN
  CREATE TYPE "StanceMsg" AS ENUM ('POUR', 'CONTRE', 'NEUTRE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "stance" "StanceMsg" NOT NULL DEFAULT 'NEUTRE';

-- ── TypeVoteDebat enum ──
DO $$ BEGIN
  CREATE TYPE "TypeVoteDebat" AS ENUM ('POUR', 'CONTRE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Table votes_debats ──
CREATE TABLE IF NOT EXISTS "votes_debats" (
  "id"         TEXT NOT NULL,
  "type"       "TypeVoteDebat" NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "votant_id"  TEXT NOT NULL,
  "debat_id"   TEXT NOT NULL,

  CONSTRAINT "votes_debats_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "votes_debats_votant_id_debat_id_key" UNIQUE ("votant_id", "debat_id"),
  CONSTRAINT "votes_debats_votant_id_fkey"
    FOREIGN KEY ("votant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "votes_debats_debat_id_fkey"
    FOREIGN KEY ("debat_id")  REFERENCES "debats"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Index pour les requêtes de comptage
CREATE INDEX IF NOT EXISTS "votes_debats_debat_id_type_idx" ON "votes_debats"("debat_id", "type");
CREATE INDEX IF NOT EXISTS "votes_debats_votant_id_idx"     ON "votes_debats"("votant_id");
