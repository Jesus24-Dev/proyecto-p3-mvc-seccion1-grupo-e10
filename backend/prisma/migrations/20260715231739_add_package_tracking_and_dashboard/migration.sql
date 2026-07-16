-- AlterTable
ALTER TABLE "agencies" ADD COLUMN     "dashboard_layout" JSONB,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "package_events" (
    "id" TEXT NOT NULL,
    "status" "package_status" NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "package_id" TEXT NOT NULL,
    "agency_id" TEXT,

    CONSTRAINT "package_events_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "package_events" ADD CONSTRAINT "package_events_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_events" ADD CONSTRAINT "package_events_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
