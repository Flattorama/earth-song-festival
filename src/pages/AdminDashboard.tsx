import { useCallback, useEffect, useState } from "react";
import {
  Loader as Loader2,
  RefreshCw,
  Shield,
  ShieldCheck,
  Clock,
  Copy,
  FileText,
  Send,
  TriangleAlert,
  Undo2,
} from "lucide-react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AttendeeRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  is_buyer: boolean;
  is_minor: boolean;
  waiver_status: string;
  waiver_signed_at: string | null;
  waiver_signed_method: string | null;
  waiver_email_sent_at: string | null;
  waiver_reminder_count: number | null;
  waiver_last_reminder_at: string | null;
  smartwaiver_id: string | null;
  smartwaiver_url: string | null;
  checked_in_at: string | null;
  created_at: string;
  purchase_id: string;
}

interface UnmatchedWaiverRow {
  id: string;
  unique_id: string;
  event: string;
  match_method: string | null;
  waiver_data: { waiver?: Record<string, unknown> } | Record<string, unknown> | null;
  error: string | null;
  created_at: string;
}

interface PurchaseRow {
  id: string;
  buyer_name: string;
  buyer_email: string;
  ticket_type: string;
  quantity: number;
  adult_ticket_type: string | null;
  adult_ticket_count: number | null;
  youth_ticket_count: number | null;
  total_ticket_count: number | null;
  stripe_session_id: string;
  referral_code: string | null;
  created_at: string;
}

interface MinorWaiverRow {
  id: string;
  purchase_id: string | null;
  guardian_name: string;
  guardian_email: string;
  guardian_phone: string | null;
  adult_ticket_type: string;
  minor_name: string;
  minor_date_of_birth: string;
  youth_pass_type: string;
  youth_age_band: string;
  youth_ticket_label: string;
  youth_ticket_amount: number;
  waiver_version: string;
  accepted_at: string;
  stripe_session_id: string | null;
  created_at: string;
}

interface AdminDashboardResponse {
  attendees?: AttendeeRow[];
  purchases?: PurchaseRow[];
  minorWaivers?: MinorWaiverRow[];
  unmatchedWaivers?: UnmatchedWaiverRow[];
  resent?: boolean;
  updated?: boolean;
  error?: string;
}

/** The attendee a confirm dialog is currently open for, and what it will do. */
interface StatusChangeIntent {
  attendee: AttendeeRow;
  status: "signed" | "pending";
}

const TICKET_LABELS: Record<string, string> = {
  "early-bird": "Early Bird",
  "regular-admission": "Regular",
  "friday-day-pass": "Friday Day Pass",
  "saturday-day-pass": "Saturday Day Pass",
  "sunday-day-pass": "Sunday Day Pass",
};

const AdminDashboard = () => {
  const [attendees, setAttendees] = useState<AttendeeRow[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [minorWaivers, setMinorWaivers] = useState<MinorWaiverRow[]>([]);
  const [unmatchedWaivers, setUnmatchedWaivers] = useState<UnmatchedWaiverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [statusChangingId, setStatusChangingId] = useState<string | null>(null);
  const [pendingIntent, setPendingIntent] = useState<StatusChangeIntent | null>(null);
  // Pending is the call list, so it is what you want on opening the page.
  const [filter, setFilter] = useState<"all" | "signed" | "pending">("pending");
  const [search, setSearch] = useState("");
  const [adminToken, setAdminToken] = useState(
    () => window.localStorage.getItem("earthsong_admin_token") || ""
  );
  const [tokenInput, setTokenInput] = useState(adminToken);
  const [authError, setAuthError] = useState("");

  const fetchData = useCallback(async () => {
    if (!adminToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setAuthError("");
    const { data, error } = await supabase.functions.invoke<AdminDashboardResponse>(
      "get-admin-dashboard-data",
      {
        headers: {
          "X-Admin-Token": adminToken,
        },
      }
    );

    if (error || data?.error) {
      console.error("Failed to load admin dashboard:", data?.error || error);
      setAttendees([]);
      setPurchases([]);
      setMinorWaivers([]);
      setUnmatchedWaivers([]);
      if (error instanceof FunctionsHttpError && error.context.status === 403) {
        setAuthError("Unable to load admin dashboard. Check your admin token.");
        setAdminToken("");
        window.localStorage.removeItem("earthsong_admin_token");
      } else {
        setAuthError("Failed to load dashboard. Please try again.");
      }
    } else {
      setAttendees(data?.attendees || []);
      setPurchases(data?.purchases || []);
      setMinorWaivers(data?.minorWaivers || []);
      setUnmatchedWaivers(data?.unmatchedWaivers || []);
    }
    setLoading(false);
  }, [adminToken]);

  /**
   * Resends a waiver email. Routed through get-admin-dashboard-data, which
   * holds INTERNAL_FUNCTION_TOKEN server-side -- the browser only ever carries
   * the admin token.
   */
  const handleResend = async (attendee: AttendeeRow) => {
    setResendingId(attendee.id);
    try {
      const { data, error } = await supabase.functions.invoke<AdminDashboardResponse>(
        "get-admin-dashboard-data",
        {
          headers: { "X-Admin-Token": adminToken },
          body: { action: "resend-waiver", attendeeId: attendee.id },
        }
      );
      if (error || data?.error) {
        toast.error(`Could not resend to ${attendee.email}`);
      } else {
        toast.success(`Waiver email resent to ${attendee.email}`);
        fetchData();
      }
    } catch {
      toast.error(`Could not resend to ${attendee.email}`);
    } finally {
      setResendingId(null);
    }
  };

  /**
   * Flips a waiver status by hand, for a paper waiver collected at the gate.
   * The server decides whether the change is legal -- notably it refuses to
   * revert anything that carries a real Smartwaiver signature.
   */
  const handleSetStatus = async ({ attendee, status }: StatusChangeIntent) => {
    setStatusChangingId(attendee.id);
    try {
      const { data, error } = await supabase.functions.invoke<AdminDashboardResponse>(
        "get-admin-dashboard-data",
        {
          headers: { "X-Admin-Token": adminToken },
          body: { action: "set-waiver-status", attendeeId: attendee.id, status },
        }
      );
      if (error || data?.error) {
        // A rejected change comes back as a 409, so the explanation is in the
        // error's response body rather than in data.
        let reason = data?.error;
        if (!reason && error instanceof FunctionsHttpError) {
          const body = await error.context.json().catch(() => null);
          reason = typeof body?.error === "string" ? body.error : undefined;
        }
        toast.error(reason || `Could not update ${attendee.name || attendee.email}`);
      } else {
        toast.success(
          status === "signed"
            ? `Paper waiver recorded for ${attendee.name || attendee.email}`
            : `${attendee.name || attendee.email} is back to pending`
        );
        fetchData();
      }
    } catch {
      toast.error(`Could not update ${attendee.name || attendee.email}`);
    } finally {
      setStatusChangingId(null);
      setPendingIntent(null);
    }
  };

  const copyPendingEmails = async () => {
    const emails = attendees
      .filter((a) => a.waiver_status === "pending" && !a.is_minor && a.email)
      .map((a) => a.email);
    if (emails.length === 0) {
      toast.info("No pending emails to copy.");
      return;
    }
    try {
      await navigator.clipboard.writeText(emails.join(", "));
      toast.success(`Copied ${emails.length} pending email${emails.length > 1 ? "s" : ""}.`);
    } catch {
      toast.error("Clipboard unavailable. Check browser permissions.");
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdminTokenSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = tokenInput.trim();
    window.localStorage.setItem("earthsong_admin_token", trimmed);
    setAdminToken(trimmed);
  };

  const purchaseMap = new Map(purchases.map((p) => [p.id, p]));

  const filtered = attendees.filter((a) => {
    if (filter === "signed" && a.waiver_status !== "signed") return false;
    if (filter === "pending" && a.waiver_status !== "pending") return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q);
    }
    return true;
  });

  // Minors are covered by a guardian's signature, so the numbers that matter at
  // the gate are adults only.
  const adults = attendees.filter((a) => !a.is_minor);
  const totalAttendees = adults.length;
  const signedCount = adults.filter((a) => a.waiver_status === "signed").length;
  const pendingCount = adults.filter((a) => a.waiver_status === "pending").length;
  const minorCount = minorWaivers.length;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "--";
    return new Date(dateStr).toLocaleDateString("en-CA", {
      month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-white">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl md:text-3xl font-semibold text-primary">
              Attendee Dashboard
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Earth Song Festival Retreat — Waiver tracking
            </p>
          </div>
          {adminToken && (
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {!adminToken && (
          <form
            onSubmit={handleAdminTokenSubmit}
            className="bg-white rounded-xl border border-border p-5 max-w-md mb-8"
          >
            <h2 className="font-serif text-xl font-semibold text-primary mb-2">
              Admin Access
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Enter the admin dashboard token to view attendee and purchase data.
            </p>
            <div className="space-y-3">
              <Input
                type="password"
                value={tokenInput}
                onChange={(event) => setTokenInput(event.target.value)}
                placeholder="Admin token"
              />
              <Button type="submit" disabled={!tokenInput.trim()}>
                Unlock Dashboard
              </Button>
            </div>
          </form>
        )}

        {authError && (
          <div className="bg-destructive/10 text-destructive rounded-xl border border-destructive/20 p-4 mb-8">
            {authError}
          </div>
        )}

        {adminToken && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl border border-border p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{totalAttendees}</p>
                    <p className="text-sm text-muted-foreground">Total Attendees</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-border p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary/30 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{minorCount}</p>
                    <p className="text-sm text-muted-foreground">Minor Waivers</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-border p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{signedCount}</p>
                    <p className="text-sm text-muted-foreground">Waivers Signed</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-border p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
                    <p className="text-sm text-muted-foreground">Waivers Pending</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="sm:max-w-xs"
              />
              <div className="flex gap-2">
                {(["all", "signed", "pending"] as const).map((f) => (
                  <Button
                    key={f}
                    variant={filter === f ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilter(f)}
                    className="capitalize"
                  >
                    {f}
                    {f === "all" && ` (${totalAttendees})`}
                    {f === "signed" && ` (${signedCount})`}
                    {f === "pending" && ` (${pendingCount})`}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={copyPendingEmails}
                className="sm:ml-auto"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy all pending emails
              </Button>
            </div>

            <p className="text-sm text-muted-foreground mb-6">
              Counts are adults only — minors are covered by their guardian's
              signature. Sorted oldest first, so the top of the list is the
              longest outstanding.
            </p>

            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                {attendees.length === 0
                  ? "No attendees registered yet."
                  : "No results match your filter."}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Ticket Type</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Referral Code</TableHead>
                        <TableHead>Waiver Status</TableHead>
                        <TableHead>Email Sent</TableHead>
                        <TableHead>Reminders</TableHead>
                        <TableHead>Signed At</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((a) => {
                        const purchase = purchaseMap.get(a.purchase_id);
                        return (
                          <TableRow key={a.id}>
                            <TableCell className="font-medium">{a.name}</TableCell>
                            <TableCell className="text-muted-foreground">{a.email}</TableCell>
                            <TableCell>
                              {purchase
                                ? TICKET_LABELS[purchase.ticket_type] || purchase.ticket_type
                                : "--"}
                            </TableCell>
                            <TableCell>
                              {a.is_buyer ? (
                                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                  Buyer
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">Attendee</span>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {purchase?.referral_code || "--"}
                            </TableCell>
                            <TableCell>
                              {a.waiver_status === "signed" ? (
                                a.waiver_signed_method === "paper" ? (
                                  <span
                                    className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full"
                                    title="Recorded by staff — there is a paper waiver to file"
                                  >
                                    <FileText className="w-3 h-3" />
                                    Signed · paper
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                                    <ShieldCheck className="w-3 h-3" />
                                    Signed
                                  </span>
                                )
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-gold bg-gold/10 px-2 py-0.5 rounded-full">
                                  <Clock className="w-3 h-3" />
                                  Pending
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {a.waiver_email_sent_at ? (
                                formatDate(a.waiver_email_sent_at)
                              ) : (
                                <span className="text-destructive">never</span>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {a.waiver_reminder_count ?? 0}
                              {a.waiver_last_reminder_at
                                ? ` · ${formatDate(a.waiver_last_reminder_at)}`
                                : ""}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {formatDate(a.waiver_signed_at)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {a.waiver_status !== "signed" && !a.is_minor && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={resendingId === a.id}
                                      onClick={() => handleResend(a)}
                                    >
                                      {resendingId === a.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <>
                                          <Send className="w-3.5 h-3.5 mr-1.5" />
                                          Resend
                                        </>
                                      )}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={statusChangingId === a.id}
                                      onClick={() =>
                                        setPendingIntent({ attendee: a, status: "signed" })
                                      }
                                    >
                                      {statusChangingId === a.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <>
                                          <FileText className="w-3.5 h-3.5 mr-1.5" />
                                          Mark signed (paper)
                                        </>
                                      )}
                                    </Button>
                                  </>
                                )}
                                {a.waiver_status === "signed" &&
                                  a.waiver_signed_method === "paper" &&
                                  !a.smartwaiver_id && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      disabled={statusChangingId === a.id}
                                      onClick={() =>
                                        setPendingIntent({ attendee: a, status: "pending" })
                                      }
                                    >
                                      {statusChangingId === a.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <>
                                          <Undo2 className="w-3.5 h-3.5 mr-1.5" />
                                          Undo
                                        </>
                                      )}
                                    </Button>
                                  )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {unmatchedWaivers.length > 0 && (
              <div className="mt-8 bg-white rounded-xl border border-destructive/30 overflow-hidden">
                <div className="border-b border-border px-4 py-3 flex items-start gap-3">
                  <TriangleAlert className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <h2 className="font-serif text-xl font-semibold text-primary">
                      Unmatched waivers ({unmatchedWaivers.length})
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Signed waivers we could not tie to a purchase — usually a
                      typo'd email or someone signing from a forwarded link.
                      These need a human to reconcile.
                    </p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Signed</TableHead>
                        <TableHead>Name on waiver</TableHead>
                        <TableHead>Email on waiver</TableHead>
                        <TableHead>Smartwaiver ID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unmatchedWaivers.map((row) => {
                        const payload = (row.waiver_data || {}) as Record<string, unknown>;
                        const waiver = (payload.waiver || payload) as Record<string, unknown>;
                        const first = typeof waiver.firstName === "string" ? waiver.firstName : "";
                        const last = typeof waiver.lastName === "string" ? waiver.lastName : "";
                        const waiverEmail = typeof waiver.email === "string" ? waiver.email : "";
                        return (
                          <TableRow key={row.id}>
                            <TableCell className="text-muted-foreground text-sm">
                              {formatDate(row.created_at)}
                            </TableCell>
                            <TableCell className="font-medium">
                              {[first, last].filter(Boolean).join(" ") || "--"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {waiverEmail || "--"}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs font-mono">
                              {row.unique_id}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {minorWaivers.length > 0 && (
              <div className="mt-8 bg-white rounded-xl border border-border overflow-hidden">
                <div className="border-b border-border px-4 py-3">
                  <h2 className="font-serif text-xl font-semibold text-primary">
                    Legacy minor waivers (pre-Aug 2026)
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Signed inside the old checkout dialog. This table stops
                    receiving new rows, but these are real legal records for
                    anyone who bought before the change — do not delete them.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Minor</TableHead>
                        <TableHead>DOB</TableHead>
                        <TableHead>Youth Ticket</TableHead>
                        <TableHead>Guardian</TableHead>
                        <TableHead>Adult Ticket</TableHead>
                        <TableHead>Accepted At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {minorWaivers.map((minor) => (
                        <TableRow key={minor.id}>
                          <TableCell className="font-medium">{minor.minor_name}</TableCell>
                          <TableCell>{minor.minor_date_of_birth}</TableCell>
                          <TableCell>
                            <div>
                              <p>{minor.youth_ticket_label}</p>
                              <p className="text-xs text-muted-foreground">
                                {minor.youth_ticket_amount === 0
                                  ? "Free"
                                  : `CA$${(minor.youth_ticket_amount / 100).toFixed(0)}`}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p>{minor.guardian_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {minor.guardian_email}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {TICKET_LABELS[minor.adult_ticket_type] || minor.adult_ticket_type}
                          </TableCell>
                          <TableCell>{formatDate(minor.accepted_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <AlertDialog
        open={pendingIntent !== null}
        onOpenChange={(open) => {
          if (!open) setPendingIntent(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingIntent?.status === "signed"
                ? "Record a paper waiver?"
                : "Undo this paper waiver?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingIntent?.status === "signed" ? (
                <>
                  This marks{" "}
                  <strong>
                    {pendingIntent?.attendee.name || pendingIntent?.attendee.email}
                  </strong>{" "}
                  as signed because a paper waiver was collected in person. Keep the
                  physical copy — it is the legal record. Reminder emails stop
                  immediately.
                </>
              ) : (
                <>
                  This puts{" "}
                  <strong>
                    {pendingIntent?.attendee.name || pendingIntent?.attendee.email}
                  </strong>{" "}
                  back to pending and clears the signed timestamp. They will start
                  receiving waiver reminders again.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                // The dialog closes on click by default; keep it open until the
                // request finishes so the spinner is visible.
                event.preventDefault();
                if (pendingIntent) handleSetStatus(pendingIntent);
              }}
              disabled={statusChangingId !== null}
            >
              {statusChangingId !== null ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : pendingIntent?.status === "signed" ? (
                "Mark signed"
              ) : (
                "Undo"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminDashboard;
