# Tasks: Cloud Hosting Infrastructure

**Input**: Design documents from `/specs/001-cloud-hosting/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → If not found: ERROR "No implementation plan found"
   → Extract: tech stack, libraries, structure
2. Load optional design documents:
   → data-model.md: Extract entities → model tasks
   → contracts/: Each file → contract test task
   → research.md: Extract decisions → setup tasks
3. Generate tasks by category:
   → Setup: project init, dependencies, linting
   → Tests: contract tests, integration tests
   → Core: models, services, CLI commands
   → Integration: DB, middleware, logging
   → Polish: unit tests, performance, docs
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All contracts have tests?
   → All entities have models?
   → All endpoints implemented?
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Single project**: `src/`, `tests/` at repository root
- **Web app**: `backend/src/`, `frontend/src/`
- **Mobile**: `api/src/`, `ios/src/` or `android/src/`
- Paths shown below assume web app structure - adjust based on plan.md structure

## Phase 3.1: Setup
- [ ] T001 Create deployment directory structure per implementation plan
- [ ] T002 Initialize Docker configuration with docker-compose.yml
- [ ] T003 [P] Configure environment template and validation scripts
- [ ] T004 [P] Setup monitoring directory structure and configuration
- [ ] T005 [P] Initialize API gateway directory structure

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [ ] T006 [P] Contract test GET /health in tests/contract/test_health_get.py
- [ ] T007 [P] Contract test POST /chat in tests/contract/test_chat_post.py
- [ ] T008 [P] Contract test GET /f1/schedule in tests/contract/test_f1_schedule_get.py
- [ ] T009 [P] Contract test GET /f1/drivers in tests/contract/test_f1_drivers_get.py
- [ ] T010 [P] Integration test deployment health checks in tests/integration/test_deployment_health.py
- [ ] T011 [P] Integration test API gateway routing in tests/integration/test_api_gateway.py
- [ ] T012 [P] Integration test monitoring and alerting in tests/integration/test_monitoring.py

## Phase 3.3: Core Implementation (ONLY after tests are failing)
- [ ] T013 [P] Deployment configuration model in deployment/src/config.py
- [ ] T014 [P] Service configuration model in deployment/src/service_config.py
- [ ] T015 [P] API endpoint model in api-gateway/src/endpoint.py
- [ ] T016 [P] Health check model in monitoring/src/health_check.py
- [ ] T017 [P] Alert model in monitoring/src/alert.py
- [ ] T018 [P] API key model in api-gateway/src/api_key.py
- [ ] T019 Docker configuration for MCP server in deployment/docker/mcp-server.Dockerfile
- [ ] T020 Docker configuration for messenger client in deployment/docker/messenger-client.Dockerfile
- [ ] T021 Docker configuration for MCP bridge in deployment/docker/mcp-bridge.Dockerfile
- [ ] T022 API gateway service in api-gateway/src/gateway.py
- [ ] T023 Authentication service in api-gateway/src/auth.py
- [ ] T024 Rate limiting service in api-gateway/src/rate_limiting.py
- [ ] T025 Health monitoring service in monitoring/src/health_monitor.py
- [ ] T026 Metrics collection service in monitoring/src/metrics_collector.py
- [ ] T027 Alerting service in monitoring/src/alerting.py

## Phase 3.4: Integration
- [ ] T028 Docker Compose configuration in deployment/config/docker-compose.yml
- [ ] T029 Nginx configuration in deployment/config/nginx.conf
- [ ] T030 Environment configuration template in deployment/config/environment.template
- [ ] T031 Deployment script in deployment/scripts/deploy.sh
- [ ] T032 Health check script in deployment/scripts/health-check.sh
- [ ] T033 Rollback script in deployment/scripts/rollback.sh
- [ ] T034 API gateway integration with backend services
- [ ] T035 Monitoring integration with all services
- [ ] T036 Logging configuration and structured logging

## Phase 3.5: Polish
- [ ] T037 [P] Unit tests for deployment models in tests/unit/test_deployment_models.py
- [ ] T038 [P] Unit tests for API gateway models in tests/unit/test_api_gateway_models.py
- [ ] T039 [P] Unit tests for monitoring models in tests/unit/test_monitoring_models.py
- [ ] T040 Performance tests for API response times (<500ms p95)
- [ ] T041 Load tests for concurrent users (100 users)
- [ ] T042 [P] Update deployment documentation in deployment/README.md
- [ ] T043 [P] Update API gateway documentation in api-gateway/README.md
- [ ] T044 [P] Update monitoring documentation in monitoring/README.md
- [ ] T045 Remove code duplication and optimize
- [ ] T046 Run quickstart.md validation scenarios

## Dependencies
- Tests (T006-T012) before implementation (T013-T027)
- T013-T018 blocks T019-T027 (models before services)
- T019-T021 blocks T028 (Docker configs before compose)
- T022-T024 blocks T034 (API gateway services before integration)
- T025-T027 blocks T035 (monitoring services before integration)
- Implementation before polish (T037-T046)

## Parallel Example
```
# Launch T006-T012 together:
Task: "Contract test GET /health in tests/contract/test_health_get.py"
Task: "Contract test POST /chat in tests/contract/test_chat_post.py"
Task: "Contract test GET /f1/schedule in tests/contract/test_f1_schedule_get.py"
Task: "Contract test GET /f1/drivers in tests/contract/test_f1_drivers_get.py"
Task: "Integration test deployment health checks in tests/integration/test_deployment_health.py"
Task: "Integration test API gateway routing in tests/integration/test_api_gateway.py"
Task: "Integration test monitoring and alerting in tests/integration/test_monitoring.py"
```

## Notes
- [P] tasks = different files, no dependencies
- Verify tests fail before implementing
- Commit after each task
- Avoid: vague tasks, same file conflicts
- Follow constitution: Test-First, Library-First, Observability

## Task Generation Rules
*Applied during main() execution*

1. **From Contracts**:
   - Each contract file → contract test task [P]
   - Each endpoint → implementation task
   
2. **From Data Model**:
   - Each entity → model creation task [P]
   - Relationships → service layer tasks
   
3. **From User Stories**:
   - Each story → integration test [P]
   - Quickstart scenarios → validation tasks

4. **Ordering**:
   - Setup → Tests → Models → Services → Integration → Polish
   - Dependencies block parallel execution

## Validation Checklist
*GATE: Checked by main() before returning*

- [x] All contracts have corresponding tests
- [x] All entities have model tasks
- [x] All tests come before implementation
- [x] Parallel tasks truly independent
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
