#!/bin/bash

# Start server in background
PORT=3001
export PORT
export $(cat .env | xargs)
node .output/server/index.mjs &
SERVER_PID=$!

echo "Waiting for server to start on port $PORT..."
sleep 5

TOKEN="${ADMIN_TOKEN}"
BASE_URL="http://localhost:$PORT/api/admin/export/attempts"

echo "1. Testing JSON Export..."
curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL?format=json" > export_test.json
if grep -q '"ok":true' export_test.json; then
    echo "PASS: JSON export received"
else
    echo "FAIL: JSON export invalid"
    cat export_test.json
    kill $SERVER_PID
    exit 1
fi

echo "2. Testing CSV Export..."
curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL?format=csv" > export_test.csv
if grep -q 'attempt_id,user_id,rule_id' export_test.csv; then
    echo "PASS: CSV header correct"
else
    echo "FAIL: CSV header missing"
    cat export_test.csv
    kill $SERVER_PID
    exit 1
fi

# Cleanup
kill $SERVER_PID
rm export_test.json export_test.csv
echo "SUCCESS: Export API verified"
