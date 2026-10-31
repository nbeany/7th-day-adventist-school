FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    netcat-traditional \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libffi-dev \
    shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY requirements.txt /app/
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# Copy project
COPY . /app/
RUN chmod +x /app/docker-entrypoint.sh

# The entrypoint waits for Postgres, applies migrations, and (outside
# DEBUG) collects static files, then hands off to whatever CMD/command
# actually runs - gunicorn here, or `runserver` when docker-compose.yml
# overrides it for local dev.
ENTRYPOINT ["/app/docker-entrypoint.sh"]

# Production default: run under gunicorn. Local dev overrides this command
# in docker-compose.yml to use the auto-reloading Django dev server instead.
CMD ["gunicorn", "core.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
