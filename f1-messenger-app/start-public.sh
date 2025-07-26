#!/bin/bash

# Start F1 agent server
echo "Starting F1 Agent Server..."
npm run start:agent &

# Wait for server to start
sleep 5

# Start ngrok tunnel
echo "Starting ngrok tunnel..."
ngrok http 11435

echo "F1 Agent is now accessible at the ngrok URL above"
echo "Update your Firebase app to use the ngrok URL instead of localhost:11435" 