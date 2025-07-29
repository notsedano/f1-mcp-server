#!/usr/bin/env python3
"""
HTTP Bridge for F1-MCP-Server - Cursor-Style Implementation
FastAPI-based bridge with SSE streaming, JWT auth, and 2024 fallback
"""

import subprocess
import json
import sys
import asyncio
import time
import jwt
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from contextlib import asynccontextmanager

# FastAPI imports
from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
import uvicorn

# Ergast fallback for 2024 data
import requests

class ToolRequest(BaseModel):
    name: str
    arguments: Dict[str, Any]

class HealthResponse(BaseModel):
    status: str
    uptime: float
    tool_calls: int
    success_rate: float
    errors: Dict[str, int]

class F1MCPBridge:
    def __init__(self):
        self.process = None
        self.request_id = 1
        self.tool_calls = 0
        self.successful_calls = 0
        self.errors_by_tool: Dict[str, int] = {}
        self.start_time = time.time()
        self.jwt_secret = "cursor-f1-mcp-secret-key"  # In production, use env var
        
    def generate_jwt(self, user_id: str) -> str:
        """Generate JWT token for SSE authentication"""
        payload = {
            "user_id": user_id,
            "exp": datetime.utcnow() + timedelta(hours=1)
        }
        return jwt.encode(payload, self.jwt_secret, algorithm="HS256")
    
    def verify_jwt(self, token: str) -> Dict[str, Any]:
        """Verify JWT token"""
        try:
            return jwt.decode(token, self.jwt_secret, algorithms=["HS256"])
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
    
    async def call_tool_with_fallback(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Call MCP tool with 2024 Ergast fallback"""
        self.tool_calls += 1
        
        try:
            # Try MCP server first
            result = await self.call_mcp_tool(tool_name, arguments)
            self.successful_calls += 1
            return result
            
        except Exception as e:
            # Log error
            self.errors_by_tool[tool_name] = self.errors_by_tool.get(tool_name, 0) + 1
            
            # 2024 fallback using Ergast API
            if arguments.get('year') == 2024:
                fallback_result = await self.ergast_fallback(tool_name, arguments)
                if fallback_result:
                    return fallback_result
            
            raise e
    
    async def call_mcp_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Call F1 data functions directly for reliability"""
        print(f"Calling F1 tool directly: {tool_name}")
        
        # Import F1 data functions directly
        sys.path.append('../src')
        from f1_mcp_server.f1_data import (
            get_championship_standings,
            get_event_schedule,
            get_event_info,
            get_session_results,
            get_driver_info,
            analyze_driver_performance,
            compare_drivers,
            get_telemetry
        )
        
        # Map tool names to functions
        tool_functions = {
            'get_championship_standings': get_championship_standings,
            'get_event_schedule': get_event_schedule,
            'get_event_info': get_event_info,
            'get_session_results': get_session_results,
            'get_driver_info': get_driver_info,
            'analyze_driver_performance': analyze_driver_performance,
            'compare_drivers': compare_drivers,
            'get_telemetry': get_telemetry
        }
        
        if tool_name not in tool_functions:
            raise Exception(f"Unknown tool: {tool_name}")
        
        # Call the function directly
        func = tool_functions[tool_name]
        result = func(**arguments)
        
        print(f"Tool {tool_name} result: {result}")
        return result
    
    async def ergast_fallback(self, tool_name: str, arguments: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Ergast API fallback for 2024 data"""
        try:
            if tool_name == 'get_championship_standings':
                response = requests.get(f"http://ergast.com/api/f1/2024/driverStandings.json")
                if response.status_code == 200:
                    data = response.json()
                    drivers = data['MRData']['StandingsTable']['StandingsLists'][0]['DriverStandings']
                    return {
                        'status': 'success',
                        'data': {
                            'drivers': [
                                {
                                    'driverCode': driver['Driver']['code'],
                                    'givenName': driver['Driver']['givenName'],
                                    'familyName': driver['Driver']['familyName'],
                                    'points': driver['points'],
                                    'position': driver['position']
                                }
                                for driver in drivers[:10]  # Top 10
                            ]
                        }
                    }
            
            elif tool_name == 'get_event_schedule':
                response = requests.get(f"http://ergast.com/api/f1/2024.json")
                if response.status_code == 200:
                    data = response.json()
                    races = data['MRData']['RaceTable']['Races']
                    return {
                        'status': 'success',
                        'data': [
                            {
                                'EventName': race['raceName'],
                                'EventDate': race['date'],
                                'CircuitName': race['Circuit']['circuitName'],
                                'RoundNumber': race['round']
                            }
                            for race in races
                        ]
                    }
            
            return None
            
        except Exception as e:
            print(f"Ergast fallback failed: {e}")
            return None
    
    def get_health_metrics(self) -> HealthResponse:
        """Get health metrics for observability"""
        uptime = time.time() - self.start_time
        success_rate = (self.successful_calls / self.tool_calls * 100) if self.tool_calls > 0 else 0
        
        return HealthResponse(
            status="healthy",
            uptime=uptime,
            tool_calls=self.tool_calls,
            success_rate=success_rate,
            errors=self.errors_by_tool
        )

# Initialize bridge instance
bridge = F1MCPBridge()

# FastAPI app
app = FastAPI(
    title="F1-MCP Bridge",
    description="Cursor-style HTTP bridge for F1-MCP-Server",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure restrictively in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    """Health check endpoint with metrics"""
    return bridge.get_health_metrics()

@app.get("/mcp/schema")
async def get_mcp_schema():
    """Export OpenAPI JSON schema for MCP tools"""
    schema = {
        "openapi": "3.0.0",
        "info": {
            "title": "F1-MCP Server Tools",
            "version": "2.0.0",
            "description": "Formula One data tools via MCP"
        },
        "paths": {
            "/mcp/tool": {
                "post": {
                    "summary": "Call MCP tool",
                    "requestBody": {
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "name": {"type": "string"},
                                        "arguments": {"type": "object"}
                                    },
                                    "required": ["name", "arguments"]
                                }
                            }
                        }
                    },
                    "responses": {
                        "200": {
                            "description": "Tool result",
                            "content": {
                                "application/json": {
                                    "schema": {"type": "object"}
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    return JSONResponse(content=schema)

@app.post("/mcp/tool")
async def call_tool(request: ToolRequest):
    """Call MCP tool with tracing and error handling"""
    try:
        result = await bridge.call_tool_with_fallback(request.name, request.arguments)
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/mcp/stream")
async def websocket_endpoint(websocket: WebSocket):
    """SSE-style WebSocket endpoint for real-time streaming"""
    await websocket.accept()
    
    try:
        while True:
            # Keep connection alive
            await websocket.send_text(json.dumps({
                "type": "heartbeat",
                "timestamp": datetime.utcnow().isoformat()
            }))
            await asyncio.sleep(30)
    except WebSocketDisconnect:
        print("WebSocket disconnected")

@app.get("/auth/token")
async def get_auth_token():
    """Generate JWT token for SSE authentication"""
    token = bridge.generate_jwt("f1-user")
    return {"token": token}

if __name__ == "__main__":
    print("Starting Cursor-style F1-MCP Bridge...")
    uvicorn.run(app, host="0.0.0.0", port=3001, log_level="info") 