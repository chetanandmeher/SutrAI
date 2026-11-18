import json
from pathlib import Path

POOL_PATH = Path("eval/rag_pool_v2.json")
QUESTIONS_PATH = Path("eval/rag_questions.json")


def save(pool):
    POOL_PATH.write_text(
        json.dumps(pool, ensure_ascii=False, indent=2), encoding="utf-8"
    )


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
    print(f"{len(todo)} pairs to label. 1 = relevant, 0 = not, s = skip, q = quit")

    for n, (item, qid) in enumerate(todo, 1):
        print(f"\n[{n}/{len(todo)}] {qid}: {questions[qid]}")
        print(f"REVIEW: {item['text']}")
        while True:
            ans = input("label (1/0/s/q): ").strip().lower()
            if ans in {"1", "0"}:
                item["relevance"][qid] = int(ans)
                save(pool)
                break
            if ans == "s":
                break
            if ans == "q":
                save(pool)
                return
    print("done")


if __name__ == "__main__":
    main()