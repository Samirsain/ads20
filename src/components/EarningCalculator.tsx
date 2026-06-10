"use client";

import React, { useState, useEffect } from "react";
import { HelpCircle, Sparkles, Send, Calendar, CreditCard, DollarSign } from "lucide-react";

const PLATFORM_DEFAULTS: Record<string, { name: string; payout: number; icon: string; iconPath?: string }> = {
  telegram: { name: "Telegram Channel / Group", payout: 350, icon: "✈️", iconPath: "/telegram-logo.png" },
  whatsapp: { name: "WhatsApp Group / Status", payout: 300, icon: "💬", iconPath: "/whatsapp-logo.png" },
  facebook: { name: "Facebook Pages / Groups", payout: 250, icon: "📘", iconPath: "/facebook-logo.png" },
  instagram: { name: "Instagram Bio / Stories", payout: 400, icon: "📸", iconPath: "/instagram-logo.png" },
  youtube: { name: "YouTube Description / Community", payout: 500, icon: "🎥", iconPath: "/youtube-logo.png" },
  twitter: { name: "X (Twitter) Feed", payout: 300, icon: "🐦", iconPath: "/twitter-logo.png" },
};

export default function EarningCalculator() {
  const [platform, setPlatform] = useState("telegram");
  const [registrations, setRegistrations] = useState(20);
  const [payout, setPayout] = useState(350);

  // Sync payout when platform changes
  useEffect(() => {
    setPayout(PLATFORM_DEFAULTS[platform].payout);
  }, [platform]);

  // Calculations
  const dailyEarnings = registrations * payout;
  const weeklyEarnings = dailyEarnings * 7;
  const monthlyEarnings = dailyEarnings * 30;

  return (
    <section id="calculator" className="relative py-16 border-t border-zinc-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl font-normal tracking-tight text-zinc-900 sm:text-4xl">
            Monetization Calculator
          </h2>
          <p className="mt-4 text-zinc-650 font-normal">
            Apne traffic source ke mutabik expected daily registrations aur per-conversion payout select karke earning estimate check karein.
          </p>
        </div>

        {/* Calculator Card */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-xl shadow-zinc-100 relative overflow-hidden">
          <div className="absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-blue-50/20 blur-3xl pointer-events-none" />

          {/* Left Inputs */}
          <div className="md:col-span-7 space-y-6">
            
            {/* Platform Selection */}
            <div>
              <label className="block text-xs font-normal text-zinc-500 uppercase tracking-wider mb-3">
                1. Select Traffic Source
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(PLATFORM_DEFAULTS).map(([key, details]) => (
                  <button
                    key={key}
                    onClick={() => setPlatform(key)}
                    className={`flex items-center gap-2.5 rounded-xl p-3 text-sm font-normal transition-all border text-left ${
                      platform === key
                        ? "border-blue-600 bg-blue-50 text-blue-600 shadow-sm"
                        : "border-zinc-200 bg-zinc-50 text-zinc-655 hover:bg-zinc-100 hover:text-zinc-900"
                    }`}
                  >
                    {details.iconPath ? (
                      <img 
                        src={details.iconPath} 
                        alt={details.name} 
                        className="h-5.5 w-5.5 object-contain rounded-full border border-zinc-200/50 bg-white" 
                      />
                    ) : (
                      <span className="text-lg">{details.icon}</span>
                    )}
                    <span className="truncate">{key.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Registration Volume Slider */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-normal text-zinc-500 uppercase tracking-wider">
                  2. Daily Successful Registrations
                </label>
                <span className="text-sm font-normal text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">
                  {registrations} Signups / Day
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="500"
                step="1"
                value={registrations}
                onChange={(e) => setRegistrations(parseInt(e.target.value))}
                className="w-full h-2 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
              />
              <div className="flex justify-between text-[10px] font-normal text-zinc-400 mt-2">
                <span>1 register</span>
                <span>100</span>
                <span>250</span>
                <span>500 signups / day</span>
              </div>
            </div>

            {/* Payout per register Slider */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="flex items-center gap-1.5 text-xs font-normal text-zinc-500 uppercase tracking-wider">
                  3. Payout Per Registration (INR)
                  <span className="group relative cursor-pointer text-zinc-400 hover:text-zinc-650">
                    <HelpCircle className="h-4 w-4" />
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 scale-0 rounded-lg bg-zinc-950 p-2 text-xs text-zinc-200 transition-all group-hover:scale-100 border border-zinc-800 z-20 font-normal normal-case">
                      Registration hone par milne wala reward amount. Har campaign ka reward rate different hota hai.
                    </span>
                  </span>
                </span>
                <span className="text-sm font-normal text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                  ${payout}
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="1500"
                step="10"
                value={payout}
                onChange={(e) => setPayout(parseInt(e.target.value))}
                className="w-full h-2 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-none"
              />
              <div className="flex justify-between text-[10px] font-normal text-zinc-400 mt-2">
                <span>$50</span>
                <span>$500</span>
                <span>$1,500 per signup</span>
              </div>
            </div>

          </div>

          {/* Right Calculations Panel */}
          <div className="md:col-span-5 flex flex-col justify-between rounded-xl border border-zinc-200 bg-zinc-50 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-blue-500/5 blur-2xl pointer-events-none" />

            <div className="space-y-6">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-normal text-emerald-700 shadow-xs">
                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                Estimated Revenue (INR)
              </span>

              {/* Earnings Breakdown */}
              <div className="space-y-4">
                <div className="flex justify-between items-baseline border-b border-zinc-200 pb-3">
                  <div className="flex items-center gap-2 text-zinc-500">
                    <Send className="h-4.5 w-4.5 text-blue-500" />
                    <span className="text-xs font-normal uppercase tracking-wider">Daily Income</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-normal text-zinc-900">${dailyEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="flex justify-between items-baseline border-b border-zinc-200 pb-3">
                  <div className="flex items-center gap-2 text-zinc-500">
                    <Calendar className="h-4.5 w-4.5 text-emerald-600" />
                    <span className="text-xs font-normal uppercase tracking-wider">Weekly Payout</span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-normal text-emerald-600">${weeklyEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="flex justify-between items-baseline pb-2">
                  <span className="flex items-center gap-2 text-zinc-500">
                    <CreditCard className="h-4.5 w-4.5 text-indigo-500" />
                    <span className="text-xs font-normal uppercase tracking-wider">Monthly Earnings</span>
                  </span>
                  <div className="text-right">
                    <span className="text-lg font-normal text-zinc-900">${monthlyEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick reminder text */}
            <div className="mt-8 pt-4 border-t border-zinc-200 flex gap-2 items-start text-xs text-zinc-500">
              <CreditCard className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
              <span className="leading-normal">
                Weekly payouts are processed automatically every Monday. Minimum withdrawal: $1,000.
              </span>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
