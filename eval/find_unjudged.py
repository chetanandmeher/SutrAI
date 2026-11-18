
import json
from pathlib import Path

from rag.search import hybrid_search

K = 5

QUESTIONS_PATH = Path("eval/rag_questions.json")
POOL_PATH = Path("eval/rag_relevance_pool_labeled.json")
OUTPUT_PATH = Path("eval/unjudged_reviews.json")


def main():
    questions = json.loads(
        QUESTIONS_PATH.read_text(encoding="utf-8")
    )

    pool = json.loads(
        POOL_PATH.read_text(encoding="utf-8")
    )

    relevance_by_query = {}

    for item in pool:
        chunk_id = int(item["chunk_id"])

        for query_id, relevance in item.get("relevance", {}).items():
            relevance_by_query.setdefault(
                query_id, {}
            )[chunk_id] = int(relevance)

    missing = {}

    for question in questions:
        query_id = question["id"]
        judged = relevance_by_query.get(query_id, {})

        print(f"Checking {query_id}...")

        results = hybrid_search(
            question["question"],
            k=K
        )

        for row in results:
            chunk_id = int(row[0])

            if chunk_id in judged:
                continue

            if chunk_id not in missing:
                missing[chunk_id] = {
                    "chunk_id": chunk_id,
                    "document_name": row[1],
                    "text": row[2],
                    "metadata": row[3] or {},
                    "retrieved_for": [],
                }

            if query_id not in missing[chunk_id]["retrieved_for"]:
                missing[chunk_id]["retrieved_for"].append(query_id)

    output = list(missing.values())

    OUTPUT_PATH.write_text(
        json.dumps(output, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    print("\n========== SUMMARY ==========")
    print(f"Questions checked: {len(questions)}")
    print(f"Unique unjudged chunks: {len(output)}")
    print(f"Output: {OUTPUT_PATH}")

    for item in output:
        print("\n-----------------------------")
        print(f"Chunk ID: {item['chunk_id']}")
        print(f"Retrieved for: {', '.join(item['retrieved_for'])}")
        print(f"Metadata: {item['metadata']}")
        print(f"Review: {item['text']}")


if __name__ == "__main__":
    main()
