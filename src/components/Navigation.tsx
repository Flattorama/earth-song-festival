import { useState, useEffect } from "react";
import { Menu, X, Instagram, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import earthSongLogo from "@/assets/Earth_Song_Logo_White.png";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
  DrawerClose,
} from "@/components/ui/drawer";

const navLinks = [
  { href: "#gathering", label: "The Gathering" },
  { href: "#expect", label: "What to Expect" },
  { href: "#tickets", label: "Tickets" },
  { href: "#facilitators", label: "Facilitators" },
  { href: "#volunteer", label: "Volunteer" },
  { href: "#faq", label: "FAQ" },
];

const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (href: string) => {
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

  const handleNavClick = (href: string) => {
    if (isOpen) {
      setIsOpen(false);
      setTimeout(() => scrollToSection(href), 350);
    } else {
      scrollToSection(href);
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-background/95 backdrop-blur-sm shadow-sm"
          : "bg-transparent"
      }`}
    >
      <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <a
          href="#"
          data-testid="link-logo"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <img
            src={earthSongLogo}
            alt="Earth Song Festival"
            className={`h-10 md:h-12 w-auto object-contain transition-opacity ${isScrolled ? "brightness-0" : "brightness-100"}`}
          />
        </a>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          <a
            href="https://www.instagram.com/earthsong_festival_retreat"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className={`transition-colors hover:text-accent ${isScrolled ? "text-foreground" : "text-primary-foreground"}`}
          >
            <Instagram className="h-5 w-5" />
          </a>
          <a
            href="https://www.facebook.com/share/1MqqHhfB5N/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className={`transition-colors hover:text-accent ${isScrolled ? "text-foreground" : "text-primary-foreground"}`}
          >
            <Facebook className="h-5 w-5" />
          </a>
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              data-testid={`link-nav-${link.href.replace('#', '')}`}
              onClick={(e) => {
                e.preventDefault();
                handleNavClick(link.href);
              }}
              className={`text-sm font-medium transition-colors hover:text-accent ${
                isScrolled ? "text-foreground" : "text-primary-foreground"
              }`}
            >
              {link.label}
            </a>
          ))}
          <Button
            onClick={() => handleNavClick("#tickets")}
            data-testid="button-buy-tickets"
            className="bg-primary text-primary-foreground"
          >
            Buy Tickets
          </Button>
        </div>

        {/* Mobile Navigation */}
        <Drawer open={isOpen} onOpenChange={setIsOpen} direction="right">
          <DrawerTrigger asChild className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              data-testid="button-menu-open"
              className={isScrolled ? "text-foreground" : "text-primary-foreground"}
            >
              <Menu className="h-6 w-6" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DrawerTrigger>
          <DrawerContent className="h-full w-[280px] ml-auto rounded-none">
            <div className="flex flex-col h-full bg-background p-6">
              <div className="flex justify-between items-center mb-8">
                <img
                  src={earthSongLogo}
                  alt="Earth Song Festival"
                  className="h-10 w-auto object-contain brightness-0"
                />
                <DrawerClose asChild>
                  <Button variant="ghost" size="icon" data-testid="button-menu-close">
                    <X className="h-6 w-6" />
                  </Button>
                </DrawerClose>
              </div>
              <nav className="flex flex-col gap-4">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    data-testid={`link-mobile-nav-${link.href.replace('#', '')}`}
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavClick(link.href);
                    }}
                    className="text-lg font-medium text-foreground hover:text-accent transition-colors py-2"
                  >
                    {link.label}
                  </a>
                ))}
                <Button
                  onClick={() => handleNavClick("#tickets")}
                  data-testid="button-mobile-buy-tickets"
                  className="mt-4 bg-primary text-primary-foreground"
                >
                  Buy Tickets
                </Button>
                <div className="flex gap-4 mt-6">
                  <a
                    href="https://www.instagram.com/earthsong_festival_retreat"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="text-foreground hover:text-accent transition-colors"
                  >
                    <Instagram className="h-5 w-5" />
                  </a>
                  <a
                    href="https://www.facebook.com/share/1MqqHhfB5N/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="text-foreground hover:text-accent transition-colors"
                  >
                    <Facebook className="h-5 w-5" />
                  </a>
                </div>
              </nav>
            </div>
          </DrawerContent>
        </Drawer>
      </nav>
    </header>
  );
};

export default Navigation;
