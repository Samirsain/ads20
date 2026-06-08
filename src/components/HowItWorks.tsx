"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { UserPlus, Link2, Share2, Activity, Wallet, ArrowRight } from "lucide-react";

const STEPS = [
  {
    icon: UserPlus,
    step: "01",
    title: "Account Register Karein",
    description: "Ads2Pub par free account register karein. Kisi approval delay ke bina, registration hote hi aapka dashboard access ready ho jata hai.",
    glow: "bg-blue-600",
  },
  {
    icon: Link2,
    step: "02",
    title: "Apni Tracking Link Create Karein",
    description: "Smart Link Creator ka use karke link generate karein. Ye dynamic URLs automatically smart campaigns ke sath integrate ho jati hain.",
    glow: "bg-purple-600",
  },
  {
    icon: Share2,
    step: "03",
    title: "Traffic Send Karein",
    description: "Apne approved traffic sources jaise Facebook, Instagram, Telegram, WhatsApp, YouTube, X (Twitter) se users ko links par redirect karein.",
    glow: "bg-emerald-600",
  },
  {
    icon: Activity,
    step: "04",
    title: "Automatic Tracking System",
    description: "Hamara platform real-time me clicks, unique visitors, conversions aur earnings ko trace karta hai bina kisi latency ke.",
    glow: "bg-amber-600",
  },
  {
    icon: Wallet,
    step: "05",
    title: "Wallet Credit & Payouts",
    description: "Generated commission aapke wallet balance me transfer kar diya jayega jise har Monday automatic payout schedule se withdraw kar sakte hain.",
    glow: "bg-rose-600",
  },
];

export default function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section id="how-it-works" className="py-20 border-t border-zinc-200 bg-white relative">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-normal uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Kaise Kaam Karta Hai?
          </span>
          <h2 className="mt-4 text-3xl font-normal tracking-tight text-zinc-900 sm:text-4xl">
            Simple 5-Step Process
          </h2>
          <p className="mt-4 text-zinc-600 font-normal">
            Apne network se passive income generate karna shuru karein. Hamara automated platform har ek step ko simplify karta hai.
          </p>
        </div>

        {/* Timeline Grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Steps list selectors */}
          <div className="lg:col-span-5 space-y-4">
            {STEPS.map((stepItem, idx) => {
              const Icon = stepItem.icon;
              const isActive = activeStep === idx;
              return (
                <button
                  key={idx}
                  onClick={() => setActiveStep(idx)}
                  className={`w-full flex items-start gap-4 rounded-2xl border p-4 text-left transition-all relative ${
                    isActive
                      ? "border-blue-500 bg-blue-50/50 text-zinc-950 shadow-sm"
                      : "border-zinc-200 bg-zinc-50/50 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                  }`}
                >
                  {/* Left step number */}
                  <span className={`text-xs font-normal tracking-wider px-2 py-1 rounded-md ${
                    isActive ? "bg-blue-100 text-blue-700" : "bg-zinc-200 text-zinc-500"
                  }`}>
                    {stepItem.step}
                  </span>

                  {/* Text details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-normal truncate">
                      {stepItem.title}
                    </h3>
                    {isActive && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-2 text-sm text-zinc-600 leading-relaxed font-normal"
                      >
                        {stepItem.description}
                      </motion.p>
                    )}
                  </div>
                  
                  <div className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
                    isActive ? "border-blue-200 text-blue-600 bg-white" : "border-zinc-200 text-zinc-400 bg-white"
                  }`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Large dynamic view panel */}
          <div className="lg:col-span-7 h-full flex flex-col justify-between rounded-3xl border border-zinc-200 bg-white p-8 relative overflow-hidden shadow-lg shadow-zinc-100">
            <div className={`absolute -top-20 -right-20 h-64 w-64 rounded-full ${STEPS[activeStep].glow}/5 blur-3xl pointer-events-none`} />

            <div className="relative z-10">
              {/* Step Title & Icon */}
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-50 border border-zinc-200 text-blue-600 shadow-xs`}>
                  {React.createElement(STEPS[activeStep].icon, { className: "h-6 w-6" })}
                </div>
                <div>
                  <span className="text-[10px] font-normal text-zinc-400 uppercase tracking-widest">
                    Step {STEPS[activeStep].step} Detailed Flow
                  </span>
                  <h4 className="text-xl font-normal text-zinc-900">
                    {STEPS[activeStep].title}
                  </h4>
                </div>
              </div>

              {/* Explanatory graphic or paragraph */}
              <p className="mt-8 text-base text-zinc-600 font-normal leading-relaxed">
                {STEPS[activeStep].description}
              </p>

              {/* Additional Context Box */}
              <div className="mt-6 p-4 rounded-xl border border-zinc-200 bg-zinc-50">
                <span className="text-xs font-normal text-blue-700 uppercase tracking-wider block mb-1">
                  💡 Publisher Tip
                </span>
                <span className="text-xs text-zinc-650 leading-relaxed font-normal">
                  {activeStep === 0 && "Sign up ke baad billing settings me jaakar USDT or Bank methods verify karayein."}
                  {activeStep === 1 && "Har traffic source ke liye separate links banayein taaki accurate analytics filter ho sake."}
                  {activeStep === 2 && "Aap ek saath multiple links active rakh sakte hain. Groups and channel feed ke pin section me links embed karein."}
                  {activeStep === 3 && "Conversion notification details seedhe dashboard and user panel me realtime refresh kiye jate hain."}
                  {activeStep === 4 && "Available and pending wallet components real-time update hote hain, ensuring transparent audit report."}
                </span>
              </div>
            </div>

            {/* Bottom controller button */}
            <div className="mt-8 pt-6 border-t border-zinc-100 flex justify-between items-center">
              <span className="text-xs font-normal text-zinc-400">
                Active View: Step {activeStep + 1} of 5
              </span>
              
              <button
                onClick={() => setActiveStep((prev) => (prev + 1) % STEPS.length)}
                className="flex items-center gap-1.5 text-xs font-normal text-blue-600 hover:text-blue-700 hover:underline"
              >
                Next Step
                <ArrowRight className="h-4.5 w-4.5" />
              </button>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
