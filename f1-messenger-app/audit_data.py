#!/usr/bin/env python3
"""
F1-MCP-Server Data Audit Script
This script verifies that our bridge is returning real F1 data, not simulated results.
"""

import requests
import json

def audit_f1_data():
    print("=== AUDITING F1-MCP-SERVER DATA ===")
    
    # Test 1: Championship standings for 2023
    print("\n1. Testing 2023 Championship Standings...")
    try:
        response = requests.post('http://localhost:3001/mcp/tool', 
            json={'name': 'get_championship_standings', 'arguments': {'year': 2023}},
            headers={'Content-Type': 'application/json'},
            timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'success':
                content = data['data']['content'][0]['text']
                f1_data = json.loads(content)
                drivers = f1_data['data']['drivers']
                
                print(f"Found {len(drivers)} drivers in 2023 championship")
                champion = drivers[0]
                print(f"Champion: {champion.get('givenName')} {champion.get('familyName')} - {champion.get('points')} points")
                
                # Real 2023 verification: Max Verstappen won with 575 points
                if 'Verstappen' in champion.get('familyName', '') and float(champion.get('points', 0)) > 500:
                    print("✅ VERIFIED: Real 2023 data - Max Verstappen champion")
                else:
                    print("❌ SUSPICIOUS: Doesn't match known 2023 results")
            else:
                print(f"❌ Error: {data.get('message')}")
        else:
            print(f"❌ HTTP Error: {response.status_code}")
    except Exception as e:
        print(f"❌ Exception: {e}")
    
    # Test 2: Event schedule for 2023 
    print("\n2. Testing 2023 Event Schedule...")
    try:
        response = requests.post('http://localhost:3001/mcp/tool',
            json={'name': 'get_event_schedule', 'arguments': {'year': 2023}},
            headers={'Content-Type': 'application/json'},
            timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'success':
                content = data['data']['content'][0]['text']
                f1_data = json.loads(content)
                events = f1_data['data']
                
                print(f"Found {len(events)} events in 2023")
                
                # Check for known 2023 races
                race_names = [event.get('EventName', '') for event in events]
                if 'Bahrain Grand Prix' in race_names and 'Abu Dhabi Grand Prix' in race_names:
                    print("✅ VERIFIED: Real 2023 calendar with expected races")
                else:
                    print("❌ SUSPICIOUS: Missing expected 2023 races")
            else:
                print(f"❌ Error: {data.get('message')}")
        else:
            print(f"❌ HTTP Error: {response.status_code}")
    except Exception as e:
        print(f"❌ Exception: {e}")
    
    # Test 3: Lewis Hamilton driver info
    print("\n3. Testing Lewis Hamilton Driver Info...")
    try:
        response = requests.post('http://localhost:3001/mcp/tool',
            json={'name': 'get_driver_info', 'arguments': {
                'year': 2023, 
                'event_identifier': '10',  # British GP
                'session_name': 'Race',
                'driver_identifier': 'HAM'
            }},
            headers={'Content-Type': 'application/json'},
            timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'success':
                content = data['data']['content'][0]['text']
                f1_data = json.loads(content)
                driver = f1_data['data']
                
                print(f"Driver: {driver.get('FullName')} (#{driver.get('DriverNumber')})")
                print(f"Team: {driver.get('TeamName')}")
                print(f"Position: {driver.get('Position')}")
                
                # Verify this is real Lewis Hamilton data
                if driver.get('FullName') == 'Lewis Hamilton' and driver.get('DriverNumber') == '44':
                    print("✅ VERIFIED: Real Lewis Hamilton data")
                else:
                    print("❌ SUSPICIOUS: Data doesn't match Lewis Hamilton")
            else:
                print(f"❌ Error: {data.get('message')}")
        else:
            print(f"❌ HTTP Error: {response.status_code}")
    except Exception as e:
        print(f"❌ Exception: {e}")
    
    print("\n=== AUDIT COMPLETE ===")

if __name__ == "__main__":
    audit_f1_data() 