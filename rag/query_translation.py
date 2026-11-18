
from llm.client import chat


SYSTEM_PROMPT = """
You are a query translator for a Brazilian e-commerce review search system.

Translate the user's search query from English into natural Brazilian Portuguese.

Rules:
- Preserve the original meaning and intent.
- Preserve important entities and relationships.
- Use natural terms that customers might use in product reviews.
- Do not answer the question.
- Do not explain your translation.
- Return only the Portuguese translation.
"""


def translate_query(query: str) -> str:
    if not query or not query.strip():
        raise ValueError("Query cannot be empty")

    try:
        response = chat(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": query.strip()},
            ],
            temperature=0.0,
        )

        translated = response["content"].strip()

        if not translated:
            return query

        return translated

    except Exception:
        return query
