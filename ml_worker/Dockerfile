FROM python:3.11-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    OPENCV_IO_ENABLE_OPENEXR=0 \
    GLOG_minloglevel=2

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    ffmpeg \
    libpq-dev \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --gid 1002 mlworker && \
    useradd --uid 1002 --gid mlworker --no-create-home mlworker

WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY --chown=mlworker:mlworker . .

RUN mkdir -p /app/media && chown -R mlworker:mlworker /app

USER mlworker

CMD ["celery", "-A", "core", "worker", \
     "--loglevel=info", \
     "--concurrency=2", \
     "-Q", "analysis", \
     "--max-tasks-per-child=50"]
