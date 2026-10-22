"""FastAPI backend: serves Model 2 (NumPy ANN with MC dropout + calibration) and Model 1 (7 classifiers + stacking).

Run locally from this api/ folder:
    uvicorn main:app --reload --port 8000
Endpoints:
    GET  /health   - liveness check
    GET  /meta     - test-set metrics and model settings for the dashboard pages
    POST /predict  - score one respondent with every model
"""
import json
import os
import sys
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from model import decision_margin, load_model, mc_risk, preprocess  # noqa: E402  (same code as app/model.py in the project repo)

ANN_CFG, ANN_PARAMS = load_model(ROOT / "models")
M1 = joblib.load(ROOT / "models" / "model1_bundle.joblib")
RES_DIR = ROOT / "results"
RESULTS = pd.read_csv(RES_DIR / "r2_test_results.csv", index_col=0)

LABELS = {
    "HighBP": "High blood pressure", "HighChol": "High cholesterol", "CholCheck": "Cholesterol check (5 yrs)", "Smoker": "Smoker",
    "Stroke": "Previous stroke", "HeartDiseaseorAttack": "Heart disease", "PhysActivity": "Physical activity", "Fruits": "Daily fruit",
    "Veggies": "Daily vegetables", "HvyAlcoholConsump": "Heavy drinking", "AnyHealthcare": "Health coverage", "NoDocbcCost": "Skipped doctor (cost)",
    "DiffWalk": "Difficulty walking", "Sex": "Sex", "BMI": "BMI", "MentHlth": "Poor mental-health days", "PhysHlth": "Poor physical-health days",
    "GenHlth": "General health", "Age": "Age band", "Education": "Education", "Income": "Income",
}
# Healthiest answer for each modifiable factor. Smoking and alcohol are left out on purpose: in this survey their
# learned effect is not causal (see the report), so showing them as "risk drivers" would mislead.
HEALTHY = {"BMI": 23, "MentHlth": 0, "PhysHlth": 0, "GenHlth": 1, "HighBP": 0, "HighChol": 0, "Stroke": 0,
           "HeartDiseaseorAttack": 0, "PhysActivity": 1, "Fruits": 1, "Veggies": 1, "DiffWalk": 0, "NoDocbcCost": 0}
MODEL1_ORDER = ["XGBoost", "Stacking Ensemble", "Random Forest", "Logistic Regression", "MLP (sklearn)", "SVM (RBF)", "KNN", "Gaussian NB"]

Bin = Field(ge=0, le=1)


class Answers(BaseModel):
    HighBP: int = Bin
    HighChol: int = Bin
    CholCheck: int = Bin
    Smoker: int = Bin
    Stroke: int = Bin
    HeartDiseaseorAttack: int = Bin
    PhysActivity: int = Bin
    Fruits: int = Bin
    Veggies: int = Bin
    HvyAlcoholConsump: int = Bin
    AnyHealthcare: int = Bin
    NoDocbcCost: int = Bin
    DiffWalk: int = Bin
    Sex: int = Bin
    BMI: float = Field(ge=12, le=98, description="Body mass index; the survey range is 12-98")
    MentHlth: int = Field(ge=0, le=30)
    PhysHlth: int = Field(ge=0, le=30)
    GenHlth: int = Field(ge=1, le=5, description="1 = excellent ... 5 = poor")
    Age: int = Field(ge=1, le=13, description="13 five-year bands, 1 = 18-24 ... 13 = 80+")
    Education: int = Field(ge=1, le=6)
    Income: int = Field(ge=1, le=8)


def _row(a: Answers) -> dict:
    r = a.model_dump()
    r["BMI"] = round(r["BMI"])  # the survey records whole-number BMI, as does the Streamlit app
    return r


def _ann(row: dict) -> dict:
    x = preprocess(row, ANN_CFG)
    mu, sd = mc_risk(x, ANN_CFG, ANN_PARAMS)
    risk, unc = float(mu[0]), float(sd[0])
    # the 50 individual passes, for the uncertainty chart (same seed and order as mc_risk)
    rng, rate = np.random.default_rng(42), ANN_CFG["dropout"]
    W, b = ANN_PARAMS[0::2], ANN_PARAMS[1::2]
    passes = []
    for _ in range(ANN_CFG["mc_passes"]):
        h = x
        for k in range(len(W) - 1):
            h = np.maximum(h @ W[k] + b[k], 0)
            h = h * (rng.random(h.shape) >= rate) / (1 - rate)
        z = (h @ W[-1] + b[-1])[0, 0] / ANN_CFG["temperature"] + ANN_CFG.get("bias", 0.0)
        passes.append(float(1 / (1 + np.exp(-z))))
    margin = float(decision_margin(risk, unc, ANN_CFG))
    decision = "refer" if margin < ANN_CFG["tau"] else ("higher" if risk >= ANN_CFG["threshold"] else "lower")
    drivers = []
    for f, v in HEALTHY.items():
        if row[f] != v:
            alt = dict(row, **{f: v})
            delta = risk - float(mc_risk(preprocess(alt, ANN_CFG), ANN_CFG, ANN_PARAMS)[0][0])
            drivers.append({"feature": f, "label": LABELS[f], "delta": round(delta, 4)})
    drivers.sort(key=lambda d: -d["delta"])
    return {"risk": risk, "sigma": unc, "band": [max(0.0, risk - 2 * unc), min(1.0, risk + 2 * unc)], "margin": margin,
            "tau": ANN_CFG["tau"], "threshold": ANN_CFG["threshold"], "decision": decision, "passes": passes, "drivers": drivers}


def _model1(row: dict) -> list:
    p = M1["preprocess"]
    x = np.array([[float(row[f]) for f in p["features"]]])
    i = p["features"].index("BMI"); x[0, i] = min(max(x[0, i], p["bmi_clip"][0]), p["bmi_clip"][1])
    for f in p["continuous"]:
        j = p["features"].index(f); x[0, j] = (x[0, j] - p["mu"][f]) / p["sd"][f]
    probs = {}
    for name, est in M1["models"].items():
        if name == "SVM (RBF)":
            probs[name] = float(M1["svm_platt"].predict_proba(est.decision_function(x).reshape(-1, 1))[0, 1])
        else:
            probs[name] = float(est.predict_proba(x)[0, 1])
    probs["Stacking Ensemble"] = float(M1["meta"].predict_proba(np.array([[probs[m] for m in M1["base_order"]]]))[0, 1])
    out = []
    for name in MODEL1_ORDER:
        th = M1["thresholds"][name]
        out.append({"name": name, "family": "Model 1", "risk": probs[name], "threshold": th,
                    "decision": "higher" if probs[name] >= th else "lower",
                    "brier": float(RESULTS.loc[name, "Brier"]), "roc_auc": float(RESULTS.loc[name, "ROC-AUC"])})
    return out


app = FastAPI(title="Diabetes Risk Screening API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=os.environ.get("ALLOWED_ORIGINS", "*").split(","), allow_methods=["GET", "POST"], allow_headers=["*"])


@app.get("/health")
def health():
    return {"status": "ok", "models": ["Proposed ANN"] + MODEL1_ORDER}


@app.get("/meta")
def meta():
    def csv(name):
        f = RES_DIR / name
        if not f.exists():
            return []
        d = pd.read_csv(f)
        if d.columns[0].startswith("Unnamed"):
            d = d.rename(columns={d.columns[0]: "group"})
        return d.to_dict("records")
    return {
        "results": [{"model": m, **{k: float(v) for k, v in r.items()}} for m, r in RESULTS.iterrows()],
        "ablation": csv("r2_ablation.csv"),
        "uncertainty": csv("r2_uncertainty.csv"),
        "abstention_rules": csv("r2_abstention_rules.csv"),
        "bias": csv("r2_bias_audit.csv"),
        "shap_ann": [{"feature": k, "importance": float(v)} for k, v in pd.read_csv(RES_DIR / "r2_shap_ann_importance.csv", index_col=0).iloc[:, 0].items()],
        "ann": {k: ANN_CFG[k] for k in ("hidden", "dropout", "temperature", "bias", "threshold", "tau", "mc_passes", "focal_alpha", "focal_gamma")},
        "dataset": {"respondents": 253680, "features": 21, "prevalence": 0.1393, "test_size": 50736},
    }


@app.post("/predict")
def predict(a: Answers):
    row = _row(a)
    ann = _ann(row)
    m2 = {"name": "Proposed ANN", "family": "Model 2", "risk": ann["risk"], "threshold": ann["threshold"], "decision": ann["decision"],
          "brier": float(RESULTS.loc["Proposed ANN", "Brier"]), "roc_auc": float(RESULTS.loc["Proposed ANN", "ROC-AUC"])}
    return {"input": row, "ann": ann, "models": [m2] + _model1(row)}
