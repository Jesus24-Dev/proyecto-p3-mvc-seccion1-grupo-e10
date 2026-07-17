-- Recuperación de contraseña
ALTER TABLE "users" ADD COLUMN "reset_token" TEXT;
ALTER TABLE "users" ADD COLUMN "reset_expires" TIMESTAMP(3);
CREATE UNIQUE INDEX "users_reset_token_key" ON "users"("reset_token");
