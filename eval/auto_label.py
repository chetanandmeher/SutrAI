import json
import re
from pathlib import Path

from llm.client import chat

POOL_PATH = Path("eval/rag_pool_v2.json")
QUESTIONS_PATH = Path("eval/rag_questions.json")

SYSTEM = """You judge search results for an e-commerce review search system.
Reviews are in Portuguese. Given a question and ONE review, answer 1 if the
review itself reports the problem the question asks about, otherwise 0.

Rules:
- Judge only this review's content.
- Praise, off-topic text, or a different problem = 0.
- Be strict: if the link to the question is loose or unclear = 0.

Return only JSON: {"relevant": 0} or {"relevant": 1}"""


def judge(question: str, review: str) -> int:
    out = chat(
        [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": f"Question: {question}\n\nReview: {review}"},
        ]
    )
    match = re.search(r"\{.*?\}", out["content"], re.DOTALL)
    value = int(json.loads(match.group(0))["relevant"])
    if value not in (0, 1):
        raise ValueError(f"bad label: {value}")
    return value


def main():
    questions = {
        q["id"]: q["question"]
        for q in json.loads(QUESTIONS_PATH.read_text(encoding="utf-8"))
    }
    pool = json.loads(POOL_PATH.read_text(encoding="utf-8"))

    todo = [
        (item, qid)
        for item in pool
        for qid in item["retrieved_for"]
        if qid not in item["relevance"]
    ]
    print(f"{len(todo)} pairs to judge")

    failed = 0
    for n, (item, qid) in enumerate(todo, 1):
        try:
            item["relevance"][qid] = judge(questions[qid], item["text"])
            item.setdefault("label_source", {})[qid] = "llm"
        except Exception as e:
            failed += 1
            print(f"  skipped {qid} chunk {item['chunk_id']}: {e}")
        if n % 10 == 0:
            POOL_PATH.write_text(
                json.dumps(pool, ensure_ascii=False, indent=2), encoding="utf-8"
            )
            print(f"  {n}/{len(todo)}")

    POOL_PATH.write_text(
        json.dumps(pool, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"done | failed: {failed}")


if __name__ == "__main__":
    main()