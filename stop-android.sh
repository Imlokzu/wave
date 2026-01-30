#!/bin/bash

# WaveChat Android VPS Stop Script
# This script stops all WaveChat services

echo "🛑 Stopping WaveChat..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

# Stop all PM2 processes
pm2 stop all

echo -e "${GREEN}✅ All services stopped${NC}"
echo ""
pm2 status
