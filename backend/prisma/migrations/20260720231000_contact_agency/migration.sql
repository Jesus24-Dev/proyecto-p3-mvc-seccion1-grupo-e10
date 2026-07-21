-- Todo contacto pertenece a una agencia (subcuenta). Base del alcance por sede.
ALTER TABLE "users_information" ADD COLUMN "agency_id" TEXT;

-- Backfill: usa la agencia de la membresía del usuario de respaldo; si no tiene,
-- la primera agencia por nombre.
UPDATE "users_information" ui
SET "agency_id" = (
  SELECT am."agency_id" FROM "agency_members" am
  WHERE am."user_id" = ui."user_id"
  ORDER BY am."created_at" ASC
  LIMIT 1
)
WHERE ui."agency_id" IS NULL;

UPDATE "users_information"
SET "agency_id" = (SELECT id FROM "agencies" ORDER BY name ASC LIMIT 1)
WHERE "agency_id" IS NULL;

CREATE INDEX "users_information_agency_id_idx" ON "users_information"("agency_id");

ALTER TABLE "users_information"
  ADD CONSTRAINT "users_information_agency_id_fkey"
  FOREIGN KEY ("agency_id") REFERENCES "agencies"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
