# F1 MCP Server Constitution

## Core Principles

### I. Library-First
Every feature starts as a standalone library; Libraries must be self-contained, independently testable, documented; Clear purpose required - no organizational-only libraries

### II. CLI Interface
Every library exposes functionality via CLI; Text in/out protocol: stdin/args → stdout, errors → stderr; Support JSON + human-readable formats

### III. Test-First (NON-NEGOTIABLE)
TDD mandatory: Tests written → User approved → Tests fail → Then implement; Red-Green-Refactor cycle strictly enforced

### IV. Integration Testing
Focus areas requiring integration tests: New library contract tests, Contract changes, Inter-service communication, Shared schemas

### V. Observability
Text I/O ensures debuggability; Structured logging required; Multi-tier log streaming from frontend to backend

### VI. Versioning & Breaking Changes
MAJOR.MINOR.BUILD format; BUILD increments on every change; Breaking changes require parallel tests and migration plan

### VII. Simplicity
Start simple, YAGNI principles; Maximum 3 projects per feature; Avoid patterns without proven need

## Additional Constraints

### Security Requirements
- API key authentication for all external endpoints
- HTTPS enforcement in production
- Rate limiting to prevent abuse
- Input validation and sanitization

### Performance Standards
- API response times <500ms p95
- Support 100 concurrent users minimum
- Graceful degradation under load
- Health check endpoints for monitoring

### Deployment Policies
- Docker containerization for consistency
- Environment-specific configuration
- Automated health checks and rollback
- Infrastructure as code approach

## Development Workflow

### Code Review Requirements
- All PRs must verify constitution compliance
- Tests must be written before implementation
- API contracts must be validated
- Performance impact must be assessed

### Testing Gates
- Contract tests must pass before implementation
- Integration tests for all service boundaries
- End-to-end tests for critical user journeys
- Performance tests for scalability requirements

### Deployment Approval Process
- Staging environment validation required
- Health check validation before production
- Rollback plan must be documented
- Monitoring and alerting must be configured

## Governance

Constitution supersedes all other practices; Amendments require documentation, approval, migration plan

All PRs/reviews must verify compliance; Complexity must be justified; Use CLAUDE.md for runtime development guidance

**Version**: 1.0.0 | **Ratified**: 2025-01-27 | **Last Amended**: 2025-01-27