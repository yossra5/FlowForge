# ml-service/Dockerfile (simplest version)
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/

RUN mkdir -p models data

EXPOSE 8001

CMD ["python", "src/api.py"]