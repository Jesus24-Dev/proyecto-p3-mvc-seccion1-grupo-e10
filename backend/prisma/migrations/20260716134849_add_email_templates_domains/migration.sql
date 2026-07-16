-- CreateEnum
CREATE TYPE "email_domain_status" AS ENUM ('PENDING', 'VERIFIED');

-- CreateTable
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "agency_id" TEXT NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_domains" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "status" "email_domain_status" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agency_id" TEXT NOT NULL,

    CONSTRAINT "email_domains_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_agency_id_name_key" ON "email_templates"("agency_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "email_domains_agency_id_domain_key" ON "email_domains"("agency_id", "domain");

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_domains" ADD CONSTRAINT "email_domains_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
