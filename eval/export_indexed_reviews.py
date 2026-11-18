
import json
from pathlib import Path

from db.connection import get_conn

query = """
    SELECT
        id,
        metadata->>'review_id' AS review_id,
        metadata->>'order_id' AS order_id,
        chunk_text
    FROM document_chunks
    ORDER BY id
"""

with get_conn() as conn:
    with conn.cursor() as cur:
        cur.execute(query)
        rows = cur.fetchall()

records = [
    {
        "chunk_id": row[0],
        "review_id": row[1],
        "order_id": row[2],
        "text": row[3],
    }
    for row in rows
]

output = Path("eval/indexed_reviews.json")
output.write_text(
    json.dumps(records, ensure_ascii=False, indent=2),
    encoding="utf-8",
)

print(f"Exported {len(records)} indexed reviews to {output}")
