
import json
from pathlib import Path

from db.connection import get_conn

KEYWORDS = [
    "atras",       # delayed / late
    "entreg",      # delivery
    "danific",     # damaged
    "quebr",       # broken
    "defeit",      # defective
    "reembols",    # refund
    "devol",       # return
    "cancel",      # cancellation
    "vendedor",    # seller
    "atendimento", # customer service
]

conditions = " OR ".join(
    ["review_comment_message ILIKE %s"] * len(KEYWORDS)
)

query = f"""
    SELECT review_id, order_id, review_score, review_comment_message
    FROM order_reviews
    WHERE review_comment_message IS NOT NULL
      AND LENGTH(review_comment_message) > 20
      AND ({conditions})
    ORDER BY review_id
    LIMIT 100
"""

with get_conn() as conn:
    with conn.cursor() as cur:
        cur.execute(query, [f"%{word}%" for word in KEYWORDS])
        rows = cur.fetchall()

candidates = [
    {
        "review_id": row[0],
        "order_id": row[1],
        "review_score": row[2],
        "text": row[3],
    }
    for row in rows
]

output = Path("eval/rag_candidates.json")
output.write_text(
    json.dumps(candidates, ensure_ascii=False, indent=2),
    encoding="utf-8",
)

print(f"Exported {len(candidates)} candidate reviews to {output}")
