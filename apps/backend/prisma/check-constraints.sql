
-- ---------------------------------------------------------------------------
-- Business rules that Prisma schema cannot express (CHECK constraints).
-- Prisma Migrate does not manage CHECK constraints, so it will not drop them.
-- ---------------------------------------------------------------------------

-- Amounts are always positive; the transaction type decides the sign.
ALTER TABLE "Transaction"
  ADD CONSTRAINT "Transaction_amount_positive" CHECK ("amount" > 0);

-- TRANSFER: has a different destination wallet and no category.
-- INCOME/EXPENSE: has a category and no destination wallet.
ALTER TABLE "Transaction"
  ADD CONSTRAINT "Transaction_type_shape" CHECK (
    (
      "type" = 'TRANSFER'
      AND "toWalletId" IS NOT NULL
      AND "toWalletId" <> "walletId"
      AND "categoryId" IS NULL
    )
    OR (
      "type" <> 'TRANSFER'
      AND "toWalletId" IS NULL
      AND "categoryId" IS NOT NULL
    )
  );

ALTER TABLE "Budget"
  ADD CONSTRAINT "Budget_limit_positive" CHECK ("limit" > 0);

ALTER TABLE "Budget"
  ADD CONSTRAINT "Budget_month_format" CHECK ("month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');
