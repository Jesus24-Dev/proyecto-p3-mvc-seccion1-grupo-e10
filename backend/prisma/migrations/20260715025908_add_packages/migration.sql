-- CreateEnum
CREATE TYPE "package_status" AS ENUM ('RECEIVED', 'IN_TRANSIT', 'IN_WAREHOUSE', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED');

-- CreateTable
CREATE TABLE "packages" (
    "id" TEXT NOT NULL,
    "tracking_code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "weight_kg" DOUBLE PRECISION NOT NULL,
    "status" "package_status" NOT NULL DEFAULT 'RECEIVED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contact_id" TEXT NOT NULL,
    "order_id" TEXT,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "packages_tracking_code_key" ON "packages"("tracking_code");

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "users_information"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
