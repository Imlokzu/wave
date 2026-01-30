#!/bin/bash

# WaveChat Android VPS Startup Script
# This script starts all WaveChat services on your Android tablet

echo "🌊 Starting WaveChat..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}PM2 not found. Installing...${NC}"
    npm install -g pm2
fi

# Navigate to project directory
cd "$(dirname "$0")"

# Start backend
echo -e "${GREEN}Starting backend...${NC}"
cd backend
pm2 start npm --name "wavechat-backend" -- start
cd ..

# Start feed bot (optional)
if [ -d "feed-bot" ]; then
    echo -e "${GREEN}Starting Telegram feed bot...${NC}"
    cd feed-bot
    pm2 start telegram-scraper.py --name "wavechat-feedbot" --interpreter python
    cd ..
fi

# Save PM2 configuration
pm2 save

# Show status
echo -e "${GREEN}✅ WaveChat started successfully!${NC}"
echo ""
pm2 status

# Show access information
echo ""
echo -e "${GREEN}📱 Access your app at:${NC}"
echo -e "   Local: ${YELLOW}http://localhost:3001${NC}"
echo -e "   Network: ${YELLOW}http://$(hostname -I | awk '{print $1}'):3001${NC}"
echo ""
echo -e "${GREEN}📊 Monitor logs:${NC}"
echo -e "   ${YELLOW}pm2 logs${NC}"
echo ""
echo -e "${GREEN}🛑 Stop services:${NC}"
echo -e "   ${YELLOW}pm2 stop all${NC}"
echo ""
