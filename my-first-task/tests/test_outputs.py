import json
import os

def test_outputs():
    assert os.path.exists("/app/report.json"), "report.json was not created"

    with open("/app/report.json") as f:
        data = json.load(f)

    assert "word_count" in data
    assert isinstance(data["word_count"], int)

