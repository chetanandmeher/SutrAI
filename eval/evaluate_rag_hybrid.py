
import json
from pathlib import Path

from rag.search import search, hybrid_search

K = 5

OUTPUT_PATH = Path("eval/rag_results_hybrid.json")
POOL_PATH = Path("eval/rag_relevance_pool_labeled.json")
QUESTIONS_PATH = Path("eval/rag_questions.json")


def load_relevance_pool():
    pool = json.loads(POOL_PATH.read_text(encoding="utf-8"))

    relevance_by_query = {}

    for item in pool:
        chunk_id = int(item["chunk_id"])

        for query_id, relevance in item.get("relevance", {}).items():
            relevance_by_query.setdefault(query_id, {})[chunk_id] = int(
                relevance
            )

    return relevance_by_query


def evaluate_question(question, relevance_by_query):
    query_id = question["id"]
    retrieved = hybrid_search(question["question"], k=K)

    judged_relevance = relevance_by_query.get(query_id, {})

    if not judged_relevance:
        raise ValueError(
            f"No relevance judgments found for {query_id}"
        )

    retrieved_results = []

    for row in retrieved:
        chunk_id = int(row[0])

        if chunk_id not in judged_relevance:
            raise ValueError(
                f"Retrieved chunk {chunk_id} for {query_id} "
                "has no relevance judgment. Rebuild the pool "
                "or label the missing result."
            )

        metadata = row[3] or {}
        relevant = judged_relevance[chunk_id] == 1

        retrieved_results.append({
            "chunk_id": chunk_id,
            "document_name": row[1],
            "text": row[2],
            "metadata": metadata,
            "rrf_score": float(row[4]),
            "relevant": relevant,
        })

    hits = [item["relevant"] for item in retrieved_results]

    precision = (
        sum(hits) / len(hits)
        if hits else 0.0
    )

    total_relevant_in_pool = sum(
        1 for value in judged_relevance.values() if value == 1
    )

    retrieved_relevant = sum(hits)

    pooled_recall = (
        retrieved_relevant / total_relevant_in_pool
        if total_relevant_in_pool else 0.0
    )

    reciprocal_rank = next(
        (
            1 / (rank + 1)
            for rank, hit in enumerate(hits)
            if hit
        ),
        0.0,
    )

    return {
        "id": query_id,
        "question": question["question"],
        "precision_at_5": round(precision, 4),
        "pooled_recall_at_5": round(pooled_recall, 4),
        "mrr_at_5": round(reciprocal_rank, 4),
        "relevant_retrieved": retrieved_relevant,
        "relevant_in_judged_pool": total_relevant_in_pool,
        "retrieved": [
            {
                "chunk_id": item["chunk_id"],
                "review_id": item["metadata"].get("review_id"),
                "order_id": item["metadata"].get("order_id"),
                "rrf_score": round(item["rrf_score"], 4),
                "relevant": item["relevant"],
                "text": item["text"],
            }
            for item in retrieved_results
        ],
    }


def main():
    questions = json.loads(
        QUESTIONS_PATH.read_text(encoding="utf-8")
    )

    relevance_by_query = load_relevance_pool()

    results = [
        evaluate_question(question, relevance_by_query)
        for question in questions
    ]

    count = len(results)

    summary = {
        "total_questions": count,
        "precision_at_5": round(
            sum(r["precision_at_5"] for r in results) / count,
            4,
        ),
        "pooled_recall_at_5": round(
            sum(r["pooled_recall_at_5"] for r in results) / count,
            4,
        ),
        "mrr_at_5": round(
            sum(r["mrr_at_5"] for r in results) / count,
            4,
        ),
        "evaluation_note": (
            "Recall is measured against manually labeled relevant "
            "reviews in the judged top-20 retrieval pool, not the "
            "complete review corpus."
        ),
        "results": results,
    }

    OUTPUT_PATH.write_text(
        json.dumps(summary, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(json.dumps(
        {key: value for key, value in summary.items()
         if key != "results"},
        indent=2,
    ))

    print(f"\nDetailed results saved to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
