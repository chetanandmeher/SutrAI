
import json
from pathlib import Path

candidates_path = Path("eval/rag_candidates.json")
questions_path = Path("eval/rag_questions.json")

with candidates_path.open(encoding="utf-8") as f:
    candidates = json.load(f)

with questions_path.open(encoding="utf-8") as f:
    questions = json.load(f)

candidate_pairs = {
    (str(row["review_id"]), str(row["order_id"]))
    for row in candidates
}

labeled_pairs = {
    (str(review_id), str(order_id))
    for question in questions
    for review_id, order_id in question["relevant_reviews"]
}

missing_pairs = labeled_pairs - candidate_pairs

print(f"Candidate records: {len(candidates)}")
print(f"Unique candidate pairs: {len(candidate_pairs)}")
print(f"Evaluation questions: {len(questions)}")
print(f"Unique labeled pairs: {len(labeled_pairs)}")
print(f"Missing labeled pairs: {len(missing_pairs)}")

if missing_pairs:
    print("\nMissing pairs:")
    for review_id, order_id in sorted(missing_pairs):
        print(f"{review_id} | {order_id}")
else:
    print("\nAll relevance labels exist in the candidate export.")
