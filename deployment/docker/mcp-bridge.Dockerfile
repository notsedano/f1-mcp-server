# MCP Bridge Dockerfile
# FastAPI-based bridge service for cloud deployment
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

# Copy requirements first for better caching
COPY f1-messenger-app/requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY f1-messenger-app/mcp-bridge.py ./

# Create log directory
RUN mkdir -p /app/logs && chmod 755 /app/logs

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash --uid 1001 bridge \
    && chown -R bridge:bridge /app
USER bridge

# Set environment variables for the app
ENV BRIDGE_HOST=0.0.0.0 \
    BRIDGE_PORT=8001 \
    MCP_SERVER_URL=http://mcp-server:8000 \
    LOG_LEVEL=INFO

# Expose port
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

# Start the bridge service
CMD ["uvicorn", "mcp-bridge:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "2"]
