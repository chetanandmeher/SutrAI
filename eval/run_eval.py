
import json
from decimal import Decimal, InvalidOperation
from pathlib import Path
from time import perf_counter

from agents.sql_agent import answer_sql
from datetime import date, datetime


QUESTIONS_PATH = Path("eval/questions.json")
RESULTS_PATH = Path("eval/results.json")


def normalize_value(value):
    """Normalize numeric values and strings for comparison."""

    if value is None:
        return ("null", "")

    if isinstance(value, (datetime, date)):
        return ("date", value.date().isoformat()
                if isinstance(value, datetime)
                else value.isoformat())

    try:
        number = Decimal(str(value))
        if number.is_finite():
            return ("number", str(number.normalize()))
    except (InvalidOperation, ValueError):
        pass

    # Normalize date strings from JSON ground truth.
    if isinstance(value, str):
        try:
            parsed = date.fromisoformat(value)
            return ("date", parsed.isoformat())
        except ValueError:
            pass

    return ("text", str(value).strip())

def normalize_rows(rows):
    """Ignore row ordering while preserving duplicate rows."""

    normalized = [
        tuple(normalize_value(value) for value in row)
        for row in rows
    ]

    return sorted(normalized)


def evaluate_question(question):
    question_id = question["id"]
    query = question["question"]
    expected = question["reference_result"]["rows"]

    start = perf_counter()

    try:
        actual_result = answer_sql(query)
        latency_ms = (perf_counter() - start) * 1000

        if actual_result.get("error"):
            return {
                "id": question_id,
                "question": query,
                "passed": False,
                "error": actual_result["error"],
                "latency_ms": round(latency_ms, 2),
            }

        actual = actual_result["rows"]

        passed = (
            normalize_rows(actual)
            == normalize_rows(expected)
        )

        return {
            "id": question_id,
            "question": query,
            "passed": passed,
            "expected_rows": len(expected),
            "actual_rows": len(actual),
            "latency_ms": round(latency_ms, 2),
            "attempts": actual_result.get("attempts", 0),
            "prompt_tokens": actual_result.get("prompt_tokens", 0),
            "completion_tokens": actual_result.get("completion_tokens", 0),
            "sql": actual_result.get("sql"),
            "error": None,
        }

    except Exception as exc:
        latency_ms = (perf_counter() - start) * 1000

        return {
            "id": question_id,
            "question": query,
            "passed": False,
            "error": str(exc),
            "latency_ms": round(latency_ms, 2),
        }


def run_evaluation():
    with QUESTIONS_PATH.open("r", encoding="utf-8") as file:
        questions = json.load(file)

    results = []

    print("\nStarting SQL Agent Evaluation\n")

    for question in questions:
        print(f"Running {question['id']}...")

        result = evaluate_question(question)
        results.append(result)

        status = "PASS" if result["passed"] else "FAIL"
        print(f"{status} | {result['id']} | {result['latency_ms']} ms")

        if result.get("error"):
            print("Error:", result["error"])

    total = len(results)
    passed = sum(result["passed"] for result in results)

    accuracy = (passed / total * 100) if total else 0

    successful = [
        result for result in results
        if result["passed"]
    ]

    average_latency = (
        sum(r["latency_ms"] for r in results) / total
        if total else 0
    )

    total_tokens = sum(
        r.get("prompt_tokens", 0) + r.get("completion_tokens", 0)
        for r in results
    )

    report = {
        "total_questions": total,
        "passed": passed,
        "failed": total - passed,
        "accuracy_percent": round(accuracy, 2),
        "average_latency_ms": round(average_latency, 2),
        "total_tokens": total_tokens,
        "results": results,
    }

    RESULTS_PATH.parent.mkdir(parents=True, exist_ok=True)

    with RESULTS_PATH.open("w", encoding="utf-8") as file:
        json.dump(report, file, indent=2, ensure_ascii=False)

    print("\n========== EVALUATION SUMMARY ==========")
    print(f"Total questions : {total}")
    print(f"Passed          : {passed}")
    print(f"Failed          : {total - passed}")
    print(f"Accuracy        : {accuracy:.2f}%")
    print(f"Average latency : {average_latency:.2f} ms")
    print(f"Total tokens    : {total_tokens}")
    print(f"Report saved    : {RESULTS_PATH}")


if __name__ == "__main__":
    run_evaluation()
