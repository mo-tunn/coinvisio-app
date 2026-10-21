FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Set PYTHONPATH to include /app so that modules can import data_loader
ENV PYTHONPATH=/app

COPY . .

CMD ["python", "main.py"]
