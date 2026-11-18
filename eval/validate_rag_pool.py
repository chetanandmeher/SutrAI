
import json
from pathlib import Path
from collections import Counter

POOL_PATH = Path("eval/rag_relevance_pool_labeled.json")
QUESTIONS_PATH = Path("eval/rag_questions.json")


def load_json(path):
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def main():
    pool = load_json(POOL_PATH)
    questions = load_json(QUESTIONS_PATH)

    # Collect valid question IDs.
    question_ids = {
        str(q.get("id", q.get("question_id")))
        for q in questions
        if q.get("id") is not None or q.get("question_id") is not None
    }

    errors = []
    warnings = []

    chunk_ids = []
    total_labels = 0
    relevant_labels = 0
    nonrelevant_labels = 0

    for index, record in enumerate(pool):
        location = f"Pool record {index + 1}"

        # Required record fields.
        for field in ("chunk_id", "review_id", "order_id"):
            if record.get(field) is None:
                errors.append(f"{location}: missing {field}")

        if record.get("chunk_id") is not None:
            chunk_ids.append(record["chunk_id"])

        retrieved_for = record.get("retrieved_for", [])
        relevance = record.get("relevance", {})

        if not isinstance(retrieved_for, list):
            errors.append(f"{location}: retrieved_for must be a list")
            continue

        if not isinstance(relevance, dict):
            errors.append(f"{location}: relevance must be an object")
            continue

        # Every retrieved question must have a judgment.
        for question_id in retrieved_for:
            question_id = str(question_id)

            if question_id not in question_ids:
                errors.append(
                    f"{location}: unknown question ID {question_id}"
                )

            if question_id not in relevance:
                errors.append(
                    f"{location}: missing relevance judgment for {question_id}"
                )

        # Every judgment must reference a known question and be binary.
        for question_id, label in relevance.items():
            question_id = str(question_id)
            total_labels += 1

            if question_id not in question_ids:
                errors.append(
                    f"{location}: judgment references unknown question {question_id}"
                )

            if label not in (0, 1):
                errors.append(
                    f"{location}: invalid relevance value {label} for {question_id}"
                )
            elif label == 1:
                relevant_labels += 1
            else:
                nonrelevant_labels += 1

            if question_id not in retrieved_for:
                warnings.append(
                    f"{location}: judgment for {question_id} "
                    "is not listed in retrieved_for"
                )

    # Check duplicate chunk IDs.
    duplicate_chunks = [
        chunk_id
        for chunk_id, count in Counter(chunk_ids).items()
        if count > 1
    ]

    if duplicate_chunks:
        errors.append(f"Duplicate chunk IDs: {duplicate_chunks}")

    print("\nRAG RELEVANCE POOL VALIDATION")
    print("-" * 40)
    print(f"Pool records: {len(pool)}")
    print(f"Unique chunk IDs: {len(set(chunk_ids))}")
    print(f"Evaluation questions: {len(question_ids)}")
    print(f"Total relevance judgments: {total_labels}")
    print(f"Relevant judgments (1): {relevant_labels}")
    print(f"Non-relevant judgments (0): {nonrelevant_labels}")
    print(f"Errors: {len(errors)}")
    print(f"Warnings: {len(warnings)}")

    if errors:
        print("\nERRORS:")
        for error in errors:
            print(f"- {error}")

    if warnings:
        print("\nWARNINGS:")
        for warning in warnings:
            print(f"- {warning}")

    if errors:
        print("\nVALIDATION FAILED")
        raise SystemExit(1)

    print("\nVALIDATION PASSED")


if __name__ == "__main__":
    main()
