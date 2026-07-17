-- CreateEnum
CREATE TYPE "note_kind" AS ENUM ('NOTE', 'OBSERVATION', 'INCIDENT');

-- CreateTable
CREATE TABLE "client_notes" (
    "id" TEXT NOT NULL,
    "kind" "note_kind" NOT NULL DEFAULT 'NOTE',
    "body" TEXT NOT NULL,
    "author_email" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contact_id" TEXT NOT NULL,

    CONSTRAINT "client_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_notes_contact_id_idx" ON "client_notes"("contact_id");

-- AddForeignKey
ALTER TABLE "client_notes" ADD CONSTRAINT "client_notes_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "users_information"("id") ON DELETE CASCADE ON UPDATE CASCADE;
