# Monitoring Service Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    procps \
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
RUN useradd --create-home --shell /bin/bash monitor \
    && chown -R monitor:monitor /app

# Create log directory
RUN mkdir -p /var/log/f1-mcp-server \
    && chown -R monitor:monitor /var/log/f1-mcp-server

USER monitor

# Expose ports
EXPOSE 3001  # Dashboard
EXPOSE 9090  # Metrics

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Start the monitoring service
CMD ["python", "-m", "src.monitoring_service"]
