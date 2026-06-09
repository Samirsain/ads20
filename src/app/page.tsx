import React from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import EarningCalculator from "@/components/EarningCalculator";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import SupportedSources from "@/components/SupportedSources";
import PaymentsSection from "@/components/PaymentsSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="relative flex flex-col min-h-screen bg-slate-50/30 overflow-x-hidden">
      <div className="absolute inset-0 grid-pattern opacity-60 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-b from-blue-50/40 via-transparent to-transparent blur-3xl pointer-events-none" />

      <Navbar />

      <main className="flex-grow">
        <Hero />
        <EarningCalculator />
        <Features />
        <HowItWorks />
        <SupportedSources />
        <PaymentsSection />
      </main>

      <Footer />
    </div>
  );
}
