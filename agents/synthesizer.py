
import json

from llm.client import chat


SYSTEM_PROMPT = """
You are SutrAI, an AI analyst for e-commerce operations.

Answer the user's business question using only the evidence provided.

Rules:
1. Never invent numbers, facts, or customer opinions.
2. Use SQL results as the source of truth for numerical claims.
3. Use retrieved reviews as qualitative evidence.
4. Clearly distinguish measured facts from possible explanations.
5. If evidence is insufficient, explicitly say so.
6. Do not claim correlation implies causation.
7. Keep the answer concise and business-focused.
8. Do not expose SQL queries unless specifically requested.

Return a clear natural-language answer.
"""


def synthesize_answer(question: str, step_results: list) -> dict:
    evidence = []

    for step in step_results:
        evidence.append({
            "agent": step["agent"],
            "task": step["task"],
            "result": step["result"],
        })

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"Business question:\n{question}\n\n"
                f"Available evidence:\n"
                f"{json.dumps(evidence, default=str, ensure_ascii=False)}"
            ),
        },
    ]

    out = chat(messages)

    return {
        "answer": out["content"],
        "prompt_tokens": out["prompt_tokens"],
        "completion_tokens": out["completion_tokens"],
    }
