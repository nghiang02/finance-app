-- Runs only when the Postgres volume is created for the first time.
-- Existing volumes: docker compose exec postgres createdb -U finance finance_test
CREATE DATABASE finance_test;
