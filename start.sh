#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=================================================================="
echo "⚡ Launching NPTEL Prep Master — Applied Accelerated AI"
echo "=================================================================="

# Check if node is installed
if command -v node >/dev/null 2>&1; then
    echo "Starting Node.js web server on http://localhost:3000..."
    node server.js
elif command -v python3 >/dev/null 2>&1; then
    echo "Node.js not detected. Starting Python HTTP server on http://localhost:3000..."
    python3 -m http.server 3000
else
    echo "Opening index.html in default browser..."
    open index.html
fi
