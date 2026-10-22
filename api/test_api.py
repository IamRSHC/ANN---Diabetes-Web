"""API checks: both model families respond, validation rejects bad input, and the reference profiles match the app."""
from __future__ import annotations

from pathlib import Path

import pytest

import sys

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
pytest.importorskip("fastapi")
if not (ROOT / "models" / "model1_bundle.joblib").exists():
    pytest.skip("models/model1_bundle.joblib missing - run export_model1.py", allow_module_level=True)
from fastapi.testclient import TestClient  # noqa: E402

from main import app  # noqa: E402

client = TestClient(app)
DEFAULT = {"HighBP": 0, "HighChol": 0, "CholCheck": 1, "Smoker": 0, "Stroke": 0, "HeartDiseaseorAttack": 0, "PhysActivity": 1,
           "Fruits": 1, "Veggies": 1, "HvyAlcoholConsump": 0, "AnyHealthcare": 1, "NoDocbcCost": 0, "DiffWalk": 0, "Sex": 0,
           "BMI": 75 / 1.7 ** 2, "MentHlth": 0, "PhysHlth": 0, "GenHlth": 3, "Age": 7, "Education": 5, "Income": 6}


def score(**changes):
    r = client.post("/predict", json=dict(DEFAULT, **changes))
    assert r.status_code == 200, r.text
    return r.json()


@pytest.mark.parametrize("changes, risk, decision", [
    ({}, 0.045, "lower"),
    ({"Sex": 1, "HighChol": 1}, 0.116, "refer"),
    ({"BMI": 105 / 1.7 ** 2, "HighBP": 1, "HighChol": 1, "DiffWalk": 1}, 0.411, "higher"),
])
def test_reference_profiles_match_the_app(changes, risk, decision):
    ann = score(**changes)["ann"]
    assert ann["risk"] == pytest.approx(risk, abs=0.0006)
    assert ann["decision"] == decision
    assert len(ann["passes"]) == 50


def test_all_nine_models_are_returned():
    out = score(HighBP=1, HighChol=1)
    names = [m["name"] for m in out["models"]]
    assert names[0] == "Proposed ANN" and "XGBoost" in names and "Stacking Ensemble" in names and len(names) == 9
    for m in out["models"]:
        assert 0 <= m["risk"] <= 1
        if m["family"] == "Model 1":
            assert m["decision"] == ("higher" if m["risk"] >= m["threshold"] else "lower")


def test_invalid_input_is_rejected():
    assert client.post("/predict", json=dict(DEFAULT, BMI=300)).status_code == 422
    assert client.post("/predict", json=dict(DEFAULT, Age=14)).status_code == 422
    assert client.post("/predict", json={"BMI": 25}).status_code == 422


def test_meta_has_all_results():
    m = client.get("/meta").json()
    assert len(m["results"]) == 9 and m["ann"]["mc_passes"] == 50
