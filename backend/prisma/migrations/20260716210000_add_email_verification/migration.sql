-- Verificación de correo para las cuentas
ALTER TABLE "users" ADD COLUMN "email_verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "verification_token" TEXT;
ALTER TABLE "users" ADD COLUMN "verification_expires" TIMESTAMP(3);

-- Las cuentas existentes (semilla) quedan verificadas para no romper el acceso
UPDATE "users" SET "email_verified" = true;

CREATE UNIQUE INDEX "users_verification_token_key" ON "users"("verification_token");
