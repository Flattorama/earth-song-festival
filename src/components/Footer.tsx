import { Instagram, Facebook, Mail } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const handleNavClick = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - offset;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  return (
    <footer className="bg-secondary text-secondary-foreground py-16 md:py-20">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          {/* Brand Column */}
          <div>
            <h3 className="font-serif text-2xl font-semibold mb-4">EARTH SONG</h3>
            <p className="text-secondary-foreground/70 mb-4">
              A ceremonial gathering to dance, heal, and celebrate the sacred rhythms of life.
            </p>
            <div className="text-secondary-foreground/70 space-y-1 text-sm">
              <p>August 8, 2026</p>
              <p>Still Life Retreat & Lake</p>
            </div>
          </div>

          {/* Navigation Column */}
          <div>
            <h4 className="font-serif text-lg font-semibold mb-4 text-gold">Quick Links</h4>
            <nav className="flex flex-col gap-3">
              {[
                { href: "#about", label: "The Gathering" },
                { href: "#expect", label: "What to Expect" },
                { href: "#tickets", label: "Tickets" },
                { href: "#faq", label: "FAQ" },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick(link.href);
                  }}
                  className="text-secondary-foreground/70 hover:text-gold transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Connect Column */}
          <div>
            <h4 className="font-serif text-lg font-semibold mb-4 text-gold">Connect</h4>
            <p className="text-secondary-foreground/70 mb-4">
              Follow our journey and stay connected with the Earth Song community.
            </p>
            <div className="flex gap-4">
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-secondary-foreground/10 flex items-center justify-center hover:bg-gold/20 transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5 text-gold" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-secondary-foreground/10 flex items-center justify-center hover:bg-gold/20 transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5 text-gold" />
              </a>
              <a
                href="mailto:hello@earthsongfestival.com"
                className="w-10 h-10 rounded-full bg-secondary-foreground/10 flex items-center justify-center hover:bg-gold/20 transition-colors"
                aria-label="Email"
              >
                <Mail className="w-5 h-5 text-gold" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-secondary-foreground/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-secondary-foreground/50 text-sm">
            © {currentYear} Earth Song Festival Retreat. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-secondary-foreground/50">
            <a href="#" className="hover:text-gold transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-gold transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
