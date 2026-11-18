import json
from pathlib import Path

from rag.search import hybrid_search, search

K_POOL = 20
QUESTIONS_PATH = Path("eval/rag_questions.json")
OLD_POOL_PATH = Path("eval/rag_relevance_pool_labeled.json")
NEW_POOL_PATH = Path("eval/rag_pool_v2.json")


def main():
    questions = json.loads(QUESTIONS_PATH.read_text(encoding="utf-8"))

    pool = {}
    if OLD_POOL_PATH.exists():
        for item in json.loads(OLD_POOL_PATH.read_text(encoding="utf-8")):
            pool[int(item["chunk_id"])] = item

    for q in questions:
        found = {}
        for row in search(q["question"], k=K_POOL):
            found[int(row[0])] = row
        for row in hybrid_search(q["question"], k=K_POOL, candidate_k=K_POOL):
            found.setdefault(int(row[0]), row)

        for chunk_id, row in found.items():
            item = pool.setdefault(
                chunk_id,
                {
                    "chunk_id": chunk_id,
                    "text": row[2],
                    "metadata": row[3],
                    "retrieved_for": [],
                    "relevance": {},
                },
            )
            item.setdefault("retrieved_for", [])
            item.setdefault("relevance", {})
            if q["id"] not in item["retrieved_for"]:
                item["retrieved_for"].append(q["id"])

    unlabeled = sum(
        1
        for item in pool.values()
        for qid in item["retrieved_for"]
        if qid not in item["relevance"]
    )
    NEW_POOL_PATH.write_text(
        json.dumps(list(pool.values()), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"chunks in pool: {len(pool)} | pairs still unlabeled: {unlabeled}")


if __name__ == "__main__":
    main()