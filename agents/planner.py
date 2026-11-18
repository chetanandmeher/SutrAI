import json
import re
import sys
from typing import Literal

from pydantic import BaseModel, Field

from llm.client import chat


class Step(BaseModel):
    id: int
    agent: Literal["sql", "rag"]
    task: str = Field(min_length=3)


class Plan(BaseModel):
    steps: list[Step] = Field(min_length=1, max_length=4)


SYSTEM_PROMPT = """You are a planner for an e-commerce analytics assistant (Olist data, 2016-2018).
Split the user's question into 1 to 4 steps. Each step uses exactly one agent:

- "sql": numbers from the orders database: counts, revenue, order status, delivery times,
  review scores, grouped by state, category, seller, or month.
- "rag": semantic search over Portuguese customer reviews.

RAG task formulation rules:
- Generate short, keyword-rich search queries.
- Focus on the actual subject, complaint, or topic.
- Avoid instructions such as "identify and list".
- Avoid unnecessary phrases such as "most common complaints customers mention".
- Preserve important concepts such as late delivery, damaged products,
  refunds, cancellations, and seller communication.
- Example:
  Bad: "Identify and list the most common complaints customers mention
  regarding late deliveries."
  Good: "Customer complaints about late delivery and delayed shipping."

Rules:
- "How many / which / total / trend" questions -> sql.
- "What do customers say / complain about / why unhappy" questions -> rag.
- "Why did X increase / drop" questions -> usually both: sql for the numbers, rag for the reasons.
- Each task must be a self-contained question for that agent. Do not refer to other steps.
- Do not add steps that are not needed.

Return ONLY JSON, no markdown:
{"steps": [{"id": 1, "agent": "sql", "task": "..."}]}
"""


def parse_plan(text: str) -> Plan:
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError("no JSON object found")
    return Plan.model_validate(json.loads(match.group(0)))


def make_plan(question: str, max_attempts: int = 2) -> dict:
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": question},
    ]
    prompt_tokens = completion_tokens = 0
    last_error = None

    for attempt in range(1, max_attempts + 1):
        out = chat(messages)
        prompt_tokens += out["prompt_tokens"]
        completion_tokens += out["completion_tokens"]
        try:
            plan = parse_plan(out["content"])
            return {
                "question": question,
                "plan": plan.model_dump(),
                "attempts": attempt,
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
            }
        except ValueError as e:
            last_error = str(e)
            messages += [
                {"role": "assistant", "content": out["content"]},
                {"role": "user", "content": f"Invalid plan: {last_error}\nReturn corrected JSON only."},
            ]

    raise ValueError(f"planner failed after {max_attempts} attempts: {last_error}")


if __name__ == "__main__":
    q = " ".join(sys.argv[1:]) or "Why did order cancellations increase?"
    out = make_plan(q)
    print("attempts:", out["attempts"], "| tokens:", out["prompt_tokens"], "+", out["completion_tokens"])
    for s in out["plan"]["steps"]:
        print(f'{s["id"]}. [{s["agent"]}] {s["task"]}')