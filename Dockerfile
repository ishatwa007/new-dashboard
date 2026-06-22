FROM python:3.11-slim

# uv is a Rust-based pip replacement — 5-10x faster installs
RUN pip install --no-cache-dir uv

WORKDIR /app/backend

# Copy requirements first so Docker can cache this layer
COPY backend/requirements.txt ./
RUN uv pip install --system --no-cache -r requirements.txt

COPY backend/ ./

EXPOSE 7860

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
