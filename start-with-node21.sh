#!/bin/bash

# Force Node.js 21
export PATH="/opt/plesk/node/21/bin:$PATH"

# Check which node is being used
echo "Using Node.js: $(node --version)"

# Start the app
exec node dist/server.js
