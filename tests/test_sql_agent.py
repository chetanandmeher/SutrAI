from agents.sql_agent import extract_sql


def test_extract_plain():
    assert extract_sql("SELECT 1;") == "SELECT 1"


def test_extract_fenced():
    assert extract_sql("```sql\nSELECT 1;\n```") == "SELECT 1"