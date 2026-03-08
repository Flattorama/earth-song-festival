import { useState } from "react";
import { Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const MailerLiteVolunteerForm = () => {
  const [fields, setFields] = useState({
    full_name: "",
    email: "",
    phone: "",
    about: "",
    availability: "",
    experience: "",
    why_earth_song: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const set = (key: keyof typeof fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFields((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const { data, error } = await supabase
        .from("volunteer_applications")
        .insert({
          full_name: fields.full_name.trim(),
          email: fields.email.trim(),
          phone: fields.phone.trim(),
          about: fields.about.trim(),
          availability: fields.availability.trim(),
          experience: fields.experience.trim(),
          why_earth_song: fields.why_earth_song.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      fetch(`${SUPABASE_URL}/functions/v1/google-sheets-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ type: "volunteer", record: data }),
      }).catch(() => {});

      const mlForm = new FormData();
      mlForm.append("fields[name]", fields.full_name.trim());
      mlForm.append("fields[email]", fields.email.trim());
      mlForm.append("fields[phone]", fields.phone.trim());
      mlForm.append("fields[about]", fields.about.trim());
      mlForm.append("fields[availability]", fields.availability.trim());
      mlForm.append("fields[experience]", fields.experience.trim());
      mlForm.append("fields[why]", fields.why_earth_song.trim());
      mlForm.append("ml-submit", "1");
      mlForm.append("anticsrf", "true");
      fetch("https://assets.mailerlite.com/jsonp/2143726/forms/180874923059709145/subscribe", {
        method: "POST",
        body: mlForm,
      }).catch(() => {});

      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again.");
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px",
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "8px",
    color: "#fff",
    fontSize: "14px",
    boxSizing: "border-box",
    marginBottom: "10px",
  };

  const labelStyle: React.CSSProperties = {
    color: "rgba(255,255,255,0.85)",
    fontSize: "13px",
    fontWeight: "bold",
    display: "block",
    marginBottom: "4px",
  };

  return (
    <div className="bg-secondary-foreground/5 rounded-2xl p-6 md:p-8">
      {status === "success" ? (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <p style={{ color: "#D4A853", fontWeight: "bold", fontSize: "20px", marginBottom: "12px" }}>
            Application received!
          </p>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "15px" }}>
            Thank you for wanting to be part of the village crew. We'll review your application and be in touch within 2 weeks.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div>
            <label style={labelStyle}>Full Name *</label>
            <input type="text" value={fields.full_name} onChange={set("full_name")} placeholder="Your full name" required style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Email Address *</label>
            <input type="email" value={fields.email} onChange={set("email")} placeholder="your@email.com" required autoComplete="email" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Phone Number *</label>
            <input type="tel" value={fields.phone} onChange={set("phone")} placeholder="Your phone number" required style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Tell us about yourself *</label>
            <textarea value={fields.about} onChange={set("about")} placeholder="Share a bit about who you are, your background, and what draws you to this work..." required style={{ ...inputStyle, minHeight: "80px" }} />
          </div>
          <div>
            <label style={labelStyle}>Availability *</label>
            <textarea value={fields.availability} onChange={set("availability")} placeholder="Are you available August 7-9, 2026? Any dates you cannot attend?" required style={{ ...inputStyle, minHeight: "60px" }} />
          </div>
          <div>
            <label style={labelStyle}>Relevant Experience</label>
            <textarea value={fields.experience} onChange={set("experience")} placeholder="Have you volunteered at festivals, retreats, or similar events before? Tell us about it..." style={{ ...inputStyle, minHeight: "60px" }} />
          </div>
          <div>
            <label style={labelStyle}>Why Earth Song? *</label>
            <textarea value={fields.why_earth_song} onChange={set("why_earth_song")} placeholder="What calls you to be part of this gathering?" required style={{ ...inputStyle, minHeight: "60px" }} />
          </div>
          {status === "error" && (
            <p style={{ color: "#f87171", fontSize: "13px", marginBottom: "10px" }}>{errorMsg}</p>
          )}
          <div style={{ marginTop: "16px" }}>
            <button
              type="submit"
              disabled={status === "loading"}
              style={{
                backgroundColor: "#D4A853",
                color: "#1C2B1F",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "700",
                padding: "14px",
                width: "100%",
                cursor: status === "loading" ? "not-allowed" : "pointer",
                opacity: status === "loading" ? 0.7 : 1,
              }}
            >
              {status === "loading" ? "Submitting..." : "Submit Application"}
            </button>
          </div>
        </form>
      )}
      <p className="text-secondary-foreground/60 text-sm text-center mt-4">
        We'll review applications on a rolling basis and be in touch within 2 weeks.
      </p>
    </div>
  );
};

const VolunteerSection = () => {
  return (
    <section id="volunteer" className="py-20 md:py-28 bg-secondary text-secondary-foreground">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          <div>
            <p className="text-small-caps text-gold tracking-[0.2em] text-sm mb-4">
              VOLUNTEER
            </p>
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold mb-6">
              Join Our Village Crew
            </h2>
            <div className="space-y-4 text-secondary-foreground/80 leading-relaxed mb-8">
              <p>
                Earth Song is co-created by a dedicated team of volunteers who help bring the vision to life. If you feel called to serve, support, and be part of the behind-the-scenes magic, we'd love to hear from you.
              </p>
              <p>
                Volunteers receive complimentary admission in exchange for a commitment of service hours before and during the event. Roles vary from setup and registration to facilitator support and leave-no-trace coordination.
              </p>
              <p className="font-serif text-lg italic text-gold">
                This is more than volunteering—it's an invitation to be part of the inner circle.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 bg-gold/20 text-gold px-4 py-2 rounded-full text-sm font-medium">
              <Clock className="w-4 h-4" />
              Applications close June 30, 2026
            </div>
          </div>

          <MailerLiteVolunteerForm />
        </div>
      </div>
    </section>
  );
};

export default VolunteerSection;
