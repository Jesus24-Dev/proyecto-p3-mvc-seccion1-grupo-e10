/*
  Warnings:

  - You are about to drop the `customers_information` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "customers_information" DROP CONSTRAINT "customers_information_user_id_fkey";

-- DropTable
DROP TABLE "customers_information";

-- CreateTable
CREATE TABLE "users_information" (
    "id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "birthday" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "users_information_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_information_user_id_key" ON "users_information"("user_id");

-- AddForeignKey
ALTER TABLE "users_information" ADD CONSTRAINT "users_information_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
