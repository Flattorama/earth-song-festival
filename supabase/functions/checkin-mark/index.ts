// Registration-desk write endpoint.
//
// Accepts a BATCH of actions so the gate tablet can queue offline and flush
// everything when it regains signal. Every action is idempotent.
//
// Auth: x-checkin-token header, compared against the CHECKIN_TOKEN secret.
// Deploy with --no-verify-jwt.
//
// Body:
//   { actions: [
//       { attendeeId, type: "check-in",          at?: ISO8601 },
//       { attendeeId, type: "undo-check-in" },
//       { attendeeId, type: "paper-waiver",      at?: ISO8601, note?: string },
//       { attendeeId, type: "undo-paper-waiver" }
//   ] }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey, X-Checkin-Token",
};

type ActionType =
  | "check-in"
  | "undo-check-in"
  | "paper-waiver"
  | "undo-paper-waiver";

interface Action {
  attendeeId?: string;
  type?: ActionType;
  at?: string;
  note?: string;
}

function json(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function safeTimestamp(value: unknown): string {
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date().toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const expected = Deno.env.get("CHECKIN_TOKEN");
    const provided = req.headers.get("x-checkin-token");

    if (!expected || provided !== expected) {
      return json({ error: "Unauthorized" }, 403);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      return json({ error: "Supabase is not configured" }, 500);
    }

    const body = await req.json();
    const actions: Action[] = Array.isArray(body?.actions) ? body.actions : [];

    if (actions.length === 0) {
      return json({ error: "No actions supplied" }, 400);
    }
    if (actions.length > 200) {
      return json({ error: "Too many actions in one batch (max 200)" }, 400);
    }

    const { createClient } = await import(
      "https://esm.sh/@supabase/supabase-js@2.49.4"
    );
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results: Array<{ attendeeId: string; type: string; ok: boolean; error?: string }> = [];

    for (const action of actions) {
      const attendeeId = typeof action.attendeeId === "string" ? action.attendeeId : "";
      const type = action.type;

      if (!attendeeId || !type) {
        results.push({ attendeeId, type: String(type), ok: false, error: "Malformed action" });
        continue;
      }

      let patch: Record<string, unknown>;

      switch (type) {
        case "check-in":
          patch = { checked_in_at: safeTimestamp(action.at) };
          break;
        case "undo-check-in":
          patch = { checked_in_at: null };
          break;
        case "paper-waiver":
          // Signed on paper at the desk. Recorded distinctly from a
          // Smartwaiver signature so the paper copies can be scanned and
          // reconciled after the weekend.
          patch = {
            waiver_status: "signed",
            waiver_signed_at: safeTimestamp(action.at),
            smartwaiver_id: "PAPER-AT-DESK",
            checked_in_at: safeTimestamp(action.at),
          };
          break;
        case "undo-paper-waiver": {
          // Reverses a mis-tap. Deliberately refuses to touch a real
          // Smartwaiver signature — only desk-entered paper records.
          const { data: existing, error: readError } = await supabase
            .from("attendees")
            .select("smartwaiver_id")
            .eq("id", attendeeId)
            .maybeSingle();

          if (readError) {
            results.push({ attendeeId, type, ok: false, error: readError.message });
            continue;
          }
          if (!existing || existing.smartwaiver_id !== "PAPER-AT-DESK") {
            results.push({
              attendeeId,
              type,
              ok: false,
              error: "Not a paper-at-desk waiver; refusing to clear",
            });
            continue;
          }

          patch = {
            waiver_status: "pending",
            waiver_signed_at: null,
            smartwaiver_id: null,
            checked_in_at: null,
          };
          break;
        }
        default:
          results.push({ attendeeId, type: String(type), ok: false, error: "Unknown action type" });
          continue;
      }

      const { error } = await supabase
        .from("attendees")
        .update(patch)
        .eq("id", attendeeId);

      results.push(
        error
          ? { attendeeId, type, ok: false, error: error.message }
          : { attendeeId, type, ok: true },
      );
    }

    const failed = results.filter((r) => !r.ok);
    if (failed.length > 0) {
      console.error("[checkin-mark] Failed actions:", JSON.stringify(failed));
    }

    return json({ applied: results.length - failed.length, failed, results }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[checkin-mark] ERROR:", message);
    return json({ error: message }, 500);
  }
});
