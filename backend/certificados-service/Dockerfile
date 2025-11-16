FROM python:3.11-alpine

RUN apk add --no-cache postgresql-dev gcc python3-dev musl-dev libffi-dev cairo-dev pango-dev gdk-pixbuf-dev ttf-dejavu jpeg-dev zlib-dev

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN mkdir -p /app/media /app/static && python manage.py collectstatic --noinput

EXPOSE 8000
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "3", "certificados_service.wsgi:application"]