
from time import perf_counter

from agents.planner import make_plan
from agents.sql_agent import answer_sql
from agents.rag_agent import answer_rag
from agents.synthesizer import synthesize_answer
from agents.validator import validate_answer


def execute_plan(question: str) -> dict:
    start_time = perf_counter()

    # 1. Planning
    plan_result = make_plan(question)
    plan = plan_result["plan"]

    step_results = []

    prompt_tokens = plan_result["prompt_tokens"]
    completion_tokens = plan_result["completion_tokens"]

    # 2. Agent execution
    for step in plan["steps"]:
        agent = step["agent"]
        task = step["task"]

        if agent == "sql":
            result = answer_sql(task)

            prompt_tokens += result.get("prompt_tokens", 0)
            completion_tokens += result.get("completion_tokens", 0)

            if result.get("error"):
                raise RuntimeError(f"SQL Agent failed: {result['error']}")

        elif agent == "rag":
            result = answer_rag(task)

        else:
            raise ValueError(f"Unsupported agent: {agent}")

        step_results.append({
            "step_id": step["id"],
            "agent": agent,
            "task": task,
            "result": result,
        })

    # 3. Answer synthesis
    synthesis = synthesize_answer(question, step_results)

    prompt_tokens += synthesis["prompt_tokens"]
    completion_tokens += synthesis["completion_tokens"]

    # 4. Grounding validation
    validation = validate_answer(
        question,
        synthesis["answer"],
        step_results,
    )

    prompt_tokens += validation["prompt_tokens"]
    completion_tokens += validation["completion_tokens"]

    latency_ms = (perf_counter() - start_time) * 1000

    # 5. Final response
    return {
        "question": question,
        "answer": synthesis["answer"],
        "is_grounded": validation["is_grounded"],
        "validation": {
            "unsupported_claims": validation["unsupported_claims"],
            "reason": validation["reason"],
        },
        "plan": plan,
        "steps": step_results,
        "metrics": {
            "latency_ms": round(latency_ms, 2),
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": prompt_tokens + completion_tokens,
        },
    }
