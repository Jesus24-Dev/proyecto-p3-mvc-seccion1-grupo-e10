-- Las automatizaciones pasan a ser únicas por subcuenta (agencia).
ALTER TABLE "automations" ADD COLUMN "agency_id" TEXT;

-- Backfill: asigna los flujos existentes a la primera agencia por nombre.
UPDATE "automations"
SET "agency_id" = (SELECT id FROM "agencies" ORDER BY name ASC LIMIT 1)
WHERE "agency_id" IS NULL;

CREATE INDEX "automations_agency_id_idx" ON "automations"("agency_id");

ALTER TABLE "automations"
  ADD CONSTRAINT "automations_agency_id_fkey"
  FOREIGN KEY ("agency_id") REFERENCES "agencies"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
