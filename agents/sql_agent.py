import re
import sys

import psycopg

from agents.sql_guard import UnsafeSQL, run_query
from llm.client import chat

SYSTEM_PROMPT = """You write PostgreSQL SELECT queries for the Olist Brazilian e-commerce database.
Return ONLY one SQL query. No explanation, no markdown.

Schema:
customers(customer_id PK, customer_unique_id, customer_zip_code_prefix, customer_city, customer_state)
orders(order_id PK, customer_id, order_status, order_purchase_timestamp, order_approved_at,
       order_delivered_carrier_date, order_delivered_customer_date, order_estimated_delivery_date)
order_items(order_id, order_item_id, product_id, seller_id, shipping_limit_date, price, freight_value)
order_payments(order_id, payment_sequential, payment_type, payment_installments, payment_value)
order_reviews(review_id, order_id, review_score, review_comment_title, review_comment_message,
              review_creation_date, review_answer_timestamp)
products(product_id PK, product_category_name, product_name_lenght, product_description_lenght,
         product_photos_qty, product_weight_g, product_length_cm, product_height_cm, product_width_cm)
sellers(seller_id PK, seller_zip_code_prefix, seller_city, seller_state)
category_translation(product_category_name PK, product_category_name_english)

Rules:
- order_status values: delivered, shipped, canceled, unavailable, invoiced, processing, created, approved. Cancelled orders use 'canceled' (one l).
- Data covers 2016-09 to 2018-10. Never use NOW() or CURRENT_DATE for "recent".
- Revenue = SUM(order_items.price). Freight is order_items.freight_value, separate.
- One-to-many tables (order_items, order_payments, order_reviews) multiply rows when joined together.
  Aggregate each in its own subquery or CTE per order_id BEFORE joining. Never SUM across a fan-out join.
- Product category reporting:
  Always LEFT JOIN category_translation when returning product categories.
  Use COALESCE(category_translation.product_category_name_english,
               products.product_category_name) as the category.
  Never return Portuguese category codes when English category names
  are requested or appropriate for business reporting.
- Use DATE_TRUNC for month or year grouping on order_purchase_timestamp.
- For yearly grouping, use EXTRACT(YEAR FROM timestamp)::int.
- For monthly grouping, use DATE_TRUNC('month', timestamp)::date.
- For average review scores by order status, calculate
  AVG(order_reviews.review_score) directly after joining orders
  to order_reviews. Do not average per-order averages unless
  explicitly requested.
- Use ROUND(AVG(review_score)::numeric, 2) when reporting
  average review scores.
  - Do not introduce filters that the user did not request.
  For example, revenue means all order statuses unless the user
  explicitly requests delivered orders or another status.

- For distribution questions, return the requested categories
  and their counts. Do not add percentages unless requested.

- Preserve the requested output granularity and columns.
  Do not add extra metrics or columns without user intent.

"""


def extract_sql(text: str) -> str:
    match = re.search(r"```(?:sql)?\s*(.*?)```", text, re.DOTALL | re.IGNORECASE)
    return (match.group(1) if match else text).strip().rstrip(";")


def answer_sql(question: str, max_attempts: int = 2) -> dict:
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": question},
    ]
    prompt_tokens = completion_tokens = 0
    sql, error = None, None

    for attempt in range(1, max_attempts + 1):
        out = chat(messages)
        prompt_tokens += out["prompt_tokens"]
        completion_tokens += out["completion_tokens"]
        sql = extract_sql(out["content"])
        try:
            result = run_query(sql)
            return {
                "question": question,
                **result,
                "attempts": attempt,
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
            }
        except (UnsafeSQL, psycopg.Error) as e:
            error = str(e)
            messages += [
                {"role": "assistant", "content": sql},
                {"role": "user", "content": f"That query failed: {error}\nReturn a corrected SELECT only."},
            ]

    return {
        "question": question,
        "sql": sql,
        "error": error,
        "attempts": max_attempts,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
    }


if __name__ == "__main__":
    q = " ".join(sys.argv[1:]) or "How many orders were canceled?"
    out = answer_sql(q)
    print("SQL:", out["sql"])
    print("attempts:", out["attempts"], "| tokens:", out["prompt_tokens"], "+", out["completion_tokens"])
    print("error:", out.get("error"))
    for row in out.get("rows", [])[:10]:
        print(row)