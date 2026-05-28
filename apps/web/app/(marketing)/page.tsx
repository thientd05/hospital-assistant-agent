import { DoctorTeam } from "@/components/landing/DoctorTeam";
import { FAQ } from "@/components/landing/FAQ";
import { FeatureDeepDive } from "@/components/landing/FeatureDeepDive";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Navbar } from "@/components/landing/Navbar";
import { Specialties } from "@/components/landing/Specialties";
import { Testimonials } from "@/components/landing/Testimonials";
import { TrustBar } from "@/components/landing/TrustBar";
import { ValueProps } from "@/components/landing/ValueProps";

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <TrustBar />
        <ValueProps />
        <Specialties />
        <HowItWorks />
        <FeatureDeepDive />
        <DoctorTeam />
        <Testimonials />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
