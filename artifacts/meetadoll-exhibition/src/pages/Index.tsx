import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import SponsorsMarquee from "@/components/SponsorsMarquee";
import AboutSection from "@/components/AboutSection";
import SpeakersSection from "@/components/SpeakersSection";
import AgendaSection from "@/components/AgendaSection";
import TicketsSection from "@/components/TicketsSection";
import PortfolioSection from "@/components/PortfolioSection";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";

const Index = () => (
  <div className="min-h-screen">
    <Navbar />
    <HeroSection />
    <SponsorsMarquee />
    <AboutSection />
    <SpeakersSection />
    <AgendaSection />
    <TicketsSection />
    <PortfolioSection />
    <Footer />
    <WhatsAppButton />
  </div>
);

export default Index;
