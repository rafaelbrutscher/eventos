FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .

RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    default-mysql-client \
    pkg-config \
    && pip install --no-cache-dir -r requirements.txt \
    && apt-get remove -y build-essential pkg-config \
    && apt-get autoremove -y

COPY . .

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "certificados_service.wsgi:application"]