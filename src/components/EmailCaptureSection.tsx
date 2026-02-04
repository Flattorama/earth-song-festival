import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const EmailCaptureSection = () => {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Visual only - form submission not connected
    console.log("Form submitted:", { firstName, email });
    // Reset form for demo
    setFirstName("");
    setEmail("");
  };

  return (
    <section className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4 max-w-2xl text-center">
        {/* Section Label */}
        <p className="text-small-caps text-accent tracking-[0.2em] text-sm mb-4">
          Stay Connected
        </p>

        {/* Heading */}
        <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold text-primary mb-6">
          Join the Circle
        </h2>

        {/* Subtext */}
        <p className="text-foreground/80 text-lg mb-8 max-w-xl mx-auto">
          Be the first to receive updates on ticket releases, facilitator announcements, 
          and sacred offerings. Your journey begins here.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              type="text"
              placeholder="First Name"
              data-testid="input-firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="flex-1 bg-white border-border/50 focus:border-primary h-12 rounded-lg"
              required
            />
            <Input
              type="email"
              placeholder="Email Address"
              data-testid="input-email-capture"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 bg-white border-border/50 focus:border-primary h-12 rounded-lg"
              required
            />
          </div>
          <Button
            type="submit"
            data-testid="button-join-gathering"
            className="w-full sm:w-auto bg-primary text-primary-foreground px-8 h-12 rounded-lg text-base transition-all duration-300"
          >
            Join the Gathering
          </Button>
        </form>

        {/* Privacy Note */}
        <p className="text-muted-foreground text-sm mt-6">
          We honor your privacy. Unsubscribe anytime.
        </p>
      </div>
    </section>
  );
};

export default EmailCaptureSection;
