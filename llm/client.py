import os
import time

from dotenv import load_dotenv
from groq import APIConnectionError, Groq, InternalServerError, RateLimitError

load_dotenv()

MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
_client = None


def _get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=os.environ["GROQ_API_KEY"])
    return _client


def chat(messages: list[dict], temperature: float = 0.0, max_retries: int = 3) -> dict:
    for attempt in range(max_retries):
        try:
            resp = _get_client().chat.completions.create(
                model=MODEL,
                messages=messages,
                temperature=temperature,
            )
            return {
                "content": resp.choices[0].message.content,
                "prompt_tokens": resp.usage.prompt_tokens,
                "completion_tokens": resp.usage.completion_tokens,
            }
        except (RateLimitError, APIConnectionError, InternalServerError):
            if attempt == max_retries - 1:
                raise
            time.sleep(2**attempt)