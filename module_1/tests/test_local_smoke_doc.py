"""Guard that the local smoke checklist doc stays present and accurate."""

from pathlib import Path

SMOKE_DOC = Path(__file__).resolve().parents[1] / "_docs" / "local_smoke.md"


def test_local_smoke_doc_exists_and_mentions_key_strings():
    assert SMOKE_DOC.is_file(), f"Missing smoke doc: {SMOKE_DOC}"
    text = SMOKE_DOC.read_text(encoding="utf-8")
    assert "module1_chores" in text
    assert "migrate" in text
    assert "/" in text
    assert "household/admin/" in text
    assert "household/create/" in text
    assert "household/join/" in text
    assert "member_id" in text
    assert "Temporary session stub" not in text
    assert "placeholder — #11" not in text
