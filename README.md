# Diabetes Risk Screening - website and API

Web front end for the ANN course project (21CSE326T, SRMIST Tiruchirappalli) "Calibrated and Uncertainty-Aware
Diabetes Risk Prediction Using Artificial Neural Networks". Team: Hareecharan R S, V Shakthi Balan, Manoranjan U S.

The models were trained in the project notebook (separate `diabetes-ann` repository). This folder only serves them.

| Folder | What it is |
|---|---|
| `web/` | Vite + React + TypeScript site: landing page with the screening card, results (calibrated risk, ±2σ band, histogram of the 50 MC-dropout passes, drivers, what-if, all nine models), model performance, how it works, team. Light mode by default, dark mode by toggle. The proposed ANN runs in the browser and matches the Python model exactly. |
| `api/` | FastAPI backend serving both model families: `POST /predict`, `GET /meta`, `GET /health`. Self-contained: `model.py` (forward pass, same as the project's `app/model.py`), `models/` (ANN weights and config from the notebook, `model1_bundle.joblib`), `results/` (the notebook's test-set tables). |
| `api/export_model1.py` | Re-creates the Model 1 classifiers with the notebook's settings from the project repo and saves `api/models/model1_bundle.joblib`. Refuses to save unless the test metrics match the notebook to within 0.0005. |
| `render.yaml` | Render blueprint for hosting the API with `api/Dockerfile`. |

## Run locally (Windows)

Website (Node.js 18 or newer):

```
cd web
npm install
npm run dev                  # http://localhost:5173
npm run test:model           # checks the browser ANN against the Python model
```

API (Python 3.12), in a second terminal:

```
cd api
py -3.12 -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --port 8000
pytest test_api.py           # optional, needs: pip install pytest httpx
```

To make the website use the API, create `web\.env.local` containing `VITE_API_URL=http://localhost:8000` and restart
`npm run dev`. Without it the site still works: the ANN runs in the browser and Model 1 is shown as unavailable.

To rebuild the Model 1 bundle (not needed normally):
`python export_model1.py "F:\IIIrd Year\ANN\diabetes-ann"` from the `api` folder.

## Deploy

- **Website (Vercel):** put this folder in a GitHub repository, import it in Vercel and set *Root Directory* to `web`.
  Optionally add `VITE_API_URL` with the API's public URL and redeploy.
- **API:** any Docker host. On Render, *New → Blueprint* reads `render.yaml`. Set `ALLOWED_ORIGINS` to the Vercel URL
  if you want to restrict who can call it.

This is a screening aid built on self-reported BRFSS 2015 survey data, not a diagnosis.
