# API Gateway Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY src ./src
COPY config.yml ./

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash gateway \
    && chown -R gateway:gateway /app
USER gateway

# Expose ports
EXPOSE 8080  # API Gateway
EXPOSE 9091  # Metrics

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Start the API gateway
CMD ["uvicorn", "src.gateway:app", "--host", "0.0.0.0", "--port", "8080"]
