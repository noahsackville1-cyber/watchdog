#!/bin/bash
set -e

echo "🐕 Building Watchdog..."

echo "→ Installing frontend dependencies..."
cd frontend
npm install

echo "→ Building frontend..."
npm run build

echo "→ Frontend built to backend/static/"
cd ..

echo "→ Building Docker image..."
docker build -t watchdog .

echo ""
echo "✅ Build complete!"
echo ""
echo "Run with:  docker compose up -d"
echo "Open:      http://localhost:8000"
