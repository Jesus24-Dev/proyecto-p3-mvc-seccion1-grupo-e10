-- CreateTable
CREATE TABLE "system_config" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "company_name" TEXT NOT NULL DEFAULT 'Dr-Logistics CA',
    "company_rif" TEXT NOT NULL DEFAULT '',
    "company_address" TEXT NOT NULL DEFAULT '',
    "company_phone" TEXT NOT NULL DEFAULT '',
    "company_email" TEXT NOT NULL DEFAULT '',
    "sender_email" TEXT NOT NULL DEFAULT '',
    "support_email" TEXT NOT NULL DEFAULT '',
    "bank_api_key" TEXT NOT NULL DEFAULT '',
    "ml_api_key" TEXT NOT NULL DEFAULT '',
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);
