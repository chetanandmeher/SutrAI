import json
import random
from pathlib import Path

from llm.client import chat

POOL_PATH = Path("eval/rag_pool_v2.json")
QUESTIONS_PATH = Path("eval/rag_questions.json")
N = 10


def translate(text: str) -> str:
    out = chat(
        [
            {
                "role": "system",
                "content": "Translate this Portuguese customer review to English. "
                "Return only the translation.",
            },
            {"role": "user", "content": text},
        ]
    )
    return out["content"].strip()


def main():
    questions = {
        q["id"]: q["question"]
        for q in json.loads(QUESTIONS_PATH.read_text(encoding="utf-8"))
    }
    pool = json.loads(POOL_PATH.read_text(encoding="utf-8"))

    llm_pairs = [
        (item, qid)
        for item in pool
        for qid, src in item.get("label_source", {}).items()
        if src == "llm"
    ]
    random.Random(42).shuffle(llm_pairs)

    agree = checked = 0
    for item, qid in llm_pairs[:N]:
        print(f"\nQUESTION: {questions[qid]}")
        print(f"REVIEW (English): {translate(item['text'])}")
        while True:
            ans = input("your label (1/0): ").strip()
            if ans in {"0", "1"}:
                break
        checked += 1
        if int(ans) == item["relevance"][qid]:
            agree += 1
        else:
            item["relevance"][qid] = int(ans)
            item["label_source"][qid] = "human"

    POOL_PATH.write_text(
        json.dumps(pool, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"\nagreement: {agree}/{checked}")


if __name__ == "__main__":
    main()