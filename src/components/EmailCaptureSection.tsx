import { useEffect } from "react";

const EmailCaptureSection = () => {

  useEffect(() => {
    const s = document.createElement("script");
    s.src = "https://groot.mailerlite.com/js/w/webforms.min.js?v95037e5bac78f29ed026832ca21a7c7b";
    s.async = true;
    document.body.appendChild(s);
    return () => { document.body.removeChild(s); };
  }, []);

  return (
    <section className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4 max-w-2xl text-center">
        <p className="text-small-caps text-accent tracking-[0.2em] text-sm mb-4">Stay Connected</p>
        <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold text-primary mb-6">Join The Festival Heartbeat</h2>
        <p className="text-foreground/80 text-lg mb-8 max-w-xl mx-auto">Be the first to receive updates on ticket releases, facilitator announcements, and sacred offerings. Your journey begins here.</p>
        <div id="mlb2-37902241" className="ml-form-embedContainer ml-subscribe-form ml-subscribe-form-37902241">
          <div className="ml-form-align-center">
            <div className="ml-form-embedWrapper embedForm" style={{backgroundColor:'#F5F0E8',borderRadius:'4px',display:'inline-block',width:'100%',maxWidth:'400px'}}>
              <div className="ml-form-embedBody row-form" style={{padding:'20px 20px 0 20px'}}>
                <form className="ml-block-form" action="https://assets.mailerlite.com/jsonp/2143726/forms/180874923059709145/subscribe" method="post" target="_blank">
                  <div style={{marginBottom:'10px'}}>
                    <label style={{color:'#2B6B4A',fontWeight:'bold',display:'block',marginBottom:'4px'}}>Name</label>
                    <input type="text" name="fields[name]" placeholder="" autoComplete="given-name" style={{width:'100%',padding:'10px',borderRadius:'15px',border:'1px solid #d4c9b8',boxSizing:'border-box'}} />
                  </div>
                  <div style={{marginBottom:'20px'}}>
                    <label style={{color:'#2B6B4A',fontWeight:'bold',display:'block',marginBottom:'4px'}}>Email</label>
                    <input type="email" name="fields[email]" placeholder="" required autoComplete="email" style={{width:'100%',padding:'10px',borderRadius:'15px',border:'1px solid #d4c9b8',boxSizing:'border-box'}} />
                  </div>
                  <input type="hidden" name="ml-submit" value="1" />
                  <div style={{marginBottom:'20px'}}>
                    <button type="submit" style={{backgroundColor:'#2B6B4A',color:'#fff',border:'none',borderRadius:'15px',fontSize:'18px',fontWeight:'700',padding:'12px',width:'100%',cursor:'pointer'}}>Join the Gathering</button>
                  </div>
                  <input type="hidden" name="anticsrf" value="true" />
                </form>
              </div>
            </div>
          </div>
        </div>
        <p className="text-muted-foreground text-sm mt-6">We honor your privacy. Unsubscribe anytime.</p>
      </div>
    </section>
  );
};

export default EmailCaptureSection;
