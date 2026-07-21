-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('TRANSFER', 'MOBILE_PAYMENT', 'CASH');

-- CreateEnum
CREATE TYPE "payment_kind" AS ENUM ('PREPAID', 'COLLECT');

-- AlterTable
ALTER TABLE "packages" ADD COLUMN     "image_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "stage_id" TEXT;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "kind" "payment_kind" NOT NULL DEFAULT 'PREPAID',
ADD COLUMN     "method" "payment_method" NOT NULL DEFAULT 'TRANSFER',
ADD COLUMN     "package_id" TEXT;

-- CreateTable
CREATE TABLE "pipeline_stages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "status" "package_status",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pipeline_stages_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "pipeline_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
