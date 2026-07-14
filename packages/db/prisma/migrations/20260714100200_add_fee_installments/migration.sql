-- CreateEnum
CREATE TYPE "FeeFrequency" AS ENUM ('MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ChargeType" AS ENUM ('FIXED', 'PERCENTAGE');

-- CreateTable
CREATE TABLE "FeeInstallment" (
    "id" TEXT NOT NULL,
    "feePlanId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "frequency" "FeeFrequency" NOT NULL DEFAULT 'QUARTERLY',

    CONSTRAINT "FeeInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LateFeeRule" (
    "id" TEXT NOT NULL,
    "installmentId" TEXT NOT NULL,
    "graceDays" INTEGER NOT NULL DEFAULT 0,
    "chargeType" "ChargeType" NOT NULL DEFAULT 'FIXED',
    "amount" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "LateFeeRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeConcession" (
    "id" TEXT NOT NULL,
    "installmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "discountType" "ChargeType" NOT NULL DEFAULT 'PERCENTAGE',
    "value" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "FeeConcession_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FeeInstallment" ADD CONSTRAINT "FeeInstallment_feePlanId_fkey" FOREIGN KEY ("feePlanId") REFERENCES "FeePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LateFeeRule" ADD CONSTRAINT "LateFeeRule_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "FeeInstallment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeConcession" ADD CONSTRAINT "FeeConcession_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "FeeInstallment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
