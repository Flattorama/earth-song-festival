import { useEffect, useState } from "react";
import { Loader as Loader2, RefreshCw, Shield, ShieldCheck, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

interface AttendeeRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  is_buyer: boolean;
  waiver_status: string;
  waiver_signed_at: string | null;
  created_at: string;
  purchase_id: string;
}

interface PurchaseRow {
  id: string;
  buyer_name: string;
  buyer_email: string;
  ticket_type: string;
  quantity: number;
  stripe_session_id: string;
  referral_code: string | null;
  created_at: string;
}

interface AdminDashboardResponse {
  attendees?: AttendeeRow[];
  purchases?: PurchaseRow[];
  error?: string;
}

const TICKET_LABELS: Record<string, string> = {
  "early-bird": "Early Bird",
  "regular-admission": "Regular",
  "saturday-day-pass": "Day Pass",
};

const AdminDashboard = () => {
  const [attendees, setAttendees] = useState<AttendeeRow[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "signed" | "pending">("all");
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke<AdminDashboardResponse>(
      "get-admin-dashboard-data"
    );

    if (error || data?.error) {
      console.error("Failed to load admin dashboard:", data?.error || error);
    } else {
      setAttendees(data?.attendees || []);
      setPurchases(data?.purchases || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  const totalAttendees = attendees.length;
  const signedCount = attendees.filter((a) => a.waiver_status === "signed").length;
  const pendingCount = attendees.filter((a) => a.waiver_status === "pending").length;

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
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
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
        </div>

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
                    <TableHead>Signed At</TableHead>
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
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                              <ShieldCheck className="w-3 h-3" />
                              Signed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-gold bg-gold/10 px-2 py-0.5 rounded-full">
                              <Clock className="w-3 h-3" />
                              Pending
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(a.waiver_signed_at)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
