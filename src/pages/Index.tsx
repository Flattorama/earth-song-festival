import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import EmailCaptureSection from "@/components/EmailCaptureSection";
import GatheringSection from "@/components/GatheringSection";
import WhatToExpectSection from "@/components/WhatToExpectSection";
import ScheduleSection from "@/components/ScheduleSection";
import TicketsSection from "@/components/TicketsSection";
import FacilitatorsSection from "@/components/FacilitatorsSection";
import VolunteerSection from "@/components/VolunteerSection";
import FAQSection from "@/components/FAQSection";
import PartnersSection from "@/components/PartnersSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <main>
        <HeroSection />
        <EmailCaptureSection />
        <GatheringSection />
        <WhatToExpectSection />
        <ScheduleSection />
        <TicketsSection />
        <FacilitatorsSection />
        <VolunteerSection />
        <FAQSection />
        <PartnersSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
