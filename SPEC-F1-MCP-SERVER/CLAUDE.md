# F1 MCP Server Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-01-27

## Active Technologies
- Python 3.11+ + FastF1 + MCP protocol (001-cloud-hosting)
- Node.js/TypeScript + Express.js + Firebase (001-cloud-hosting)
- Docker + cloud hosting platform (001-cloud-hosting)

## Project Structure
```
deployment/              # Cloud deployment configuration
├── docker/             # Docker configurations
├── scripts/            # Deployment scripts
└── config/             # Environment and service configs

monitoring/             # Health monitoring and alerting
├── src/                # Monitoring services
└── tests/              # Monitoring tests

api-gateway/            # API gateway and routing
├── src/                # Gateway services
└── tests/              # Gateway tests

tests/                  # Cross-cutting tests
├── contract/           # API contract tests
├── integration/        # Integration tests
└── unit/               # Unit tests
```

## Commands
```bash
# Python services
cd deployment && python -m pytest tests/
cd monitoring && python -m pytest tests/
cd api-gateway && python -m pytest tests/

# Docker deployment
cd deployment && docker-compose up -d
cd deployment && docker-compose logs -f

# Health checks
curl http://localhost/health
curl -H "X-API-Key: your-key" http://localhost/chat
```

## Code Style
Python: Follow PEP 8, use type hints, structured logging
Node.js: Follow ESLint config, TypeScript strict mode
Docker: Multi-stage builds, minimal base images
API: RESTful design, OpenAPI 3.0 specifications

## Recent Changes
- 001-cloud-hosting: Added Python 3.11+ + FastF1 + MCP protocol
- 001-cloud-hosting: Added Node.js/TypeScript + Express.js + Firebase
- 001-cloud-hosting: Added Docker + cloud hosting platform

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
