DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'sutrai_ro') THEN
        CREATE ROLE sutrai_ro LOGIN PASSWORD 'sutrai_ro';
    END IF;
END
$$;

GRANT CONNECT ON DATABASE sutrai TO sutrai_ro;
GRANT USAGE ON SCHEMA public TO sutrai_ro;
GRANT SELECT ON customers, orders, order_items, order_payments,
    order_reviews, products, sellers, category_translation TO sutrai_ro;

ALTER ROLE sutrai_ro SET statement_timeout = '5s';
ALTER ROLE sutrai_ro SET default_transaction_read_only = on;