/**
 * MailerLite → Google Sheets Webhook Handler
 *
 * This Google Apps Script receives webhook events from MailerLite when new
 * subscribers are added via embedded forms, and appends their data to the
 * correct tab in the connected Google Sheet.
 *
 * SETUP:
 * 1. Open the Google Sheet:
 *    https://docs.google.com/spreadsheets/d/10ID1i6hIpcafKiaWHInzHrWLmtMvMtiF6TlSD4x9sHw
 * 2. Go to Extensions → Apps Script
 * 3. Replace the default Code.gs content with this file
 * 4. Replace appsscript.json with the provided manifest
 * 5. Update the GROUP_TO_TAB mapping below with your actual MailerLite group IDs
 * 6. Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 7. Copy the deployment URL and use it to configure MailerLite webhooks
 *    (see setup-mailerlite-webhooks.sh)
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

var SPREADSHEET_ID = "10ID1i6hIpcafKiaWHInzHrWLmtMvMtiF6TlSD4x9sHw";

/**
 * Map MailerLite group IDs to Google Sheet tab names.
 * Update these with your actual MailerLite group IDs.
 * You can find group IDs in MailerLite → Subscribers → Groups,
 * or via the MailerLite API: GET https://connect.mailerlite.com/api/groups
 */
var GROUP_TO_TAB = {
  "180087495434187685": "Newsletter Signups",   // Earth Song Festival Web Sign Ups
  "volunteer_group_id": "Volunteer Applications" // Update with real volunteer group ID
};

/**
 * Column headers for each tab. The script will write data in this order.
 * Adjust these to match the columns already in your sheet.
 */
var TAB_COLUMNS = {
  "Newsletter Signups": [
    "Timestamp",
    "Email",
    "First Name",
    "Last Name",
    "Source"
  ],
  "Volunteer Applications": [
    "Timestamp",
    "Email",
    "First Name",
    "Last Name",
    "Phone",
    "Source"
  ]
};

// ---------------------------------------------------------------------------
// Webhook Endpoint
// ---------------------------------------------------------------------------

/**
 * Handles POST requests from MailerLite webhooks.
 */
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    logRawPayload(e.postData.contents);

    // MailerLite new API (connect.mailerlite.com) wraps events in an array
    if (Array.isArray(payload.events) && payload.events.length > 0) {
      var results = payload.events.map(function(event) {
        return processWebhookEvent(event);
      });
      return ContentService
        .createTextOutput(JSON.stringify({ status: "ok", results: results }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Backward compatibility: flat payload format (classic MailerLite API)
    var result = processWebhookEvent(payload);
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    logError("doPost", err, e ? e.postData.contents : "no payload");
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handles GET requests (used by MailerLite to verify the webhook URL).
 */
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "ok", service: "earth-song-mailerlite-webhook" }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------------------
// Event Processing
// ---------------------------------------------------------------------------

function processWebhookEvent(payload) {
  // MailerLite webhook payload structure
  // MailerLite sends subscriber and group at the top level (not nested under data)
  var eventType = payload.type || payload.event || "";
  var subscriber = payload.subscriber || (payload.data && payload.data.subscriber) || payload.data || {};
  var group = payload.group || (payload.data && payload.data.group) || {};

  // Determine which tab to write to
  var tabName = resolveTabName(group, eventType, subscriber);
  if (!tabName) {
    // If we can't determine the tab, log to a fallback
    logUnmapped(payload);
    return { status: "skipped", reason: "unmapped_group", group_id: group.id, group_name: group.name };
  }

  // Extract subscriber fields
  var fields = subscriber.fields || {};
  var email = subscriber.email || "";
  var firstName = fields.name || fields.first_name || "";
  var lastName = fields.last_name || "";
  var phone = fields.phone || "";
  var source = subscriber.source || "mailerlite_form";
  var timestamp = new Date().toISOString();

  // Build the row based on the tab's column config
  var columns = TAB_COLUMNS[tabName] || ["Timestamp", "Email", "First Name", "Last Name", "Source"];
  var row = columns.map(function(col) {
    switch (col) {
      case "Timestamp":  return timestamp;
      case "Email":      return email;
      case "First Name": return firstName;
      case "Last Name":  return lastName;
      case "Phone":      return phone;
      case "Source":     return source;
      default:           return fields[col.toLowerCase().replace(/ /g, "_")] || "";
    }
  });

  // Append to sheet
  appendRow(tabName, row);

  return { status: "ok", tab: tabName, email: email };
}

/**
 * Resolves the sheet tab name from the webhook payload.
 * Checks group ID first, then subscriber fields to distinguish
 * volunteer form fills (which include phone) from newsletter signups.
 */
function resolveTabName(group, eventType, subscriber) {
  // Check subscriber fields first — the volunteer form collects phone
  // while the newsletter form does not. This must run before the group ID
  // check because both forms add to the same MailerLite group.
  var fields = (subscriber && subscriber.fields) || {};
  if (fields.phone) {
    return "Volunteer Applications";
  }

  // Check by group name for a dedicated volunteer group
  var groupName = (group.name || "").toLowerCase();
  if (groupName.indexOf("volunteer") !== -1) {
    return "Volunteer Applications";
  }

  // Check by group ID
  if (group.id && GROUP_TO_TAB[String(group.id)]) {
    return GROUP_TO_TAB[String(group.id)];
  }

  // Any known group name → newsletter
  if (groupName.indexOf("newsletter") !== -1 || groupName.indexOf("web sign") !== -1 || groupName.indexOf("earth song") !== -1) {
    return "Newsletter Signups";
  }
  if (eventType === "subscriber.created" || eventType === "subscriber.create" || eventType === "subscriber.added_through_form") {
    return "Newsletter Signups";
  }

  return null;
}

// ---------------------------------------------------------------------------
// Google Sheets Helpers
// ---------------------------------------------------------------------------

function appendRow(tabName, row) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(tabName);

  if (!sheet) {
    // Create the tab if it doesn't exist, with headers
    sheet = ss.insertSheet(tabName);
    var columns = TAB_COLUMNS[tabName] || ["Timestamp", "Email", "First Name", "Last Name", "Source"];
    sheet.appendRow(columns);
  }

  sheet.appendRow(row);
  SpreadsheetApp.flush();
}

// ---------------------------------------------------------------------------
// Logging & Debugging
// ---------------------------------------------------------------------------

/**
 * Logs unmapped webhook events to a "_Webhook Log" tab for debugging.
 */
function logUnmapped(payload) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var logSheet = ss.getSheetByName("_Webhook Log");

  if (!logSheet) {
    logSheet = ss.insertSheet("_Webhook Log");
    logSheet.appendRow(["Timestamp", "Event Type", "Group ID", "Group Name", "Raw Payload"]);
  }

  var group = (payload.data && payload.data.group) || {};
  logSheet.appendRow([
    new Date().toISOString(),
    payload.type || "unknown",
    group.id || "",
    group.name || "",
    JSON.stringify(payload).substring(0, 5000)
  ]);
}

/**
 * Logs raw incoming webhook payload for debugging.
 * Check the "_Webhook Log" tab to see what MailerLite is actually sending.
 */
function logRawPayload(rawContents) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var logSheet = ss.getSheetByName("_Webhook Log");
    if (!logSheet) {
      logSheet = ss.insertSheet("_Webhook Log");
      logSheet.appendRow(["Timestamp", "Event Type", "Group ID", "Group Name", "Raw Payload"]);
    }
    logSheet.appendRow([
      new Date().toISOString(),
      "RAW_INCOMING",
      "",
      "",
      String(rawContents).substring(0, 5000)
    ]);
  } catch (e) {
    // Silently fail — don't let logging break the webhook handler
  }
}

function logError(context, error, details) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var logSheet = ss.getSheetByName("_Webhook Log");

  if (!logSheet) {
    logSheet = ss.insertSheet("_Webhook Log");
    logSheet.appendRow(["Timestamp", "Event Type", "Group ID", "Group Name", "Raw Payload"]);
  }

  logSheet.appendRow([
    new Date().toISOString(),
    "ERROR: " + context,
    error.message,
    error.stack || "",
    String(details).substring(0, 5000)
  ]);
}

// ---------------------------------------------------------------------------
// Test Helper (run manually from Apps Script editor)
// ---------------------------------------------------------------------------

/**
 * Simulates a MailerLite webhook to test the integration.
 * Run this from the Apps Script editor to verify everything works.
 */
function testWebhook() {
  var mockPayload = {
    type: "subscriber.added_to_group",
    subscriber: {
      email: "test@example.com",
      source: "api",
      fields: {
        name: "Test",
        last_name: "User",
        phone: "555-0100"
      }
    },
    group: {
      id: "180087495434187685",
      name: "Earth Song Festival Web Sign Ups"
    }
  };

  var result = processWebhookEvent(mockPayload);
  Logger.log("Test result: " + JSON.stringify(result));
}

/**
 * Tests the wrapped events-array format used by MailerLite's new API.
 * Run this from the Apps Script editor to verify the fix works.
 */
function testWebhookWrapped() {
  var mockPayload = {
    events: [
      {
        type: "subscriber.added_to_group",
        fired_at: "2026-03-17T00:00:00.000000Z",
        data: {
          subscriber: {
            email: "test-wrapped@example.com",
            source: "api",
            fields: {
              name: "Wrapped",
              last_name: "Test"
            }
          },
          group: {
            id: "180087495434187685",
            name: "Earth Song Festival Web Sign Ups"
          }
        }
      }
    ]
  };

  // Simulate what doPost now does
  if (Array.isArray(mockPayload.events)) {
    mockPayload.events.forEach(function(event) {
      var result = processWebhookEvent(event);
      Logger.log("Wrapped test result: " + JSON.stringify(result));
    });
  }
}
