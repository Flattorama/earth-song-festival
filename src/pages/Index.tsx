import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import EmailCaptureSection from "@/components/EmailCaptureSection";
import WhatToExpectSection from "@/components/WhatToExpectSection";
import TicketsSection from "@/components/TicketsSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <main>
        <HeroSection />
        <EmailCaptureSection />
        <WhatToExpectSection />
        <TicketsSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
