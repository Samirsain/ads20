"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import EarningCalculator from "@/components/EarningCalculator";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import SupportedSources from "@/components/SupportedSources";
import PaymentsSection from "@/components/PaymentsSection";
import DashboardView from "@/components/DashboardView";
import Footer from "@/components/Footer";
import AuthModal from "@/components/AuthModal";

export default function Home() {
  const [tab, setTab] = useState<"landing" | "dashboard">("dashboard");
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [publisherName, setPublisherName] = useState("Samir Kumar");

  const handleOpenAuth = () => {
    setIsAuthOpen(true);
  };

  const handleLoginSuccess = (name: string) => {
    setIsLoggedIn(true);
    setPublisherName(name);
    setTab("dashboard");
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setPublisherName("");
    setTab("landing");
  };

  const handleSetTab = (newTab: "landing" | "dashboard") => {
    if (newTab === "dashboard" && !isLoggedIn) {
      setIsAuthOpen(true);
    } else {
      setTab(newTab);
    }
  };

  return (
    <div className="relative flex flex-col min-h-screen bg-slate-50/30 overflow-x-hidden">
      
      {/* Background radial overlays for premium aesthetics */}
      <div className="absolute inset-0 grid-pattern opacity-60 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-b from-blue-50/40 via-transparent to-transparent blur-3xl pointer-events-none" />

      {/* Navigation bar */}
      <Navbar
        currentTab={tab}
        setTab={handleSetTab}
        onOpenAuth={handleOpenAuth}
        isLoggedIn={isLoggedIn}
        onLogout={handleLogout}
      />

      {/* Main Page Rendering */}
      <main className="flex-grow">
        {tab === "landing" ? (
          <>
            <Hero onStart={isLoggedIn ? () => setTab("dashboard") : handleOpenAuth} />
            <EarningCalculator />
            <Features />
            <HowItWorks />
            <SupportedSources />
            <PaymentsSection />
          </>
        ) : (
          isLoggedIn && (
            <DashboardView
              publisherName={publisherName}
              onLogout={handleLogout}
            />
          )
        )}
      </main>

      {/* Footer Branding */}
      <Footer />

      {/* Authentication Popup Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

    </div>
  );
}
