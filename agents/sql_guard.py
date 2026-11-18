import sqlglot
from sqlglot import exp

from db.connection import get_readonly_conn

ALLOWED_TABLES = {
    "customers",
    "orders",
    "order_items",
    "order_payments",
    "order_reviews",
    "products",
    "sellers",
    "category_translation",
}
BLOCKED_FUNCS = {"dblink", "lo_import", "lo_export", "set_config"}
MAX_ROWS = 200


class UnsafeSQL(ValueError):
    pass


def validate_sql(sql: str) -> str:
    try:
        parsed = sqlglot.parse(sql, read="postgres")
    except sqlglot.errors.SqlglotError as e:
        raise UnsafeSQL(f"parse error: {e}")

    statements = [s for s in parsed if s is not None]
    if len(statements) != 1:
        raise UnsafeSQL("exactly one statement allowed")

    tree = statements[0]
    if not isinstance(tree, (exp.Select, exp.Union)):
        raise UnsafeSQL("only SELECT allowed")

    banned = (exp.Insert, exp.Update, exp.Delete, exp.Drop, exp.Create,
              exp.Alter, exp.Command, exp.Into)
    if tree.find(*banned):
        raise UnsafeSQL("write or DDL operation not allowed")

    cte_names = {c.alias_or_name for c in tree.find_all(exp.CTE)}
    for table in tree.find_all(exp.Table):
        if table.name not in ALLOWED_TABLES | cte_names:
            raise UnsafeSQL(f"table not allowed: {table.name}")

    for func in tree.find_all(exp.Func):
        if isinstance(func, exp.Anonymous):
            name = str(func.name).lower()
        else:
            name = func.sql_name().lower()
        if name.startswith("pg_") or name in BLOCKED_FUNCS:
            raise UnsafeSQL(f"function not allowed: {name}")

    if not tree.args.get("limit"):
        tree = tree.limit(MAX_ROWS)

    return tree.sql(dialect="postgres")


def run_query(sql: str) -> dict:
    safe_sql = validate_sql(sql)
    with get_readonly_conn() as conn:
        cur = conn.execute(safe_sql)
        columns = [d.name for d in cur.description]
        rows = cur.fetchmany(MAX_ROWS)
    return {"sql": safe_sql, "columns": columns, "rows": rows}