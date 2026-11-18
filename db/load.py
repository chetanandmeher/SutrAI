from pathlib import Path

from db.connection import get_conn

DATA_DIR = Path("data")
SCHEMA = Path("db/schema.sql")

# load order matters: parents before children
TABLES = [
    ("customers", "olist_customers_dataset.csv"),
    ("orders", "olist_orders_dataset.csv"),
    ("sellers", "olist_sellers_dataset.csv"),
    ("products", "olist_products_dataset.csv"),
    ("order_items", "olist_order_items_dataset.csv"),
    ("order_payments", "olist_order_payments_dataset.csv"),
    ("order_reviews", "olist_order_reviews_dataset.csv"),
    ("category_translation", "product_category_name_translation.csv"),
]


def main():
    with get_conn() as conn:
        conn.execute(SCHEMA.read_text(encoding="utf-8"))
        for table, filename in TABLES:
            path = DATA_DIR / filename
            with conn.cursor() as cur, open(path, encoding="utf-8-sig") as f:
                with cur.copy(
                    f"COPY {table} FROM STDIN WITH (FORMAT csv, HEADER true)"
                ) as copy:
                    while chunk := f.read(1 << 20):
                        copy.write(chunk)
            count = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            print(f"{table}: {count} rows")


if __name__ == "__main__":
    main()