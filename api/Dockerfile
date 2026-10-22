# API image for Render, Railway or a Hugging Face Docker Space (they set PORT; default 7860).
FROM python:3.12-slim
WORKDIR /srv
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY main.py model.py ./
COPY models/ models/
COPY results/ results/
ENV PORT=7860
EXPOSE 7860
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
