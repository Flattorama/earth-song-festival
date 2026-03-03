import { useEffect } from "react";
import { Clock } from "lucide-react";

const MailerLiteVolunteerForm = () => {
  useEffect(() => {
    const s = document.createElement("script");
    s.src = "https://groot.mailerlite.com/js/w/webforms.min.js?v95037e5bac78f29ed026832ca21a7c7b";
    s.async = true;
    document.body.appendChild(s);
    return () => { try { document.body.removeChild(s); } catch(e) {} };
  }, []);

  const inputStyle = {width:'100%',padding:'10px',background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:'8px',color:'#fff',fontSize:'14px',boxSizing:'border-box' as const,marginBottom:'10px'};
  const labelStyle = {color:'rgba(255,255,255,0.85)',fontSize:'13px',fontWeight:'bold' as const,display:'block' as const,marginBottom:'4px'};

  return (
    <div className="bg-secondary-foreground/5 rounded-2xl p-6 md:p-8">
      <div id="mlb2-37902242" className="ml-form-embedContainer ml-subscribe-form ml-subscribe-form-37902242">
        <div className="ml-form-align-center">
          <div style={{backgroundColor:'transparent',width:'100%'}}>
            <form className="ml-block-form" action="https://assets.mailerlite.com/jsonp/2143726/forms/180874923059709145/subscribe" method="post" target="_blank">
              <div><label style={labelStyle}>Full Name *</label><input type="text" name="fields[name]" placeholder="Your full name" required style={inputStyle} /></div>
              <div><label style={labelStyle}>Email Address *</label><input type="email" name="fields[email]" placeholder="your@email.com" required autoComplete="email" style={inputStyle} /></div>
              <div><label style={labelStyle}>Phone Number *</label><input type="tel" name="fields[phone]" placeholder="Your phone number" required style={inputStyle} /></div>
              <div><label style={labelStyle}>Tell us about yourself *</label><textarea name="fields[about]" placeholder="Share a bit about who you are, your background, and what draws you to this work..." required style={{...inputStyle,minHeight:'80px'}} /></div>
              <div><label style={labelStyle}>Availability *</label><textarea name="fields[availability]" placeholder="Are you available August 7-9, 2026? Any dates you cannot attend?" required style={{...inputStyle,minHeight:'60px'}} /></div>
              <div><label style={labelStyle}>Relevant Experience</label><textarea name="fields[experience]" placeholder="Have you volunteered at festivals, retreats, or similar events before? Tell us about it..." style={{...inputStyle,minHeight:'60px'}} /></div>
              <div><label style={labelStyle}>Why Earth Song? *</label><textarea name="fields[why]" placeholder="What calls you to be part of this gathering?" required style={{...inputStyle,minHeight:'60px'}} /></div>
              <input type="hidden" name="ml-submit" value="1" />
              <div style={{marginTop:'16px'}}><button type="submit" style={{backgroundColor:'#D4A853',color:'#1C2B1F',border:'none',borderRadius:'8px',fontSize:'16px',fontWeight:'700',padding:'14px',width:'100%',cursor:'pointer'}}>Submit Application</button></div>
              <input type="hidden" name="anticsrf" value="true" />
            </form>
          </div>
        </div>
      </div>
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
