#!/usr/bin/env bash
#
# MailerLite Webhook Setup Script
#
# This script registers webhooks with MailerLite so that new subscriber events
# are forwarded to the Google Apps Script endpoint, which writes them to
# the Google Sheet.
#
# PREREQUISITES:
# 1. Deploy the Google Apps Script (Code.gs) as a web app and copy the URL
# 2. Get your MailerLite API key from: MailerLite → Integrations → API
#
# USAGE:
#   export MAILERLITE_API_KEY="your-api-key-here"
#   export APPS_SCRIPT_URL="https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
#   bash setup-mailerlite-webhooks.sh
#
# This script will:
# 1. List your MailerLite groups (so you can update GROUP_TO_TAB in Code.gs)
# 2. Register webhooks for subscriber events
# 3. Verify the webhooks are active

set -euo pipefail

# ---------------------------------------------------------------------------
# Validate environment
# ---------------------------------------------------------------------------

if [ -z "${MAILERLITE_API_KEY:-}" ]; then
  echo "ERROR: MAILERLITE_API_KEY is not set."
  echo "Export it first: export MAILERLITE_API_KEY='your-key'"
  exit 1
fi

if [ -z "${APPS_SCRIPT_URL:-}" ]; then
  echo "ERROR: APPS_SCRIPT_URL is not set."
  echo "Export it first: export APPS_SCRIPT_URL='https://script.google.com/macros/s/.../exec'"
  exit 1
fi

API_BASE="https://connect.mailerlite.com/api"
AUTH_HEADER="Authorization: Bearer ${MAILERLITE_API_KEY}"
CONTENT_TYPE="Content-Type: application/json"

# ---------------------------------------------------------------------------
# Step 1: List groups (so you can map group IDs in Code.gs)
# ---------------------------------------------------------------------------

echo "============================================"
echo "Step 1: Fetching your MailerLite groups..."
echo "============================================"
echo ""

groups_response=$(curl -s -X GET "${API_BASE}/groups?limit=50" \
  -H "${AUTH_HEADER}" \
  -H "${CONTENT_TYPE}")

echo "Your MailerLite groups:"
echo "${groups_response}" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for g in data.get('data', []):
    print(f\"  ID: {g['id']}  |  Name: {g['name']}  |  Subscribers: {g['active_count']}\")
" 2>/dev/null || echo "${groups_response}"

echo ""
echo ">>> Update GROUP_TO_TAB in Code.gs with the group IDs above <<<"
echo ""

# ---------------------------------------------------------------------------
# Step 2: List existing webhooks
# ---------------------------------------------------------------------------

echo "============================================"
echo "Step 2: Checking existing webhooks..."
echo "============================================"
echo ""

existing=$(curl -s -X GET "${API_BASE}/webhooks" \
  -H "${AUTH_HEADER}" \
  -H "${CONTENT_TYPE}")

echo "Existing webhooks:"
echo "${existing}" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for w in data.get('data', []):
    print(f\"  ID: {w['id']}  |  URL: {w['url']}  |  Events: {', '.join(w.get('events', []))}\")
if not data.get('data'):
    print('  (none)')
" 2>/dev/null || echo "${existing}"
echo ""

# ---------------------------------------------------------------------------
# Step 3: Create webhooks for subscriber events
# ---------------------------------------------------------------------------

echo "============================================"
echo "Step 3: Registering webhooks..."
echo "============================================"
echo ""

# Webhook for: subscriber added to a group (covers both form types)
echo "Creating webhook for subscriber.added_to_group..."
result=$(curl -s -X POST "${API_BASE}/webhooks" \
  -H "${AUTH_HEADER}" \
  -H "${CONTENT_TYPE}" \
  -d "{
    \"url\": \"${APPS_SCRIPT_URL}\",
    \"events\": [\"subscriber.added_to_group\"]
  }")

echo "${result}" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if 'data' in data:
    print(f\"  Created webhook ID: {data['data']['id']}\")
    print(f\"  URL: {data['data']['url']}\")
    print(f\"  Events: {', '.join(data['data'].get('events', []))}\")
else:
    print(f\"  Response: {json.dumps(data, indent=2)}\")
" 2>/dev/null || echo "${result}"
echo ""

# NOTE: We intentionally do NOT register a separate subscriber.create webhook.
# When a subscriber fills out a form, MailerLite fires both subscriber.create
# AND subscriber.added_to_group, which causes duplicate rows in the sheet.
# The subscriber.added_to_group event alone is sufficient — it fires for both
# form signups and direct API additions that include a group.
echo "Skipping subscriber.create webhook (would cause duplicate entries)."
echo ""

# ---------------------------------------------------------------------------
# Step 4: Verify
# ---------------------------------------------------------------------------

echo "============================================"
echo "Step 4: Verifying webhooks..."
echo "============================================"
echo ""

final=$(curl -s -X GET "${API_BASE}/webhooks" \
  -H "${AUTH_HEADER}" \
  -H "${CONTENT_TYPE}")

echo "Active webhooks:"
echo "${final}" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for w in data.get('data', []):
    status = '✓' if w.get('enabled', True) else '✗'
    print(f\"  {status} ID: {w['id']}  |  Events: {', '.join(w.get('events', []))}  |  URL: {w['url']}\")
if not data.get('data'):
    print('  (none)')
" 2>/dev/null || echo "${final}"

echo ""
echo "============================================"
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update GROUP_TO_TAB in Code.gs with your group IDs (from Step 1)"
echo "2. Re-deploy the Apps Script if you made changes"
echo "3. Test by submitting a form on your site"
echo "4. Check the Google Sheet for the new row"
echo "5. If something went wrong, check the '_Webhook Log' tab"
echo "============================================"
