
import json
from pathlib import Path

from rag.search import search

K = 20

questions = json.loads(
    Path("eval/rag_questions.json").read_text(encoding="utf-8")
)

pool = {}

for question in questions:
    results = search(question["question"], k=K)

    for row in results:
        chunk_id, document_name, text, metadata, similarity = row

        if chunk_id not in pool:
            pool[chunk_id] = {
                "chunk_id": chunk_id,
                "review_id": metadata.get("review_id"),
                "order_id": metadata.get("order_id"),
                "review_score": metadata.get("review_score"),
                "text": text,
                "similarity": float(similarity),
                "retrieved_for": [],
                "relevance": {}
            }

        pool[chunk_id]["retrieved_for"].append(question["id"])

records = list(pool.values())

output = Path("eval/rag_relevance_pool.json")
output.write_text(
    json.dumps(records, ensure_ascii=False, indent=2),
    encoding="utf-8",
)

print(f"Questions evaluated: {len(questions)}")
print(f"Unique retrieved reviews: {len(records)}")
print(f"Output: {output}")
