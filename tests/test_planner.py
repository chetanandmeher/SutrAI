import pytest

from agents.planner import parse_plan


def test_valid_plan():
    p = parse_plan('{"steps":[{"id":1,"agent":"sql","task":"count canceled orders"}]}')
    assert p.steps[0].agent == "sql"


def test_fenced_json():
    p = parse_plan(
        '```json\n{"steps":[{"id":1,"agent":"rag","task":"late delivery complaints"}]}\n```'
    )
    assert p.steps[0].agent == "rag"


@pytest.mark.parametrize(
    "text",
    [
        "not json",
        '{"steps":[]}',
        '{"steps":[{"id":1,"agent":"web","task":"search the web"}]}',
    ],
)
def test_invalid_plan_rejected(text):
    with pytest.raises(ValueError):
        parse_plan(text)