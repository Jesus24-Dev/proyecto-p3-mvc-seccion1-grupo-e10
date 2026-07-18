-- CreateEnum
CREATE TYPE "automation_run_status" AS ENUM ('RUNNING', 'WAITING', 'COMPLETED', 'EXITED', 'FAILED');

-- CreateEnum
CREATE TYPE "automation_event_result" AS ENUM ('OK', 'ERROR', 'INFO');

-- CreateTable
CREATE TABLE "automation_runs" (
    "id" TEXT NOT NULL,
    "automation_id" TEXT NOT NULL,
    "contact_id" TEXT,
    "status" "automation_run_status" NOT NULL DEFAULT 'RUNNING',
    "current_node_id" TEXT,
    "trigger" TEXT NOT NULL DEFAULT '',
    "context" JSONB,
    "resume_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_run_events" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "node_id" TEXT NOT NULL DEFAULT '',
    "kind" TEXT NOT NULL DEFAULT '',
    "result" "automation_event_result" NOT NULL DEFAULT 'INFO',
    "detail" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_run_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "automation_runs_status_resume_at_idx" ON "automation_runs"("status", "resume_at");

-- CreateIndex
CREATE INDEX "automation_runs_automation_id_idx" ON "automation_runs"("automation_id");

-- CreateIndex
CREATE INDEX "automation_run_events_run_id_idx" ON "automation_run_events"("run_id");

-- AddForeignKey
ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_automation_id_fkey" FOREIGN KEY ("automation_id") REFERENCES "automations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "users_information"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_run_events" ADD CONSTRAINT "automation_run_events_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "automation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
