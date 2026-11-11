-- Database-level business rules (CHECK constraints, partial unique indexes, FKs).
-- Runs inside a transaction and rolls back, so it never leaves data behind.
-- Every line of output must start with PASS; CI fails on any FAIL.
--   psql "postgresql://finance:finance@localhost:5432/finance" -v ON_ERROR_STOP=1 -f prisma/tests/constraints.sql
\set QUIET on
\pset tuples_only on
\pset format unaligned
BEGIN;
CREATE FUNCTION pg_temp.expect(label text, stmt text, err text DEFAULT NULL) RETURNS text
LANGUAGE plpgsql AS $f$
BEGIN
  EXECUTE stmt;
  RETURN CASE WHEN err IS NULL THEN 'PASS  ' ELSE 'FAIL  ' END || label;
EXCEPTION WHEN OTHERS THEN
  IF SQLSTATE = err THEN RETURN 'PASS  ' || label; END IF;
  RETURN 'FAIL  ' || label || '  [' || SQLSTATE || ' ' || SQLERRM || ']';
END $f$;

INSERT INTO "User" (id, email, "passwordHash", "updatedAt") VALUES ('smoke-user', 'smoke@test.local', 'x', now());
INSERT INTO "Wallet" (id, "userId", name, type, "updatedAt") VALUES
  ('smoke-cash', 'smoke-user', 'Cash', 'CASH', now()), ('smoke-bank', 'smoke-user', 'Bank', 'BANK', now());
INSERT INTO "Category" (id, "userId", name, type, "updatedAt") VALUES ('smoke-food', 'smoke-user', 'Food', 'EXPENSE', now());

SELECT pg_temp.expect('valid EXPENSE accepted', $$INSERT INTO "Transaction" (id,"userId",type,amount,"walletId","toWalletId","categoryId","occurredAt","updatedAt") VALUES ('t1','smoke-user','EXPENSE',50000,'smoke-cash',NULL,'smoke-food',now(),now())$$);
SELECT pg_temp.expect('valid TRANSFER accepted', $$INSERT INTO "Transaction" (id,"userId",type,amount,"walletId","toWalletId","categoryId","occurredAt","updatedAt") VALUES ('t2','smoke-user','TRANSFER',100000,'smoke-cash','smoke-bank',NULL,now(),now())$$);
SELECT pg_temp.expect('amount must be > 0', $$INSERT INTO "Transaction" (id,"userId",type,amount,"walletId","toWalletId","categoryId","occurredAt","updatedAt") VALUES ('t3','smoke-user','EXPENSE',0,'smoke-cash',NULL,'smoke-food',now(),now())$$, '23514');
SELECT pg_temp.expect('TRANSFER to the same wallet rejected', $$INSERT INTO "Transaction" (id,"userId",type,amount,"walletId","toWalletId","categoryId","occurredAt","updatedAt") VALUES ('t4','smoke-user','TRANSFER',1000,'smoke-cash','smoke-cash',NULL,now(),now())$$, '23514');
SELECT pg_temp.expect('TRANSFER with category rejected', $$INSERT INTO "Transaction" (id,"userId",type,amount,"walletId","toWalletId","categoryId","occurredAt","updatedAt") VALUES ('t5','smoke-user','TRANSFER',1000,'smoke-cash','smoke-bank','smoke-food',now(),now())$$, '23514');
SELECT pg_temp.expect('EXPENSE without category rejected', $$INSERT INTO "Transaction" (id,"userId",type,amount,"walletId","toWalletId","categoryId","occurredAt","updatedAt") VALUES ('t6','smoke-user','EXPENSE',1000,'smoke-cash',NULL,NULL,now(),now())$$, '23514');
SELECT pg_temp.expect('EXPENSE with toWallet rejected', $$INSERT INTO "Transaction" (id,"userId",type,amount,"walletId","toWalletId","categoryId","occurredAt","updatedAt") VALUES ('t7','smoke-user','EXPENSE',1000,'smoke-cash','smoke-bank','smoke-food',now(),now())$$, '23514');

SELECT pg_temp.expect('overall budget created', $$INSERT INTO "Budget" (id,"userId","categoryId",month,"limit","updatedAt") VALUES ('b1','smoke-user',NULL,'2026-11',5000000,now())$$);
SELECT pg_temp.expect('2nd overall budget same month rejected', $$INSERT INTO "Budget" (id,"userId","categoryId",month,"limit","updatedAt") VALUES ('b2','smoke-user',NULL,'2026-11',1000,now())$$, '23505');
SELECT pg_temp.expect('category budget created', $$INSERT INTO "Budget" (id,"userId","categoryId",month,"limit","updatedAt") VALUES ('b3','smoke-user','smoke-food','2026-11',2000000,now())$$);
SELECT pg_temp.expect('2nd category budget same month rejected', $$INSERT INTO "Budget" (id,"userId","categoryId",month,"limit","updatedAt") VALUES ('b4','smoke-user','smoke-food','2026-11',1000,now())$$, '23505');
SELECT pg_temp.expect('soft-delete overall budget', $$UPDATE "Budget" SET "deletedAt" = now() WHERE id = 'b1'$$);
SELECT pg_temp.expect('re-create after soft delete allowed', $$INSERT INTO "Budget" (id,"userId","categoryId",month,"limit","updatedAt") VALUES ('b5','smoke-user',NULL,'2026-11',6000000,now())$$);
SELECT pg_temp.expect('budget limit must be > 0', $$INSERT INTO "Budget" (id,"userId","categoryId",month,"limit","updatedAt") VALUES ('b6','smoke-user',NULL,'2026-12',0,now())$$, '23514');
SELECT pg_temp.expect('month format YYYY-MM enforced', $$INSERT INTO "Budget" (id,"userId","categoryId",month,"limit","updatedAt") VALUES ('b7','smoke-user',NULL,'2026-13',1000,now())$$, '23514');

SELECT pg_temp.expect('hard delete of a used wallet blocked', $$DELETE FROM "Wallet" WHERE id = 'smoke-cash'$$, '23503');
SELECT pg_temp.expect('deleting the user cascades', $$DELETE FROM "User" WHERE id = 'smoke-user'$$);
SELECT CASE WHEN count(*) = 0 THEN 'PASS  ' ELSE 'FAIL  ' END || 'no rows left after cascade' FROM "Transaction" WHERE "userId" = 'smoke-user';
ROLLBACK;
