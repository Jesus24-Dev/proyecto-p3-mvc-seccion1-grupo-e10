/*
  Warnings:

  - The values [USER,DISTRIBUTOR] on the enum `roles` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `date_arrived` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `date_received` on the `orders` table. All the data in the column will be lost.
  - You are about to alter the column `amount` on the `orders` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - A unique constraint covering the columns `[document_id]` on the table `users_information` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updated_at` to the `agencies` table without a default value. This is not possible if the table is not empty.
  - Added the required column `package_delivered_at` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `package_received_at` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `document_id` to the `users_information` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `users_information` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "roles_new" AS ENUM ('CUSTOMER', 'EMPLOYEE', 'ADMIN');
ALTER TABLE "users" ALTER COLUMN "role" TYPE "roles_new" USING ("role"::text::"roles_new");
ALTER TYPE "roles" RENAME TO "roles_old";
ALTER TYPE "roles_new" RENAME TO "roles";
DROP TYPE "public"."roles_old";
COMMIT;

-- AlterTable
ALTER TABLE "agencies" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "is_active" SET DEFAULT true;

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "date_arrived",
DROP COLUMN "date_received",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "package_delivered_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "package_received_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "users_information" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "document_id" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "agencies_user_id_idx" ON "agencies"("user_id");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_user_id_idx" ON "orders"("user_id");

-- CreateIndex
CREATE INDEX "orders_origin_agency_id_idx" ON "orders"("origin_agency_id");

-- CreateIndex
CREATE INDEX "orders_destination_agency_id_idx" ON "orders"("destination_agency_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_information_document_id_key" ON "users_information"("document_id");

-- CreateIndex
CREATE INDEX "users_information_user_id_idx" ON "users_information"("user_id");
