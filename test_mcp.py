#!/usr/bin/env python3
"""
Test script to debug MCP communication
"""

import subprocess
import json
import sys
import os

def test_mcp_communication():
    """Test MCP communication with the F1 server"""
    
    # Prepare the command
    cmd = [
        sys.executable, 
        "-m", 
        "f1_mcp_server.server",
        "--transport", 
        "stdio"
    ]
    
    # Create the MCP request
    mcp_request = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "get_session_results",
            "arguments": {
                "year": 2025,
                "event_identifier": "British Grand Prix",
                "session_name": "Race"
            }
        }
    }
    
    print("Sending MCP request:")
    print(json.dumps(mcp_request, indent=2))
    
    # Call the MCP server via subprocess
    process = subprocess.Popen(
        cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        cwd=os.getcwd()
    )
    
    # Send the request
    request_json = json.dumps(mcp_request) + "\n"
    print(f"\nSending request: {request_json.strip()}")
    
    stdout, stderr = process.communicate(input=request_json)
    
    print(f"\nReturn code: {process.returncode}")
    print(f"Stdout: {stdout}")
    print(f"Stderr: {stderr}")
    
    if process.returncode != 0:
        print(f"Process failed with return code: {process.returncode}")
        return
    
    # Try to parse the response
    try:
        response = json.loads(stdout.strip())
        print(f"\nParsed response: {json.dumps(response, indent=2)}")
    except json.JSONDecodeError as e:
        print(f"Failed to parse response: {e}")
        print(f"Raw response: {stdout}")

if __name__ == "__main__":
    test_mcp_communication() 