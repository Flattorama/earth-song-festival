import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const EmailCaptureSection = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const { data, error } = await supabase
        .from("newsletter_signups")
        .insert({ name: name.trim(), email: email.trim() })
        .select()
        .single();

      if (error) throw error;

      fetch(`${SUPABASE_URL}/functions/v1/google-sheets-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ type: "newsletter", record: data }),
      }).catch(() => {});

      const mlForm = new FormData();
      mlForm.append("fields[name]", name.trim());
      mlForm.append("fields[email]", email.trim());
      mlForm.append("ml-submit", "1");
      mlForm.append("anticsrf", "true");
      fetch("https://assets.mailerlite.com/jsonp/2143726/forms/180874923059709145/subscribe", {
        method: "POST",
        body: mlForm,
      }).catch(() => {});

      setStatus("success");
      setName("");
      setEmail("");
    } catch {
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again.");
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px",
    borderRadius: "15px",
    border: "1px solid #d4c9b8",
    boxSizing: "border-box",
  };

  return (
    <section className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4 max-w-2xl text-center">
        <p className="text-small-caps text-accent tracking-[0.2em] text-sm mb-4">Stay Connected</p>
        <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold text-primary mb-6">
          Join The Festival Heartbeat
        </h2>
        <p className="text-foreground/80 text-lg mb-8 max-w-xl mx-auto">
          Be the first to receive updates on ticket releases, facilitator announcements, and sacred offerings. Your journey begins here.
        </p>

        <div
          style={{
            backgroundColor: "#F5F0E8",
            borderRadius: "4px",
            display: "inline-block",
            width: "100%",
            maxWidth: "400px",
          }}
        >
          <div style={{ padding: "20px 20px 0 20px" }}>
            {status === "success" ? (
              <div style={{ padding: "20px 0 20px", textAlign: "center" }}>
                <p style={{ color: "#2B6B4A", fontWeight: "bold", fontSize: "16px", marginBottom: "8px" }}>
                  You're in!
                </p>
                <p style={{ color: "#5a5a5a", fontSize: "14px" }}>
                  Welcome to the Earth Song community. We'll be in touch soon.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: "10px" }}>
                  <label style={{ color: "#2B6B4A", fontWeight: "bold", display: "block", marginBottom: "4px" }}>
                    Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="given-name"
                    style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ color: "#2B6B4A", fontWeight: "bold", display: "block", marginBottom: "4px" }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    style={inputStyle}
                  />
                </div>
                {status === "error" && (
                  <p style={{ color: "#c0392b", fontSize: "13px", marginBottom: "10px" }}>{errorMsg}</p>
                )}
                <div style={{ marginBottom: "20px" }}>
                  <button
                    type="submit"
                    disabled={status === "loading"}
                    style={{
                      backgroundColor: "#2B6B4A",
                      color: "#fff",
                      border: "none",
                      borderRadius: "15px",
                      fontSize: "18px",
                      fontWeight: "700",
                      padding: "12px",
                      width: "100%",
                      cursor: status === "loading" ? "not-allowed" : "pointer",
                      opacity: status === "loading" ? 0.7 : 1,
                    }}
                  >
                    {status === "loading" ? "Joining..." : "Join the Gathering"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <p className="text-muted-foreground text-sm mt-6">We honor your privacy. Unsubscribe anytime.</p>
      </div>
    </section>
  );
};

export default EmailCaptureSection;
