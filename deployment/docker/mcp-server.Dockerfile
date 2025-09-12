# MCP Server Dockerfile
# Optimized for cloud deployment with health checks and monitoring
FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files first for better caching
COPY pyproject.toml ./
COPY README.md ./
COPY LICENSE ./
COPY CHANGELOG.md ./
COPY uv.lock ./

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir .

# Copy source code
COPY src ./src

# Create cache directory for FastF1
RUN mkdir -p /app/cache && chmod 755 /app/cache

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash --uid 1000 app \
    && chown -R app:app /app
USER app

# Set environment variables for the app
ENV MCP_SERVER_HOST=0.0.0.0 \
    MCP_SERVER_PORT=8000 \
    FASTF1_CACHE_DIR=/app/cache \
    FASTF1_CACHE_ENABLED=true \
    LOG_LEVEL=INFO

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Set the entrypoint to run the MCP server
ENTRYPOINT ["python", "-m", "f1_mcp_server"]
