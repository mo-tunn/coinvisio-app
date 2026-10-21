FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create a user to avoid running as root (Good practice for HF Spaces)
RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
