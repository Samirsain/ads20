"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle,
  HelpCircle,
  Cpu,
  MousePointerClick,
  Layers,
  ChevronRight,
  TrendingUp,
  Sparkles
} from "lucide-react";
import { getLinks, getCampaigns, recordClick, recordConversion, Campaign, TrackingLink } from "@/lib/storage";

export default function LinkBridgePage() {
  const params = useParams();
  const router = useRouter();
  const code = params?.code as string;

  const [loading, setLoading] = useState(true);
  const [scanStep, setScanStep] = useState(0);
  const [linkData, setLinkData] = useState<TrackingLink | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);
  const [simulationResult, setSimulationResult] = useState<string | null>(null);

  // Initialize and record click
  useEffect(() => {
    if (!code) return;

    // Load data
    const links = getLinks();
    const foundLink = links.find((l) => l.shortCode === code);

    if (!foundLink) {
      setError("This tracking link could not be found. Please check the URL.");
      setLoading(false);
      return;
    }

    // Load campaign
    const campaigns = getCampaigns();
    const foundCampaign = campaigns.find((c) => c.id === foundLink.campaignId);

    if (!foundCampaign) {
      setError("The campaign associated with this link is inactive or has been deleted.");
      setLoading(false);
      return;
    }

    setLinkData(foundLink);
    setCampaign(foundCampaign);

    // Record click count
    recordClick(code);

    // Run security scan animation steps
    const timers = [
      setTimeout(() => setScanStep(1), 500),
      setTimeout(() => setScanStep(2), 1200),
      setTimeout(() => {
        setScanStep(3);
        setLoading(false);
      }, 1805),
    ];

    return () => timers.forEach(clearTimeout);
  }, [code]);

  const handleGoToTarget = () => {
    if (!campaign) return;
    window.open(campaign.targetUrl, "_blank");
  };

  const handleSimulateRegistration = () => {
    if (!code || !campaign) return;

    const result = recordConversion(code);
    if (result) {
      setRegistered(true);
      setSimulationResult(
        `🎉 Lead Verified! Publisher balance credited with ₹${result.payout.toFixed(0)}.`
      );
      // Automatically clear simulation alert after 6 seconds
      setTimeout(() => {
        setSimulationResult(null);
      }, 6000);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-50/40 flex flex-col items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 grid-pattern opacity-60 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-full max-w-lg h-72 bg-gradient-to-b from-blue-500/5 via-indigo-500/5 to-transparent blur-3xl pointer-events-none" />

      {/* Header Logo */}
      <div className="flex items-center gap-2 mb-8 cursor-pointer" onClick={() => router.push("/")}>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-md">
          <Layers className="h-5 w-5 text-white" />
        </div>
        <span className="text-xl font-normal tracking-tight text-zinc-950">
          Ads2<span className="text-blue-600">Pub</span> Link Shield
        </span>
      </div>

      <div className="w-full max-w-xl">
        <AnimatePresence mode="wait">
          {error ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-lg"
            >
              <AlertCircle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
              <h2 className="text-lg font-normal text-zinc-950 mb-2">Campaign Error</h2>
              <p className="text-sm text-zinc-500 mb-6">{error}</p>
              <button
                onClick={() => router.push("/")}
                className="rounded-xl bg-zinc-900 text-white px-5 py-2.5 text-xs hover:bg-zinc-800 transition-all shadow-sm"
              >
                Go Back Home
              </button>
            </motion.div>
          ) : loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-lg"
            >
              <div className="relative h-16 w-16 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-blue-50 border-t-blue-600 animate-spin" />
                <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                  <ShieldCheck className="h-6 w-6 text-blue-600" />
                </div>
              </div>

              <h2 className="text-lg font-normal text-zinc-900">Validating Link Security</h2>
              <div className="mt-4 space-y-2 max-w-xs mx-auto">
                <div className="flex items-center justify-between text-xs text-zinc-400 font-normal">
                  <span>Checking routing code...</span>
                  <span className={scanStep >= 1 ? "text-emerald-600" : "text-zinc-300"}>
                    {scanStep >= 1 ? "✔ Done" : "Checking"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-400 font-normal">
                  <span>Validating campaign status...</span>
                  <span className={scanStep >= 2 ? "text-emerald-600" : "text-zinc-300"}>
                    {scanStep >= 2 ? "✔ Active" : "Checking"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-400 font-normal">
                  <span>Counting unique click source...</span>
                  <span className={scanStep >= 3 ? "text-emerald-600" : "text-zinc-300"}>
                    {scanStep >= 3 ? "✔ Saved" : "Tracking"}
                  </span>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Main Redirect Offer Card */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-lg relative overflow-hidden">
                <div className="absolute -top-12 -right-12 h-24 w-24 rounded-full bg-blue-500/5 blur-xl pointer-events-none" />

                <div className="flex items-center gap-3 border-b border-zinc-100 pb-5 mb-5">
                  <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                    <Cpu className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-zinc-400 tracking-wider font-normal">Active CPA Offer Link</span>
                    <h2 className="text-base font-normal text-zinc-900">{campaign?.name}</h2>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-4">
                    <h4 className="text-xs font-normal text-zinc-900 mb-1 flex items-center gap-1.5">
                      <HelpCircle className="h-3.5 w-3.5 text-blue-600" />
                      Registration Instructions:
                    </h4>
                    <p className="text-xs text-zinc-500 leading-relaxed font-normal">
                      {campaign?.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-zinc-500 border-t border-b border-zinc-100 py-3.5">
                    <div className="flex items-center gap-1.5 font-normal">
                      <MousePointerClick className="h-3.5 w-3.5 text-blue-500" />
                      <span>Traffic status: <strong className="text-emerald-600">Tracked</strong></span>
                    </div>
                    <div className="font-normal">
                      <span>Campaign ID: <strong>{campaign?.id}</strong></span>
                    </div>
                  </div>

                  {/* Primary Call to Action */}
                  <div className="pt-2">
                    <button
                      onClick={handleGoToTarget}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 py-3.5 text-sm font-normal text-white shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 transition-all"
                    >
                      Open Target Page & Register
                      <ExternalLink className="h-4 w-4" />
                    </button>
                    <p className="text-[10px] text-zinc-400 text-center mt-2.5 leading-normal font-normal">
                      Note: You must register on the target page to complete this campaign.
                    </p>
                  </div>
                </div>
              </div>

              {/* Publisher Interactive Simulation Sandbox */}
              <div className="rounded-2xl border border-zinc-200 bg-zinc-950 p-6 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 h-32 w-32 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex items-center gap-2 mb-4">
                  <Cpu className="h-4 w-4 text-blue-400 animate-pulse" />
                  <span className="text-xs font-normal uppercase tracking-widest text-zinc-400">
                    Publisher Testing Sandbox
                  </span>
                  <span className="ml-auto text-[9px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded uppercase font-normal">
                    Simulator Mode
                  </span>
                </div>

                <h3 className="text-sm font-normal text-white mb-1">Simulate Visitor Registration</h3>
                <p className="text-xs text-zinc-400 leading-normal mb-5 font-normal">
                  In a real system, the target page fires an S2S Postback call when a user registers. Since you are in test mode, you can trigger a successful registration with this simulator button.
                </p>

                <div className="space-y-4">
                  <button
                    onClick={handleSimulateRegistration}
                    className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-normal transition-all ${
                      registered
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "bg-blue-600 hover:bg-blue-500 text-white animate-pulse"
                    }`}
                  >
                    {registered ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-white" />
                        Trigger Another Register Sim
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 text-white" />
                        Simulate Registration Completed
                      </>
                    )}
                  </button>

                  <AnimatePresence>
                    {simulationResult && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="rounded-xl border border-emerald-500/20 bg-emerald-950/30 p-3 text-xs text-emerald-400 flex items-start gap-2"
                      >
                        <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="leading-normal font-normal">{simulationResult}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Developer Info Box */}
              <div className="text-center text-xs text-zinc-400 font-normal">
                Open your <span className="text-blue-600 font-medium">Ads2Pub Dashboard</span> in another tab to see the clicks and balance update in real-time when you trigger registration!
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
