
import json
from pathlib import Path

from db.connection import get_conn


REFERENCE_QUERIES = {
    "SQL_01": """
        SELECT COUNT(*) AS total_orders
        FROM orders
    """,

    "SQL_02": """
        SELECT COUNT(*) AS canceled_orders
        FROM orders
        WHERE order_status = 'canceled'
    """,

    "SQL_03": """
        SELECT customer_state, COUNT(*) AS customer_count
        FROM customers
        GROUP BY customer_state
        ORDER BY customer_count DESC
        LIMIT 5
    """,

    "SQL_04": """
        SELECT EXTRACT(YEAR FROM o.order_purchase_timestamp)::int AS year,
               SUM(i.price) AS total_revenue
        FROM orders o
        JOIN order_items i ON o.order_id = i.order_id
        GROUP BY 1
        ORDER BY 1
    """,

    "SQL_05": """
        SELECT order_status, COUNT(*) AS order_count
        FROM orders
        GROUP BY order_status
        ORDER BY order_count DESC
    """,

    "SQL_06": """
        SELECT o.order_status,
               ROUND(AVG(r.review_score)::numeric, 2) AS average_review_score
        FROM orders o
        JOIN order_reviews r ON o.order_id = r.order_id
        GROUP BY o.order_status
        ORDER BY o.order_status
    """,

    "SQL_07": """
        SELECT COALESCE(
                   ct.product_category_name_english,
                   p.product_category_name
               ) AS category,
               SUM(oi.price) AS total_revenue
        FROM order_items oi
        JOIN products p ON oi.product_id = p.product_id
        LEFT JOIN category_translation ct
            ON p.product_category_name = ct.product_category_name
        GROUP BY 1
        ORDER BY total_revenue DESC
        LIMIT 5
    """,

    "SQL_08": """
        SELECT DATE_TRUNC('month', order_purchase_timestamp)::date AS month,
               COUNT(*) AS total_orders
        FROM orders
        GROUP BY 1
        ORDER BY 1
    """
}


def generate_ground_truth():
    questions_path = Path("eval/questions.json")

    with questions_path.open("r", encoding="utf-8") as f:
        questions = json.load(f)

    with get_conn() as conn:
        with conn.cursor() as cur:
            for question in questions:
                question_id = question["id"]
                sql = REFERENCE_QUERIES[question_id]

                cur.execute(sql)

                columns = [desc.name for desc in cur.description]
                rows = cur.fetchall()

                question["reference_result"] = {
                    "columns": columns,
                    "rows": [
                        [str(value) for value in row]
                        for row in rows
                    ]
                }

                print(f"\n{question_id}: {question['question']}")
                for row in rows[:10]:
                    print(row)

    with questions_path.open("w", encoding="utf-8") as f:
        json.dump(questions, f, indent=2, ensure_ascii=False)

    print("\nGround-truth results saved successfully.")


if __name__ == "__main__":
    generate_ground_truth()
