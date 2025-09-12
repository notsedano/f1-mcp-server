"""
Monitoring Dashboard
Web-based dashboard for monitoring F1 MCP Server deployment health and metrics.
"""

import asyncio
import json
import time
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, field

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import uvicorn
import yaml

from .health_monitor import health_monitor
from .metrics_collector import metrics_collector
from .alerting import alerting_service

# Dashboard configuration
@dataclass
class DashboardConfig:
    """Dashboard configuration"""
    title: str = "F1 MCP Server Monitoring"
    refresh_interval: int = 30  # seconds
    max_history_points: int = 100
    alert_refresh_interval: int = 10  # seconds
    theme: str = "dark"  # dark or light
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "title": self.title,
            "refresh_interval": self.refresh_interval,
            "max_history_points": self.max_history_points,
            "alert_refresh_interval": self.alert_refresh_interval,
            "theme": self.theme
        }


class MonitoringDashboard:
    """Web-based monitoring dashboard"""
    
    def __init__(self, config_path: str = "config.yml"):
        self.config_path = config_path
        self.config = self._load_config()
        self.dashboard_config = DashboardConfig()
        self.websocket_connections: List[WebSocket] = []
        self.metric_history: Dict[str, List[Dict[str, Any]]] = {}
        self.start_time = time.time()
        
        # Initialize FastAPI app
        self.app = FastAPI(
            title="F1 MCP Server Monitoring Dashboard",
            description="Real-time monitoring dashboard for F1 MCP Server deployment",
            version="1.0.0"
        )
        
        # Setup routes
        self._setup_routes()
        self._setup_middleware()
        
        # Start background tasks
        asyncio.create_task(self._update_metrics_loop())
        asyncio.create_task(self._broadcast_updates_loop())
    
    def _load_config(self) -> Dict[str, Any]:
        """Load configuration from YAML file"""
        try:
            with open(self.config_path, 'r') as f:
                return yaml.safe_load(f)
        except FileNotFoundError:
            return {}
        except Exception as e:
            print(f"Error loading config: {e}")
            return {}
    
    def _setup_middleware(self):
        """Setup middleware"""
        from fastapi.middleware.cors import CORSMiddleware
        
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    
    def _setup_routes(self):
        """Setup dashboard routes"""
        
        @self.app.get("/", response_class=HTMLResponse)
        async def dashboard(request: Request):
            """Main dashboard page"""
            return self._get_dashboard_html()
        
        @self.app.get("/api/health")
        async def get_health():
            """Get overall system health"""
            try:
                health = health_monitor.get_overall_health()
                return health.to_dict()
            except Exception as e:
                return JSONResponse(
                    content={"error": str(e)},
                    status_code=500
                )
        
        @self.app.get("/api/metrics")
        async def get_metrics():
            """Get system metrics"""
            try:
                metrics_summary = metrics_collector.get_statistics()
                service_metrics = metrics_collector.get_all_service_metrics()
                
                return {
                    "summary": metrics_summary,
                    "services": {name: metrics.to_dict() for name, metrics in service_metrics.items()},
                    "timestamp": datetime.now().isoformat()
                }
            except Exception as e:
                return JSONResponse(
                    content={"error": str(e)},
                    status_code=500
                )
        
        @self.app.get("/api/alerts")
        async def get_alerts():
            """Get active alerts"""
            try:
                active_alerts = alerting_service.get_active_alerts()
                alert_summary = alerting_service.get_alert_summary()
                
                return {
                    "active_alerts": [alert.to_dict() for alert in active_alerts],
                    "summary": alert_summary,
                    "timestamp": datetime.now().isoformat()
                }
            except Exception as e:
                return JSONResponse(
                    content={"error": str(e)},
                    status_code=500
                )
        
        @self.app.get("/api/services")
        async def get_services():
            """Get service health status"""
            try:
                services_health = health_monitor.get_all_services_health()
                system_metrics = health_monitor.get_system_metrics()
                
                return {
                    "services": {name: service.to_dict() for name, service in services_health.items()},
                    "system_metrics": system_metrics,
                    "timestamp": datetime.now().isoformat()
                }
            except Exception as e:
                return JSONResponse(
                    content={"error": str(e)},
                    status_code=500
                )
        
        @self.app.get("/api/metrics/history")
        async def get_metrics_history():
            """Get metrics history"""
            try:
                return {
                    "history": self.metric_history,
                    "timestamp": datetime.now().isoformat()
                }
            except Exception as e:
                return JSONResponse(
                    content={"error": str(e)},
                    status_code=500
                )
        
        @self.app.post("/api/alerts/{alert_id}/acknowledge")
        async def acknowledge_alert(alert_id: str, user_id: str = "dashboard-user"):
            """Acknowledge an alert"""
            try:
                success = alerting_service.acknowledge_alert(alert_id, user_id)
                if success:
                    return {"status": "success", "message": "Alert acknowledged"}
                else:
                    return JSONResponse(
                        content={"status": "error", "message": "Failed to acknowledge alert"},
                        status_code=400
                    )
            except Exception as e:
                return JSONResponse(
                    content={"error": str(e)},
                    status_code=500
                )
        
        @self.app.post("/api/alerts/{alert_id}/resolve")
        async def resolve_alert(alert_id: str, user_id: str = "dashboard-user"):
            """Resolve an alert"""
            try:
                success = alerting_service.resolve_alert(alert_id, user_id)
                if success:
                    return {"status": "success", "message": "Alert resolved"}
                else:
                    return JSONResponse(
                        content={"status": "error", "message": "Failed to resolve alert"},
                        status_code=400
                    )
            except Exception as e:
                return JSONResponse(
                    content={"error": str(e)},
                    status_code=500
                )
        
        @self.app.websocket("/ws")
        async def websocket_endpoint(websocket: WebSocket):
            """WebSocket endpoint for real-time updates"""
            await websocket.accept()
            self.websocket_connections.append(websocket)
            
            try:
                while True:
                    # Keep connection alive
                    await websocket.receive_text()
            except WebSocketDisconnect:
                self.websocket_connections.remove(websocket)
    
    def _get_dashboard_html(self) -> str:
        """Generate dashboard HTML"""
        return f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{self.dashboard_config.title}</title>
    <style>
        {self._get_dashboard_css()}
    </style>
</head>
<body class="{self.dashboard_config.theme}">
    <div class="dashboard-container">
        <header class="dashboard-header">
            <h1>{self.dashboard_config.title}</h1>
            <div class="header-controls">
                <button id="refresh-btn" class="btn btn-primary">Refresh</button>
                <button id="theme-toggle" class="btn btn-secondary">Toggle Theme</button>
                <span class="last-update">Last updated: <span id="last-update">Never</span></span>
            </div>
        </header>
        
        <div class="dashboard-grid">
            <!-- System Overview -->
            <div class="card system-overview">
                <h2>System Overview</h2>
                <div id="system-overview" class="overview-content">
                    <div class="loading">Loading...</div>
                </div>
            </div>
            
            <!-- Services Health -->
            <div class="card services-health">
                <h2>Services Health</h2>
                <div id="services-health" class="services-content">
                    <div class="loading">Loading...</div>
                </div>
            </div>
            
            <!-- Active Alerts -->
            <div class="card active-alerts">
                <h2>Active Alerts</h2>
                <div id="active-alerts" class="alerts-content">
                    <div class="loading">Loading...</div>
                </div>
            </div>
            
            <!-- Metrics Chart -->
            <div class="card metrics-chart">
                <h2>System Metrics</h2>
                <div id="metrics-chart" class="chart-content">
                    <div class="loading">Loading...</div>
                </div>
            </div>
            
            <!-- Service Metrics -->
            <div class="card service-metrics">
                <h2>Service Metrics</h2>
                <div id="service-metrics" class="service-metrics-content">
                    <div class="loading">Loading...</div>
                </div>
            </div>
            
            <!-- Error Logs -->
            <div class="card error-logs">
                <h2>Recent Errors</h2>
                <div id="error-logs" class="logs-content">
                    <div class="loading">Loading...</div>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        {self._get_dashboard_js()}
    </script>
</body>
</html>
        """
    
    def _get_dashboard_css(self) -> str:
        """Generate dashboard CSS"""
        return """
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: var(--bg-primary);
            color: var(--text-primary);
            transition: all 0.3s ease;
        }
        
        :root {
            --bg-primary: #1a1a1a;
            --bg-secondary: #2d2d2d;
            --bg-tertiary: #3d3d3d;
            --text-primary: #ffffff;
            --text-secondary: #b0b0b0;
            --text-muted: #808080;
            --accent-primary: #00d4ff;
            --accent-secondary: #ff6b6b;
            --success: #4ade80;
            --warning: #fbbf24;
            --error: #ef4444;
            --border: #404040;
        }
        
        body.light {
            --bg-primary: #ffffff;
            --bg-secondary: #f5f5f5;
            --bg-tertiary: #e5e5e5;
            --text-primary: #1a1a1a;
            --text-secondary: #4a4a4a;
            --text-muted: #808080;
            --border: #e0e0e0;
        }
        
        .dashboard-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .dashboard-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding: 20px;
            background: var(--bg-secondary);
            border-radius: 12px;
            border: 1px solid var(--border);
        }
        
        .dashboard-header h1 {
            color: var(--accent-primary);
            font-size: 2rem;
            font-weight: 600;
        }
        
        .header-controls {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s ease;
        }
        
        .btn-primary {
            background: var(--accent-primary);
            color: white;
        }
        
        .btn-primary:hover {
            background: #00b8e6;
        }
        
        .btn-secondary {
            background: var(--bg-tertiary);
            color: var(--text-primary);
            border: 1px solid var(--border);
        }
        
        .btn-secondary:hover {
            background: var(--bg-primary);
        }
        
        .last-update {
            font-size: 0.9rem;
            color: var(--text-muted);
        }
        
        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 20px;
        }
        
        .card {
            background: var(--bg-secondary);
            border-radius: 12px;
            padding: 20px;
            border: 1px solid var(--border);
            transition: all 0.2s ease;
        }
        
        .card:hover {
            border-color: var(--accent-primary);
        }
        
        .card h2 {
            margin-bottom: 15px;
            color: var(--text-primary);
            font-size: 1.2rem;
            font-weight: 600;
        }
        
        .loading {
            text-align: center;
            color: var(--text-muted);
            padding: 20px;
        }
        
        .status-indicator {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-right: 8px;
        }
        
        .status-healthy { background: var(--success); }
        .status-unhealthy { background: var(--error); }
        .status-degraded { background: var(--warning); }
        .status-unknown { background: var(--text-muted); }
        
        .service-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid var(--border);
        }
        
        .service-item:last-child {
            border-bottom: none;
        }
        
        .service-name {
            font-weight: 500;
        }
        
        .service-status {
            display: flex;
            align-items: center;
        }
        
        .alert-item {
            padding: 15px;
            margin-bottom: 10px;
            border-radius: 8px;
            border-left: 4px solid;
        }
        
        .alert-critical {
            background: rgba(239, 68, 68, 0.1);
            border-left-color: var(--error);
        }
        
        .alert-high {
            background: rgba(251, 191, 36, 0.1);
            border-left-color: var(--warning);
        }
        
        .alert-medium {
            background: rgba(59, 130, 246, 0.1);
            border-left-color: var(--accent-primary);
        }
        
        .alert-title {
            font-weight: 600;
            margin-bottom: 5px;
        }
        
        .alert-message {
            color: var(--text-secondary);
            font-size: 0.9rem;
            margin-bottom: 10px;
        }
        
        .alert-actions {
            display: flex;
            gap: 10px;
        }
        
        .metric-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid var(--border);
        }
        
        .metric-item:last-child {
            border-bottom: none;
        }
        
        .metric-value {
            font-weight: 600;
            color: var(--accent-primary);
        }
        
        .chart-placeholder {
            height: 200px;
            background: var(--bg-tertiary);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-muted);
        }
        
        @media (max-width: 768px) {
            .dashboard-grid {
                grid-template-columns: 1fr;
            }
            
            .dashboard-header {
                flex-direction: column;
                gap: 15px;
                text-align: center;
            }
            
            .header-controls {
                flex-wrap: wrap;
                justify-content: center;
            }
        }
        """
    
    def _get_dashboard_js(self) -> str:
        """Generate dashboard JavaScript"""
        return f"""
        class MonitoringDashboard {{
            constructor() {{
                this.refreshInterval = {self.dashboard_config.refresh_interval * 1000};
                this.alertRefreshInterval = {self.dashboard_config.alert_refresh_interval * 1000};
                this.websocket = null;
                this.init();
            }}
            
            init() {{
                this.setupEventListeners();
                this.connectWebSocket();
                this.loadData();
                this.startAutoRefresh();
            }}
            
            setupEventListeners() {{
                document.getElementById('refresh-btn').addEventListener('click', () => this.loadData());
                document.getElementById('theme-toggle').addEventListener('click', () => this.toggleTheme());
            }}
            
            connectWebSocket() {{
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const wsUrl = `${{protocol}}//${{window.location.host}}/ws`;
                
                this.websocket = new WebSocket(wsUrl);
                this.websocket.onmessage = (event) => {{
                    const data = JSON.parse(event.data);
                    this.updateDashboard(data);
                }};
                
                this.websocket.onclose = () => {{
                    setTimeout(() => this.connectWebSocket(), 5000);
                }};
            }}
            
            async loadData() {{
                try {{
                    const [health, metrics, alerts, services] = await Promise.all([
                        fetch('/api/health').then(r => r.json()),
                        fetch('/api/metrics').then(r => r.json()),
                        fetch('/api/alerts').then(r => r.json()),
                        fetch('/api/services').then(r => r.json())
                    ]);
                    
                    this.updateDashboard({{ health, metrics, alerts, services }});
                }} catch (error) {{
                    console.error('Failed to load data:', error);
                }}
            }}
            
            updateDashboard(data) {{
                if (data.health) this.updateSystemOverview(data.health);
                if (data.services) this.updateServicesHealth(data.services);
                if (data.alerts) this.updateActiveAlerts(data.alerts);
                if (data.metrics) this.updateMetrics(data.metrics);
                
                document.getElementById('last-update').textContent = new Date().toLocaleTimeString();
            }}
            
            updateSystemOverview(health) {{
                const container = document.getElementById('system-overview');
                const statusClass = `status-${{health.status}}`;
                
                container.innerHTML = `
                    <div class="metric-item">
                        <span>Overall Status</span>
                        <span><span class="status-indicator ${{statusClass}}"></span>${{health.status}}</span>
                    </div>
                    <div class="metric-item">
                        <span>Uptime</span>
                        <span class="metric-value">${{this.formatUptime(health.uptime_seconds || 0)}}</span>
                    </div>
                    <div class="metric-item">
                        <span>Services</span>
                        <span class="metric-value">${{Object.keys(health.services || {{}}).length}}</span>
                    </div>
                `;
            }}
            
            updateServicesHealth(services) {{
                const container = document.getElementById('services-health');
                const servicesList = services.services || {{}};
                
                let html = '';
                for (const [name, service] of Object.entries(servicesList)) {{
                    const statusClass = `status-${{service.status}}`;
                    html += `
                        <div class="service-item">
                            <span class="service-name">${{name}}</span>
                            <span class="service-status">
                                <span class="status-indicator ${{statusClass}}"></span>
                                ${{service.status}}
                                <span style="margin-left: 10px; color: var(--text-muted);">
                                    ${{service.response_time_ms}}ms
                                </span>
                            </span>
                        </div>
                    `;
                }}
                
                container.innerHTML = html || '<div class="loading">No services found</div>';
            }}
            
            updateActiveAlerts(alerts) {{
                const container = document.getElementById('active-alerts');
                const activeAlerts = alerts.active_alerts || [];
                
                if (activeAlerts.length === 0) {{
                    container.innerHTML = '<div style="text-align: center; color: var(--text-muted);">No active alerts</div>';
                    return;
                }}
                
                let html = '';
                activeAlerts.forEach(alert => {{
                    const alertClass = `alert-${{alert.severity}}`;
                    html += `
                        <div class="alert-item ${{alertClass}}">
                            <div class="alert-title">${{alert.title}}</div>
                            <div class="alert-message">${{alert.message}}</div>
                            <div class="alert-actions">
                                <button class="btn btn-secondary btn-sm" onclick="dashboard.acknowledgeAlert('${{alert.id}}')">
                                    Acknowledge
                                </button>
                                <button class="btn btn-primary btn-sm" onclick="dashboard.resolveAlert('${{alert.id}}')">
                                    Resolve
                                </button>
                            </div>
                        </div>
                    `;
                }});
                
                container.innerHTML = html;
            }}
            
            updateMetrics(metrics) {{
                const container = document.getElementById('service-metrics');
                const summary = metrics.summary || {{}};
                
                container.innerHTML = `
                    <div class="metric-item">
                        <span>Total Requests</span>
                        <span class="metric-value">${{summary.total_requests || 0}}</span>
                    </div>
                    <div class="metric-item">
                        <span>Error Rate</span>
                        <span class="metric-value">${{(summary.error_rate || 0).toFixed(2)}}%</span>
                    </div>
                    <div class="metric-item">
                        <span>Avg Response Time</span>
                        <span class="metric-value">${{(summary.average_response_time_ms || 0).toFixed(0)}}ms</span>
                    </div>
                `;
                
                // Update chart placeholder
                document.getElementById('metrics-chart').innerHTML = `
                    <div class="chart-placeholder">
                        Metrics Chart (Chart.js integration needed)
                    </div>
                `;
            }}
            
            async acknowledgeAlert(alertId) {{
                try {{
                    await fetch(`/api/alerts/${{alertId}}/acknowledge`, {{ method: 'POST' }});
                    this.loadData();
                }} catch (error) {{
                    console.error('Failed to acknowledge alert:', error);
                }}
            }}
            
            async resolveAlert(alertId) {{
                try {{
                    await fetch(`/api/alerts/${{alertId}}/resolve`, {{ method: 'POST' }});
                    this.loadData();
                }} catch (error) {{
                    console.error('Failed to resolve alert:', error);
                }}
            }}
            
            startAutoRefresh() {{
                setInterval(() => this.loadData(), this.refreshInterval);
            }}
            
            toggleTheme() {{
                document.body.classList.toggle('light');
                localStorage.setItem('theme', document.body.classList.contains('light') ? 'light' : 'dark');
            }}
            
            formatUptime(seconds) {{
                const hours = Math.floor(seconds / 3600);
                const minutes = Math.floor((seconds % 3600) / 60);
                const secs = Math.floor(seconds % 60);
                return `${{hours}}h ${{minutes}}m ${{secs}}s`;
            }}
        }}
        
        // Initialize dashboard
        const dashboard = new MonitoringDashboard();
        
        // Load saved theme
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {{
            document.body.classList.add('light');
        }}
        """
    
    async def _update_metrics_loop(self):
        """Background task to update metrics"""
        while True:
            try:
                # Update metric history
                current_time = datetime.now()
                
                # Get current metrics
                health = health_monitor.get_overall_health()
                metrics_summary = metrics_collector.get_statistics()
                
                # Store in history
                for metric_name, value in [
                    ("cpu_usage", health.system_metrics.get("cpu_usage_percent", 0)),
                    ("memory_usage", health.system_metrics.get("memory_usage_percent", 0)),
                    ("total_requests", metrics_summary.get("total_requests", 0)),
                    ("error_rate", metrics_summary.get("error_rate", 0))
                ]:
                    if metric_name not in self.metric_history:
                        self.metric_history[metric_name] = []
                    
                    self.metric_history[metric_name].append({
                        "timestamp": current_time.isoformat(),
                        "value": value
                    })
                    
                    # Keep only recent history
                    if len(self.metric_history[metric_name]) > self.dashboard_config.max_history_points:
                        self.metric_history[metric_name] = self.metric_history[metric_name][-self.dashboard_config.max_history_points:]
                
                await asyncio.sleep(self.dashboard_config.refresh_interval)
                
            except Exception as e:
                print(f"Error in metrics update loop: {e}")
                await asyncio.sleep(5)
    
    async def _broadcast_updates_loop(self):
        """Background task to broadcast updates via WebSocket"""
        while True:
            try:
                if self.websocket_connections:
                    # Get latest data
                    health = health_monitor.get_overall_health()
                    metrics_summary = metrics_collector.get_statistics()
                    active_alerts = alerting_service.get_active_alerts()
                    
                    update_data = {
                        "type": "update",
                        "timestamp": datetime.now().isoformat(),
                        "health": health.to_dict(),
                        "metrics": metrics_summary,
                        "alerts": [alert.to_dict() for alert in active_alerts]
                    }
                    
                    # Send to all connected clients
                    disconnected = []
                    for websocket in self.websocket_connections:
                        try:
                            await websocket.send_text(json.dumps(update_data))
                        except:
                            disconnected.append(websocket)
                    
                    # Remove disconnected clients
                    for websocket in disconnected:
                        self.websocket_connections.remove(websocket)
                
                await asyncio.sleep(self.dashboard_config.alert_refresh_interval)
                
            except Exception as e:
                print(f"Error in broadcast loop: {e}")
                await asyncio.sleep(5)
    
    def run(self, host: str = "0.0.0.0", port: int = 3001):
        """Run the monitoring dashboard"""
        print(f"Starting monitoring dashboard on {host}:{port}")
        
        uvicorn.run(
            self.app,
            host=host,
            port=port,
            log_level="info",
            access_log=True
        )


# Global dashboard instance
dashboard = MonitoringDashboard()

if __name__ == "__main__":
    dashboard.run()
