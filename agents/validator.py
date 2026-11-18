
import json
import re

from pydantic import BaseModel, Field

from llm.client import chat


class ValidationResult(BaseModel):
    is_grounded: bool
    unsupported_claims: list[str] = Field(default_factory=list)
    reason: str


SYSTEM_PROMPT = """
You are a factual grounding validator for SutrAI.

Compare the proposed answer against the supplied evidence.

Rules:
1. SQL results are authoritative for numerical claims.
2. Customer review evidence supports qualitative claims only.
3. Do not accept claims that are not supported by the evidence.
4. Do not treat correlation as proof of causation.
5. If any material factual claim is unsupported, set is_grounded to false.
6. If all material claims are supported, set is_grounded to true.

Return ONLY valid JSON in this format:
{
    "is_grounded": true,
    "unsupported_claims": [],
    "reason": "All claims are supported by the evidence."
}
"""


def validate_answer(question: str, answer: str, step_results: list) -> dict:
    evidence = [
        {
            "agent": step["agent"],
            "task": step["task"],
            "result": step["result"],
        }
        for step in step_results
    ]

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"Question:\n{question}\n\n"
                f"Answer:\n{answer}\n\n"
                f"Evidence:\n{json.dumps(evidence, default=str, ensure_ascii=False)}"
            ),
        },
    ]

    out = chat(messages)

    match = re.search(r"\{.*\}", out["content"], re.DOTALL)

    if not match:
        raise ValueError("Validator did not return valid JSON")

    result = ValidationResult.model_validate(
        json.loads(match.group(0))
    )

    return {
        **result.model_dump(),
        "prompt_tokens": out["prompt_tokens"],
        "completion_tokens": out["completion_tokens"],
    }
