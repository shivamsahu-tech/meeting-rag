#!/bin/bash

echo "Setting up WebRTC Audio Streaming for Meeting RAG..."

# Install server dependencies
echo "Installing server dependencies..."
cd server
source venv/bin/activate
pip install -r requirements.txt

# Install client dependencies
echo "Installing client dependencies..."
cd ../client
npm install

echo "Setup complete!"
echo ""
echo "To start the application:"
echo "1. Start the server: cd server && source venv/bin/activate && python main.py"
echo "2. Start the client: cd client && npm run dev"
echo ""
echo "The WebRTC audio streaming will be available at:"
echo "- Server: http://localhost:8000"
echo "- Client: http://localhost:3000/meeting"
