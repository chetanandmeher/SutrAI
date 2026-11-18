import pytest

from agents.sql_guard import UnsafeSQL, validate_sql


def test_simple_select_ok():
    out = validate_sql("SELECT order_status, COUNT(*) FROM orders GROUP BY 1")
    assert "SELECT" in out


def test_limit_added():
    assert "LIMIT 200" in validate_sql("SELECT * FROM orders")


def test_existing_limit_kept():
    assert "LIMIT 5" in validate_sql("SELECT * FROM orders LIMIT 5")


def test_cte_ok():
    validate_sql(
        "WITH c AS (SELECT * FROM orders WHERE order_status = 'canceled') "
        "SELECT COUNT(*) FROM c"
    )


@pytest.mark.parametrize(
    "sql",
    [
        "DROP TABLE orders",
        "DELETE FROM orders",
        "UPDATE orders SET order_status = 'x'",
        "INSERT INTO customers VALUES ('a', 'b', 'c', 'd', 'e')",
        "SELECT * FROM orders; DROP TABLE orders",
        "SELECT * FROM document_chunks",
        "SELECT * FROM pg_user",
        "SELECT pg_sleep(10)",
        "SELECT * INTO newtbl FROM orders",
        "SELECT pg_read_file('/etc/passwd')",
        "",
    ],
)
def test_unsafe_rejected(sql):
    with pytest.raises(UnsafeSQL):
        validate_sql(sql)