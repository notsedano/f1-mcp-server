"""
Unit tests for monitoring models
Tests for HealthChecker, Alert, AlertManager, and related models.
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, AsyncMock

from monitoring.src.health_check import (
    HealthChecker, HealthCheckConfig, HealthCheckResult,
    HealthStatus, CheckType
)
from monitoring.src.alert import (
    Alert, AlertManager, AlertRule, AlertContext,
    AlertType, AlertSeverity, AlertStatus, AlertChannel
)


class TestHealthStatus:
    """Test HealthStatus enum"""
    
    def test_health_status_values(self):
        """Test HealthStatus enum values"""
        assert HealthStatus.HEALTHY == "healthy"
        assert HealthStatus.UNHEALTHY == "unhealthy"
        assert HealthStatus.UNKNOWN == "unknown"
        assert HealthStatus.DEGRADED == "degraded"


class TestCheckType:
    """Test CheckType enum"""
    
    def test_check_type_values(self):
        """Test CheckType enum values"""
        assert CheckType.HTTP == "http"
        assert CheckType.TCP == "tcp"
        assert CheckType.PING == "ping"
        assert CheckType.CUSTOM == "custom"


class TestHealthCheckResult:
    """Test HealthCheckResult model"""
    
    def test_health_check_result_creation(self):
        """Test creating HealthCheckResult instance"""
        result = HealthCheckResult(
            service_name="test-service",
            status=HealthStatus.HEALTHY,
            response_time_ms=150,
            timestamp=datetime.now()
        )
        
        assert result.service_name == "test-service"
        assert result.status == HealthStatus.HEALTHY
        assert result.response_time_ms == 150
        assert isinstance(result.timestamp, datetime)
    
    def test_health_check_result_to_dict(self):
        """Test converting HealthCheckResult to dictionary"""
        timestamp = datetime.now()
        result = HealthCheckResult(
            service_name="test-service",
            status=HealthStatus.HEALTHY,
            response_time_ms=150,
            timestamp=timestamp,
            status_code=200,
            response_data={"status": "ok"}
        )
        
        data = result.to_dict()
        
        assert data["service_name"] == "test-service"
        assert data["status"] == "healthy"
        assert data["response_time_ms"] == 150
        assert data["timestamp"] == timestamp.isoformat()
        assert data["status_code"] == 200
        assert data["response_data"] == {"status": "ok"}
    
    def test_health_check_result_is_healthy(self):
        """Test checking if result is healthy"""
        healthy_result = HealthCheckResult(
            service_name="test-service",
            status=HealthStatus.HEALTHY,
            response_time_ms=150,
            timestamp=datetime.now()
        )
        
        assert healthy_result.is_healthy()
        
        unhealthy_result = HealthCheckResult(
            service_name="test-service",
            status=HealthStatus.UNHEALTHY,
            response_time_ms=150,
            timestamp=datetime.now()
        )
        
        assert not unhealthy_result.is_healthy()
    
    def test_health_check_result_is_unhealthy(self):
        """Test checking if result is unhealthy"""
        healthy_result = HealthCheckResult(
            service_name="test-service",
            status=HealthStatus.HEALTHY,
            response_time_ms=150,
            timestamp=datetime.now()
        )
        
        assert not healthy_result.is_unhealthy()
        
        unhealthy_result = HealthCheckResult(
            service_name="test-service",
            status=HealthStatus.UNHEALTHY,
            response_time_ms=150,
            timestamp=datetime.now()
        )
        
        assert unhealthy_result.is_unhealthy()
    
    def test_health_check_result_is_unknown(self):
        """Test checking if result is unknown"""
        unknown_result = HealthCheckResult(
            service_name="test-service",
            status=HealthStatus.UNKNOWN,
            response_time_ms=150,
            timestamp=datetime.now()
        )
        
        assert unknown_result.is_unknown()
        
        healthy_result = HealthCheckResult(
            service_name="test-service",
            status=HealthStatus.HEALTHY,
            response_time_ms=150,
            timestamp=datetime.now()
        )
        
        assert not healthy_result.is_unknown()


class TestHealthCheckConfig:
    """Test HealthCheckConfig model"""
    
    def test_health_check_config_creation(self):
        """Test creating HealthCheckConfig instance"""
        config = HealthCheckConfig(
            service_name="test-service",
            endpoint="http://localhost:8000/health"
        )
        
        assert config.service_name == "test-service"
        assert config.endpoint == "http://localhost:8000/health"
        assert config.check_type == CheckType.HTTP
        assert config.interval_seconds == 30
        assert config.timeout_seconds == 10
        assert config.retry_count == 3
        assert config.expected_status == 200
        assert config.enabled is True
    
    def test_health_check_config_to_dict(self):
        """Test converting HealthCheckConfig to dictionary"""
        config = HealthCheckConfig(
            service_name="test-service",
            endpoint="http://localhost:8000/health",
            check_type=CheckType.HTTP,
            interval_seconds=60,
            timeout_seconds=15,
            retry_count=5,
            expected_status=200,
            expected_response='{"status": "healthy"}',
            headers={"Authorization": "Bearer token"},
            enabled=True
        )
        
        data = config.to_dict()
        
        assert data["service_name"] == "test-service"
        assert data["endpoint"] == "http://localhost:8000/health"
        assert data["check_type"] == "http"
        assert data["interval_seconds"] == 60
        assert data["timeout_seconds"] == 15
        assert data["retry_count"] == 5
        assert data["expected_status"] == 200
        assert data["expected_response"] == '{"status": "healthy"}'
        assert data["headers"] == {"Authorization": "Bearer token"}
        assert data["enabled"] is True
    
    def test_health_check_config_from_dict(self):
        """Test creating HealthCheckConfig from dictionary"""
        data = {
            "service_name": "test-service",
            "endpoint": "http://localhost:8000/health",
            "check_type": "http",
            "interval_seconds": 60,
            "timeout_seconds": 15,
            "retry_count": 5,
            "expected_status": 200,
            "expected_response": '{"status": "healthy"}',
            "headers": {"Authorization": "Bearer token"},
            "enabled": True
        }
        
        config = HealthCheckConfig.from_dict(data)
        
        assert config.service_name == "test-service"
        assert config.endpoint == "http://localhost:8000/health"
        assert config.check_type == CheckType.HTTP
        assert config.interval_seconds == 60
        assert config.timeout_seconds == 15
        assert config.retry_count == 5
        assert config.expected_status == 200
        assert config.expected_response == '{"status": "healthy"}'
        assert config.headers == {"Authorization": "Bearer token"}
        assert config.enabled is True


class TestHealthChecker:
    """Test HealthChecker model"""
    
    @pytest.fixture
    def health_checker(self):
        """Create HealthChecker instance for testing"""
        return HealthChecker()
    
    def test_health_checker_creation(self, health_checker):
        """Test creating HealthChecker instance"""
        assert health_checker.configs == {}
        assert health_checker.results == {}
        assert health_checker.is_running is False
    
    def test_health_checker_add_config(self, health_checker):
        """Test adding health check configuration"""
        config = HealthCheckConfig(
            service_name="test-service",
            endpoint="http://localhost:8000/health"
        )
        
        health_checker.add_config(config)
        
        assert "test-service" in health_checker.configs
        assert health_checker.configs["test-service"] == config
    
    def test_health_checker_remove_config(self, health_checker):
        """Test removing health check configuration"""
        config = HealthCheckConfig(
            service_name="test-service",
            endpoint="http://localhost:8000/health"
        )
        
        health_checker.add_config(config)
        health_checker.remove_config("test-service")
        
        assert "test-service" not in health_checker.configs
    
    @pytest.mark.asyncio
    async def test_health_checker_check_service_success(self, health_checker):
        """Test successful health check"""
        config = HealthCheckConfig(
            service_name="test-service",
            endpoint="http://localhost:8000/health"
        )
        
        # Mock successful HTTP response
        mock_response = Mock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={"status": "healthy"})
        mock_response.text = AsyncMock(return_value='{"status": "healthy"}')
        
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_get.return_value.__aenter__.return_value = mock_response
            
            result = await health_checker.check_service("test-service")
            
            assert result.service_name == "test-service"
            assert result.status == HealthStatus.HEALTHY
            assert result.status_code == 200
            assert result.response_data == {"status": "healthy"}
            assert result.error_message is None
    
    @pytest.mark.asyncio
    async def test_health_checker_check_service_failure(self, health_checker):
        """Test failed health check"""
        config = HealthCheckConfig(
            service_name="test-service",
            endpoint="http://localhost:8000/health"
        )
        
        # Mock failed HTTP response
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_get.side_effect = Exception("Connection failed")
            
            result = await health_checker.check_service("test-service")
            
            assert result.service_name == "test-service"
            assert result.status == HealthStatus.UNHEALTHY
            assert result.error_message == "Connection failed"
    
    @pytest.mark.asyncio
    async def test_health_checker_check_service_timeout(self, health_checker):
        """Test health check timeout"""
        config = HealthCheckConfig(
            service_name="test-service",
            endpoint="http://localhost:8000/health",
            timeout_seconds=1
        )
        
        # Mock timeout
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_get.side_effect = asyncio.TimeoutError()
            
            result = await health_checker.check_service("test-service")
            
            assert result.service_name == "test-service"
            assert result.status == HealthStatus.UNHEALTHY
            assert "timeout" in result.error_message.lower()
    
    def test_health_checker_get_service_health(self, health_checker):
        """Test getting service health status"""
        # Add a result
        result = HealthCheckResult(
            service_name="test-service",
            status=HealthStatus.HEALTHY,
            response_time_ms=150,
            timestamp=datetime.now()
        )
        health_checker.results["test-service"] = result
        
        retrieved_result = health_checker.get_service_health("test-service")
        assert retrieved_result == result
        
        # Test non-existent service
        non_existent = health_checker.get_service_health("non-existent")
        assert non_existent is None
    
    def test_health_checker_get_all_services_health(self, health_checker):
        """Test getting all services health"""
        # Add multiple results
        result1 = HealthCheckResult(
            service_name="service1",
            status=HealthStatus.HEALTHY,
            response_time_ms=150,
            timestamp=datetime.now()
        )
        result2 = HealthCheckResult(
            service_name="service2",
            status=HealthStatus.UNHEALTHY,
            response_time_ms=5000,
            timestamp=datetime.now()
        )
        
        health_checker.results["service1"] = result1
        health_checker.results["service2"] = result2
        
        all_results = health_checker.get_all_services_health()
        
        assert len(all_results) == 2
        assert "service1" in all_results
        assert "service2" in all_results
        assert all_results["service1"] == result1
        assert all_results["service2"] == result2
    
    def test_health_checker_get_overall_health(self, health_checker):
        """Test getting overall health status"""
        # Test with all healthy services
        result1 = HealthCheckResult(
            service_name="service1",
            status=HealthStatus.HEALTHY,
            response_time_ms=150,
            timestamp=datetime.now()
        )
        result2 = HealthCheckResult(
            service_name="service2",
            status=HealthStatus.HEALTHY,
            response_time_ms=200,
            timestamp=datetime.now()
        )
        
        health_checker.results["service1"] = result1
        health_checker.results["service2"] = result2
        
        overall = health_checker.get_overall_health()
        assert overall.status == HealthStatus.HEALTHY
        assert len(overall.services) == 2
        
        # Test with unhealthy service
        result3 = HealthCheckResult(
            service_name="service3",
            status=HealthStatus.UNHEALTHY,
            response_time_ms=5000,
            timestamp=datetime.now()
        )
        health_checker.results["service3"] = result3
        
        overall = health_checker.get_overall_health()
        assert overall.status == HealthStatus.UNHEALTHY


class TestAlertType:
    """Test AlertType enum"""
    
    def test_alert_type_values(self):
        """Test AlertType enum values"""
        assert AlertType.HEALTH == "health"
        assert AlertType.PERFORMANCE == "performance"
        assert AlertType.SECURITY == "security"
        assert AlertType.CAPACITY == "capacity"
        assert AlertType.AVAILABILITY == "availability"
        assert AlertType.ERROR == "error"
        assert AlertType.WARNING == "warning"
        assert AlertType.INFO == "info"


class TestAlertSeverity:
    """Test AlertSeverity enum"""
    
    def test_alert_severity_values(self):
        """Test AlertSeverity enum values"""
        assert AlertSeverity.CRITICAL == "critical"
        assert AlertSeverity.HIGH == "high"
        assert AlertSeverity.MEDIUM == "medium"
        assert AlertSeverity.LOW == "low"
        assert AlertSeverity.INFO == "info"


class TestAlertStatus:
    """Test AlertStatus enum"""
    
    def test_alert_status_values(self):
        """Test AlertStatus enum values"""
        assert AlertStatus.ACTIVE == "active"
        assert AlertStatus.ACKNOWLEDGED == "acknowledged"
        assert AlertStatus.RESOLVED == "resolved"
        assert AlertStatus.SUPPRESSED == "suppressed"


class TestAlertChannel:
    """Test AlertChannel enum"""
    
    def test_alert_channel_values(self):
        """Test AlertChannel enum values"""
        assert AlertChannel.EMAIL == "email"
        assert AlertChannel.SLACK == "slack"
        assert AlertChannel.WEBHOOK == "webhook"
        assert AlertChannel.SMS == "sms"
        assert AlertChannel.PAGERDUTY == "pagerduty"


class TestAlertContext:
    """Test AlertContext model"""
    
    def test_alert_context_creation(self):
        """Test creating AlertContext instance"""
        context = AlertContext(
            service_name="test-service",
            hostname="server1",
            environment="production",
            user_id="user123",
            request_id="req456",
            metadata={"custom": "value"}
        )
        
        assert context.service_name == "test-service"
        assert context.hostname == "server1"
        assert context.environment == "production"
        assert context.user_id == "user123"
        assert context.request_id == "req456"
        assert context.metadata == {"custom": "value"}
    
    def test_alert_context_to_dict(self):
        """Test converting AlertContext to dictionary"""
        context = AlertContext(
            service_name="test-service",
            hostname="server1",
            environment="production",
            metadata={"custom": "value"}
        )
        
        data = context.to_dict()
        
        assert data["service_name"] == "test-service"
        assert data["hostname"] == "server1"
        assert data["environment"] == "production"
        assert data["user_id"] is None
        assert data["request_id"] is None
        assert data["metadata"] == {"custom": "value"}


class TestAlertRule:
    """Test AlertRule model"""
    
    def test_alert_rule_creation(self):
        """Test creating AlertRule instance"""
        rule = AlertRule(
            name="High CPU Usage",
            condition="cpu_usage > 80",
            severity=AlertSeverity.HIGH,
            channels=[AlertChannel.EMAIL, AlertChannel.SLACK],
            cooldown_minutes=30,
            enabled=True,
            description="Alert when CPU usage exceeds 80%"
        )
        
        assert rule.name == "High CPU Usage"
        assert rule.condition == "cpu_usage > 80"
        assert rule.severity == AlertSeverity.HIGH
        assert AlertChannel.EMAIL in rule.channels
        assert AlertChannel.SLACK in rule.channels
        assert rule.cooldown_minutes == 30
        assert rule.enabled is True
        assert rule.description == "Alert when CPU usage exceeds 80%"
    
    def test_alert_rule_to_dict(self):
        """Test converting AlertRule to dictionary"""
        rule = AlertRule(
            name="High CPU Usage",
            condition="cpu_usage > 80",
            severity=AlertSeverity.HIGH,
            channels=[AlertChannel.EMAIL, AlertChannel.SLACK]
        )
        
        data = rule.to_dict()
        
        assert data["name"] == "High CPU Usage"
        assert data["condition"] == "cpu_usage > 80"
        assert data["severity"] == "high"
        assert "email" in data["channels"]
        assert "slack" in data["channels"]
        assert data["cooldown_minutes"] == 15
        assert data["enabled"] is True


class TestAlert:
    """Test Alert model"""
    
    def test_alert_creation(self):
        """Test creating Alert instance"""
        alert = Alert(
            title="High CPU Usage",
            message="CPU usage is above 80%",
            severity=AlertSeverity.HIGH,
            alert_type=AlertType.PERFORMANCE,
            context=AlertContext(service_name="test-service")
        )
        
        assert alert.title == "High CPU Usage"
        assert alert.message == "CPU usage is above 80%"
        assert alert.severity == AlertSeverity.HIGH
        assert alert.alert_type == AlertType.PERFORMANCE
        assert alert.status == AlertStatus.ACTIVE
        assert alert.context.service_name == "test-service"
        assert isinstance(alert.id, str)
        assert isinstance(alert.created_at, datetime)
    
    def test_alert_to_dict(self):
        """Test converting Alert to dictionary"""
        alert = Alert(
            title="Test Alert",
            message="Test message",
            severity=AlertSeverity.MEDIUM,
            alert_type=AlertType.INFO
        )
        
        data = alert.to_dict()
        
        assert data["id"] == alert.id
        assert data["title"] == "Test Alert"
        assert data["message"] == "Test message"
        assert data["severity"] == "medium"
        assert data["alert_type"] == "info"
        assert data["status"] == "active"
        assert data["created_at"] == alert.created_at.isoformat()
        assert data["acknowledged_at"] is None
        assert data["resolved_at"] is None
    
    def test_alert_acknowledge(self):
        """Test acknowledging alert"""
        alert = Alert(
            title="Test Alert",
            message="Test message",
            severity=AlertSeverity.MEDIUM,
            alert_type=AlertType.INFO
        )
        
        alert.acknowledge("user123")
        
        assert alert.status == AlertStatus.ACKNOWLEDGED
        assert alert.acknowledged_by == "user123"
        assert alert.acknowledged_at is not None
    
    def test_alert_resolve(self):
        """Test resolving alert"""
        alert = Alert(
            title="Test Alert",
            message="Test message",
            severity=AlertSeverity.MEDIUM,
            alert_type=AlertType.INFO
        )
        
        alert.resolve("user123", "Issue fixed")
        
        assert alert.status == AlertStatus.RESOLVED
        assert alert.resolved_by == "user123"
        assert alert.resolution_notes == "Issue fixed"
        assert alert.resolved_at is not None
    
    def test_alert_suppress(self):
        """Test suppressing alert"""
        alert = Alert(
            title="Test Alert",
            message="Test message",
            severity=AlertSeverity.MEDIUM,
            alert_type=AlertType.INFO
        )
        
        alert.suppress("user123", "False positive")
        
        assert alert.status == AlertStatus.SUPPRESSED
        assert alert.suppressed_by == "user123"
        assert alert.suppression_reason == "False positive"
        assert alert.suppressed_at is not None
    
    def test_alert_is_active(self):
        """Test checking if alert is active"""
        alert = Alert(
            title="Test Alert",
            message="Test message",
            severity=AlertSeverity.MEDIUM,
            alert_type=AlertType.INFO
        )
        
        assert alert.is_active()
        
        alert.acknowledge("user123")
        assert not alert.is_active()
    
    def test_alert_is_critical(self):
        """Test checking if alert is critical"""
        critical_alert = Alert(
            title="Critical Alert",
            message="Critical message",
            severity=AlertSeverity.CRITICAL,
            alert_type=AlertType.ERROR
        )
        
        assert critical_alert.is_critical()
        
        normal_alert = Alert(
            title="Normal Alert",
            message="Normal message",
            severity=AlertSeverity.MEDIUM,
            alert_type=AlertType.INFO
        )
        
        assert not normal_alert.is_critical()
    
    def test_alert_get_age(self):
        """Test getting alert age"""
        alert = Alert(
            title="Test Alert",
            message="Test message",
            severity=AlertSeverity.MEDIUM,
            alert_type=AlertType.INFO
        )
        
        age = alert.get_age()
        assert isinstance(age, timedelta)
        assert age.total_seconds() >= 0


class TestAlertManager:
    """Test AlertManager model"""
    
    @pytest.fixture
    def alert_manager(self):
        """Create AlertManager instance for testing"""
        return AlertManager()
    
    def test_alert_manager_creation(self, alert_manager):
        """Test creating AlertManager instance"""
        assert alert_manager.alerts == []
        assert alert_manager.rules == {}
    
    def test_alert_manager_create_alert(self, alert_manager):
        """Test creating alert"""
        alert = alert_manager.create_alert(
            title="Test Alert",
            message="Test message",
            severity=AlertSeverity.MEDIUM,
            alert_type=AlertType.INFO
        )
        
        assert alert.title == "Test Alert"
        assert alert.message == "Test message"
        assert alert.severity == AlertSeverity.MEDIUM
        assert alert.alert_type == AlertType.INFO
        assert alert in alert_manager.alerts
    
    def test_alert_manager_get_alert(self, alert_manager):
        """Test getting alert by ID"""
        alert = alert_manager.create_alert(
            title="Test Alert",
            message="Test message",
            severity=AlertSeverity.MEDIUM,
            alert_type=AlertType.INFO
        )
        
        retrieved = alert_manager.get_alert(alert.id)
        assert retrieved == alert
        
        not_found = alert_manager.get_alert("nonexistent-id")
        assert not_found is None
    
    def test_alert_manager_get_active_alerts(self, alert_manager):
        """Test getting active alerts"""
        alert1 = alert_manager.create_alert(
            title="Active Alert",
            message="Active message",
            severity=AlertSeverity.MEDIUM,
            alert_type=AlertType.INFO
        )
        
        alert2 = alert_manager.create_alert(
            title="Another Alert",
            message="Another message",
            severity=AlertSeverity.HIGH,
            alert_type=AlertType.ERROR
        )
        
        # Acknowledge one alert
        alert2.acknowledge("user123")
        
        active_alerts = alert_manager.get_active_alerts()
        assert len(active_alerts) == 1
        assert active_alerts[0] == alert1
    
    def test_alert_manager_get_alerts_by_severity(self, alert_manager):
        """Test getting alerts by severity"""
        alert1 = alert_manager.create_alert(
            title="High Severity Alert",
            message="High message",
            severity=AlertSeverity.HIGH,
            alert_type=AlertType.ERROR
        )
        
        alert2 = alert_manager.create_alert(
            title="Medium Severity Alert",
            message="Medium message",
            severity=AlertSeverity.MEDIUM,
            alert_type=AlertType.INFO
        )
        
        high_alerts = alert_manager.get_alerts_by_severity(AlertSeverity.HIGH)
        assert len(high_alerts) == 1
        assert high_alerts[0] == alert1
        
        medium_alerts = alert_manager.get_alerts_by_severity(AlertSeverity.MEDIUM)
        assert len(medium_alerts) == 1
        assert medium_alerts[0] == alert2
    
    def test_alert_manager_get_alerts_by_type(self, alert_manager):
        """Test getting alerts by type"""
        alert1 = alert_manager.create_alert(
            title="Performance Alert",
            message="Performance message",
            severity=AlertSeverity.MEDIUM,
            alert_type=AlertType.PERFORMANCE
        )
        
        alert2 = alert_manager.create_alert(
            title="Health Alert",
            message="Health message",
            severity=AlertSeverity.HIGH,
            alert_type=AlertType.HEALTH
        )
        
        performance_alerts = alert_manager.get_alerts_by_type(AlertType.PERFORMANCE)
        assert len(performance_alerts) == 1
        assert performance_alerts[0] == alert1
        
        health_alerts = alert_manager.get_alerts_by_type(AlertType.HEALTH)
        assert len(health_alerts) == 1
        assert health_alerts[0] == alert2
    
    def test_alert_manager_acknowledge_alert(self, alert_manager):
        """Test acknowledging alert"""
        alert = alert_manager.create_alert(
            title="Test Alert",
            message="Test message",
            severity=AlertSeverity.MEDIUM,
            alert_type=AlertType.INFO
        )
        
        success = alert_manager.acknowledge_alert(alert.id, "user123")
        assert success is True
        assert alert.status == AlertStatus.ACKNOWLEDGED
        assert alert.acknowledged_by == "user123"
        
        # Test acknowledging non-existent alert
        success = alert_manager.acknowledge_alert("nonexistent-id", "user123")
        assert success is False
    
    def test_alert_manager_resolve_alert(self, alert_manager):
        """Test resolving alert"""
        alert = alert_manager.create_alert(
            title="Test Alert",
            message="Test message",
            severity=AlertSeverity.MEDIUM,
            alert_type=AlertType.INFO
        )
        
        success = alert_manager.resolve_alert(alert.id, "user123", "Issue fixed")
        assert success is True
        assert alert.status == AlertStatus.RESOLVED
        assert alert.resolved_by == "user123"
        assert alert.resolution_notes == "Issue fixed"
        
        # Test resolving non-existent alert
        success = alert_manager.resolve_alert("nonexistent-id", "user123")
        assert success is False
    
    def test_alert_manager_add_rule(self, alert_manager):
        """Test adding alert rule"""
        rule = AlertRule(
            name="High CPU Rule",
            condition="cpu_usage > 80",
            severity=AlertSeverity.HIGH,
            channels=[AlertChannel.EMAIL]
        )
        
        alert_manager.add_rule(rule)
        
        assert "High CPU Rule" in alert_manager.rules
        assert alert_manager.rules["High CPU Rule"] == rule
    
    def test_alert_manager_remove_rule(self, alert_manager):
        """Test removing alert rule"""
        rule = AlertRule(
            name="High CPU Rule",
            condition="cpu_usage > 80",
            severity=AlertSeverity.HIGH,
            channels=[AlertChannel.EMAIL]
        )
        
        alert_manager.add_rule(rule)
        alert_manager.remove_rule("High CPU Rule")
        
        assert "High CPU Rule" not in alert_manager.rules
    
    def test_alert_manager_get_alert_summary(self, alert_manager):
        """Test getting alert summary"""
        # Create alerts with different statuses
        alert1 = alert_manager.create_alert(
            title="Active Alert",
            message="Active message",
            severity=AlertSeverity.HIGH,
            alert_type=AlertType.ERROR
        )
        
        alert2 = alert_manager.create_alert(
            title="Another Alert",
            message="Another message",
            severity=AlertSeverity.MEDIUM,
            alert_type=AlertType.INFO
        )
        
        alert2.acknowledge("user123")
        
        summary = alert_manager.get_alert_summary()
        
        assert summary["total_alerts"] == 2
        assert summary["active_alerts"] == 1
        assert summary["acknowledged_alerts"] == 1
        assert summary["resolved_alerts"] == 0
        assert summary["critical_alerts"] == 1
        assert summary["high_alerts"] == 1
        assert summary["medium_alerts"] == 1
        assert summary["low_alerts"] == 0
        assert summary["info_alerts"] == 1
