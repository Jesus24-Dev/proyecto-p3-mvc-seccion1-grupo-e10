-- Papelera de contactos (soft-delete). Al enviar un contacto a la papelera se
-- ocultan también sus paquetes y pagos; el borrado definitivo los elimina.
ALTER TABLE "users_information" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "packages" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "transactions" ADD COLUMN "deleted_at" TIMESTAMP(3);

CREATE INDEX "users_information_deleted_at_idx" ON "users_information"("deleted_at");
CREATE INDEX "packages_deleted_at_idx" ON "packages"("deleted_at");
CREATE INDEX "transactions_deleted_at_idx" ON "transactions"("deleted_at");
