-- Enlace mágico (login passwordless)
ALTER TABLE "users" ADD COLUMN "magic_token" TEXT;
ALTER TABLE "users" ADD COLUMN "magic_expires" TIMESTAMP(3);
CREATE UNIQUE INDEX "users_magic_token_key" ON "users"("magic_token");
