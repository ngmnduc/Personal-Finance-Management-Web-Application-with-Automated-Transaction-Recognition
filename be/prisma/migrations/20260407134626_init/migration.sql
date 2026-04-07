-- CreateEnum
CREATE TYPE "WalletType" AS ENUM ('CASH', 'BANK', 'E_WALLET', 'GENERAL');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "TxSource" AS ENUM ('MANUAL', 'OCR', 'RECURRING');

-- CreateEnum
CREATE TYPE "BudgetPeriod" AS ENUM ('WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "WalletType" NOT NULL DEFAULT 'GENERAL',
    "initial_balance" BIGINT NOT NULL DEFAULT 0,
    "current_balance" BIGINT NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "name" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'circle',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" BIGINT NOT NULL,
    "transaction_date" TIMESTAMP(3) NOT NULL,
    "merchant" TEXT,
    "note" TEXT,
    "source" "TxSource" NOT NULL DEFAULT 'MANUAL',
    "extracted_text" TEXT,
    "recurring_rule_id" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "amount_limit" BIGINT NOT NULL,
    "period" "BudgetPeriod" NOT NULL,
    "alert_80_sent_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saving_goals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "source_wallet_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "target_amount" BIGINT NOT NULL,
    "current_amount" BIGINT NOT NULL DEFAULT 0,
    "deadline" TIMESTAMP(3),
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saving_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_rules" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "merchant" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "interval_days" INTEGER NOT NULL DEFAULT 30,
    "next_due_date" TIMESTAMP(3),
    "snoozed_until" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_incomes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "day_of_month" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_incomes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "wallets_user_id_deleted_at_idx" ON "wallets"("user_id", "deleted_at");

-- CreateIndex
CREATE INDEX "categories_user_id_type_idx" ON "categories"("user_id", "type");

-- CreateIndex
CREATE INDEX "transactions_user_id_deleted_at_idx" ON "transactions"("user_id", "deleted_at");

-- CreateIndex
CREATE INDEX "transactions_user_id_transaction_date_idx" ON "transactions"("user_id", "transaction_date");

-- CreateIndex
CREATE INDEX "transactions_wallet_id_deleted_at_idx" ON "transactions"("wallet_id", "deleted_at");

-- CreateIndex
CREATE INDEX "transactions_user_id_merchant_amount_idx" ON "transactions"("user_id", "merchant", "amount");

-- CreateIndex
CREATE INDEX "budgets_user_id_deleted_at_idx" ON "budgets"("user_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "budgets_user_id_category_id_period_key" ON "budgets"("user_id", "category_id", "period");

-- CreateIndex
CREATE INDEX "saving_goals_user_id_status_idx" ON "saving_goals"("user_id", "status");

-- CreateIndex
CREATE INDEX "recurring_rules_user_id_is_active_idx" ON "recurring_rules"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "recurring_incomes_user_id_is_active_idx" ON "recurring_incomes"("user_id", "is_active");

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recurring_rule_id_fkey" FOREIGN KEY ("recurring_rule_id") REFERENCES "recurring_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saving_goals" ADD CONSTRAINT "saving_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saving_goals" ADD CONSTRAINT "saving_goals_source_wallet_id_fkey" FOREIGN KEY ("source_wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_incomes" ADD CONSTRAINT "recurring_incomes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_incomes" ADD CONSTRAINT "recurring_incomes_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_incomes" ADD CONSTRAINT "recurring_incomes_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
