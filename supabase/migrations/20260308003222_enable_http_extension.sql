/*
  # Enable http extension for Google Sheets sync trigger

  Enables the http extension so the trigger function can make
  outbound HTTP calls to the google-sheets-sync Edge Function.
*/

CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;
