import json
import random
import statistics
import time
from pathlib import Path

from rag.search import search, hybrid_search, _get_model

QUESTIONS_PATH = Path("eval/rag_questions.json")
OUTPUT_PATH = Path("eval/rag_latency_results.json")

K = 5
WARMUP_RUNS = 30
MEASURED_RUNS = 100


def benchmark_search(search_fn, query):
    start = time.perf_counter()
    search_fn(query, k=K)
    return (time.perf_counter() - start) * 1000


def percentile(times, p):
    return statistics.quantiles(
        times, n=100, method="inclusive"
    )[p - 1]


def summarize(times):
    return {
        "runs": len(times),
        "mean_ms": round(statistics.mean(times), 2),
        "median_ms": round(statistics.median(times), 2),
        "p95_ms": round(percentile(times, 95), 2),
        "p99_ms": round(percentile(times, 99), 2),
        "std_dev_ms": round(statistics.stdev(times), 2),
        "min_ms": round(min(times), 2),
        "max_ms": round(max(times), 2),
    }


def main():
    questions = json.loads(
        QUESTIONS_PATH.read_text(encoding="utf-8")
    )

    # Load embedding model before measuring.
    _get_model()

    methods = {
        "vector": search,
        "hybrid": hybrid_search,
    }

    results = []
    all_times = {
        "vector": [],
        "hybrid": [],
    }

    for question in questions:
        query = question["question"]
        question_id = question["id"]

        print(f"\nBenchmarking {question_id}...")

        # Randomize warm-up order.
        warmup_schedule = [
            method
            for method in methods
            for _ in range(WARMUP_RUNS)
        ]
        random.shuffle(warmup_schedule)

        for method in warmup_schedule:
            methods[method](query, k=K)

        question_times = {
            "vector": [],
            "hybrid": [],
        }

        # Randomize execution order for every measured run.
        for run in range(MEASURED_RUNS):
            schedule = list(methods.keys())
            random.shuffle(schedule)

            for method in schedule:
                elapsed = benchmark_search(methods[method], query)
                question_times[method].append(elapsed)
                all_times[method].append(elapsed)

        results.append({
            "id": question_id,
            "vector": summarize(question_times["vector"]),
            "hybrid": summarize(question_times["hybrid"]),
        })

        print(
            f"  Vector mean: "
            f"{statistics.mean(question_times['vector']):.2f} ms"
        )
        print(
            f"  Hybrid mean: "
            f"{statistics.mean(question_times['hybrid']):.2f} ms"
        )

    output = {
        "total_questions": len(results),
        "warmup_runs_per_method_per_question": WARMUP_RUNS,
        "measured_runs_per_method_per_question": MEASURED_RUNS,
        "overall": {
            "vector": summarize(all_times["vector"]),
            "hybrid": summarize(all_times["hybrid"]),
        },
        "results": results,
    }

    OUTPUT_PATH.write_text(
        json.dumps(output, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    print("\n=== OVERALL RESULTS ===")
    print(json.dumps(output["overall"], indent=2))

    print(f"\nSaved results to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
