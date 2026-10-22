"""Re-create and save the Model 1 classifiers used in the project notebook (Section 5) for the web API.

The notebook evaluated these models but did not save them. This script repeats the notebook's exact steps
(same group-aware split, preprocessing, tuned hyperparameters and seed 42), saves the fitted models to
models/model1_bundle.joblib, and checks that their test-set metrics equal the values in
reports/results/r2_test_results.csv. It refuses to save if any metric differs by more than 0.0005.

It needs the project repo (raw data and the notebook's results). Run from this api/ folder:
    python export_model1.py "F:\\IIIrd Year\\ANN\\diabetes-ann"
"""
import json
import sys
import time
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, brier_score_loss, recall_score, roc_auc_score
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.naive_bayes import GaussianNB
from sklearn.neighbors import KNeighborsClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.svm import SVC
from xgboost import XGBClassifier

HERE = Path(__file__).resolve().parent
if len(sys.argv) != 2:
    sys.exit('Usage: python export_model1.py "<path to the diabetes-ann project folder>"')
ROOT = Path(sys.argv[1])
SEED = 42
TARGET = "Diabetes_binary"
BINARY = ["HighBP", "HighChol", "CholCheck", "Smoker", "Stroke", "HeartDiseaseorAttack", "PhysActivity", "Fruits",
          "Veggies", "HvyAlcoholConsump", "AnyHealthcare", "NoDocbcCost", "DiffWalk", "Sex"]
CONTINUOUS = ["BMI", "MentHlth", "PhysHlth"]
ORDINAL = ["GenHlth", "Age", "Education", "Income"]
FEATURES = BINARY + CONTINUOUS + ORDINAL
BASE = ["Logistic Regression", "Random Forest", "XGBoost", "MLP (sklearn)", "KNN", "SVM (RBF)"]


def strat_sample(n, y, seed=SEED):
    idx = np.arange(len(y)); out = []
    for c in (0, 1):
        ci = idx[y == c]
        out.append(np.random.default_rng(seed).choice(ci, int(round(n * len(ci) / len(y))), replace=False))
    return np.sort(np.concatenate(out))


def main():
    t0 = time.time()
    df = pd.read_csv(ROOT / "data" / "raw" / "diabetes_binary_health_indicators_BRFSS2015.csv").astype(np.int64)
    groups = df.groupby(df.columns.tolist(), sort=False).ngroup().to_numpy()
    tr, te = next(StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=SEED).split(df, df[TARGET], groups))
    train, test = df.iloc[tr].reset_index(drop=True), df.iloc[te].reset_index(drop=True)
    fi, vi = next(StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=SEED).split(train, train[TARGET], groups[tr]))
    fit, val = train.iloc[fi].reset_index(drop=True), train.iloc[vi].reset_index(drop=True)

    # preprocessing identical to the notebook's Preprocessor (nn=False for Model 1)
    lo, hi = np.percentile(fit["BMI"], [1, 99])
    z = fit[FEATURES].astype(float).copy(); z["BMI"] = z["BMI"].clip(lo, hi)
    mu, sd = z[CONTINUOUS].mean(), z[CONTINUOUS].std(ddof=0)
    prep = {"bmi_clip": [float(lo), float(hi)], "mu": mu.to_dict(), "sd": sd.to_dict(), "features": FEATURES, "continuous": CONTINUOUS}

    def transform(d):
        x = d[FEATURES].astype(float).copy(); x["BMI"] = x["BMI"].clip(lo, hi)
        x[CONTINUOUS] = (x[CONTINUOUS] - mu) / sd
        return x.to_numpy()

    X_fit, X_val, X_te = transform(fit), transform(val), transform(test)
    y_fit, y_val, y_te = fit[TARGET].to_numpy(), val[TARGET].to_numpy(), test[TARGET].to_numpy()
    spw = float((y_fit == 0).sum() / (y_fit == 1).sum())
    s25 = strat_sample(25000, y_fit)

    summary = json.load(open(ROOT / "reports" / "results" / "r2_summary.json"))
    tuned = {k: eval(v[0]) for k, v in summary["tuning"].items()}  # dict literals written by the notebook
    spec = {
        "Logistic Regression": (LogisticRegression(max_iter=3000, class_weight="balanced", **tuned["Logistic Regression"]), None),
        "KNN": (KNeighborsClassifier(**tuned["KNN"]), s25),
        "SVM (RBF)": (SVC(kernel="rbf", C=1.0, gamma="scale", class_weight="balanced", random_state=SEED), s25),
        "Random Forest": (RandomForestClassifier(n_estimators=300, class_weight="balanced_subsample", random_state=SEED, n_jobs=2, **tuned["Random Forest"]), None),
        "XGBoost": (XGBClassifier(n_estimators=300, tree_method="hist", scale_pos_weight=spw, random_state=SEED, n_jobs=2, eval_metric="logloss", **tuned["XGBoost"]), None),
        "Gaussian NB": (GaussianNB(), None),
        "MLP (sklearn)": (MLPClassifier(hidden_layer_sizes=(64, 32), early_stopping=True, max_iter=60, random_state=SEED), None),
    }
    models, P_val, P_te = {}, {}, {}
    platt = None
    for name, (est, sub) in spec.items():
        t = time.time()
        Xs, ys = (X_fit, y_fit) if sub is None else (X_fit[sub], y_fit[sub])
        est.fit(Xs, ys)
        if name == "SVM (RBF)":
            sv, st = est.decision_function(X_val), est.decision_function(X_te)
            platt = LogisticRegression().fit(sv.reshape(-1, 1), y_val)
            P_val[name], P_te[name] = platt.predict_proba(sv.reshape(-1, 1))[:, 1], platt.predict_proba(st.reshape(-1, 1))[:, 1]
        else:
            P_val[name], P_te[name] = est.predict_proba(X_val)[:, 1], est.predict_proba(X_te)[:, 1]
        models[name] = est
        print(f"{name:20s} {time.time() - t:5.1f}s")
    meta = LogisticRegression(max_iter=2000).fit(np.column_stack([P_val[m] for m in BASE]), y_val)
    P_te["Stacking Ensemble"] = meta.predict_proba(np.column_stack([P_te[m] for m in BASE]))[:, 1]

    # verify against the notebook's saved results
    ref = pd.read_csv(ROOT / "reports" / "results" / "r2_test_results.csv", index_col=0)
    worst = 0.0
    for m in ["Logistic Regression", "KNN", "SVM (RBF)", "Random Forest", "XGBoost", "Gaussian NB", "MLP (sklearn)", "Stacking Ensemble"]:
        p, th = P_te[m], float(ref.loc[m, "Threshold"])
        got = {"ROC-AUC": roc_auc_score(y_te, p), "PR-AUC": average_precision_score(y_te, p), "Brier": brier_score_loss(y_te, p), "Recall": recall_score(y_te, p >= th)}
        diff = max(abs(got[k] - ref.loc[m, k]) for k in got)
        worst = max(worst, diff)
        print(f"{m:20s} ROC {got['ROC-AUC']:.4f} (report {ref.loc[m, 'ROC-AUC']:.4f})  max diff {diff:.5f}")
    if worst > 5e-4:
        sys.exit(f"Mismatch with the notebook results (max diff {worst:.5f}) - not saving.")

    bundle = {"preprocess": prep, "models": models, "svm_platt": platt, "meta": meta, "base_order": BASE,
              "thresholds": {m: float(ref.loc[m, "Threshold"]) for m in ref.index},
              "test_metrics": ref.round(4).to_dict("index"), "seed": SEED}
    out = HERE / "models" / "model1_bundle.joblib"
    joblib.dump(bundle, out, compress=3)
    print(f"Saved {out} ({out.stat().st_size / 1e6:.1f} MB) in {time.time() - t0:.0f}s; max metric diff {worst:.6f}")


if __name__ == "__main__":
    main()
