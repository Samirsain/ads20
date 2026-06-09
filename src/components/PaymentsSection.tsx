"use client";

import React from "react";
import { Calendar, CheckSquare, Coins } from "lucide-react";

const SUPPORTED_METHODS = [
  { name: "USDT (TRC20)", details: "Instant transfer, low network fee", icon: "🌐" },
  { name: "Binance Pay", details: "Zero transaction fee, direct ID transfer", icon: "🪙" },
  { name: "PayPal", details: "Global payment support", icon: "💳" },
  { name: "Bank Transfer", details: "Local bank withdrawal (India & Global)", icon: "🏦" },
  { name: "Wise", details: "Mid-market rate, low transfer fee", icon: "🦉" },
  { name: "Skrill", details: "Fast secure e-wallet integration", icon: "💼" },
  { name: "Payoneer", details: "Direct local bank transfer route", icon: "📈" },
];

const BENEFITS = [
  "Weekly Payments (processed every Monday)",
  "Automatic Processing (no manual claim required)",
  "Transparent Reporting (accurate logs)",
  "Real-Time Earnings Tracking (live balance updates)",
  "Multiple Withdrawal Options (USDT to Local Bank)",
];

export default function PaymentsSection() {
  return (
    <section id="payments" className="py-20 border-t border-zinc-200 bg-white relative">
      <div className="absolute top-1/3 right-1/4 -z-10 h-80 w-80 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />
      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-normal uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Automatic Payment Schedule
          </span>
          <h2 className="mt-4 text-3xl font-normal tracking-tight text-zinc-900 sm:text-4xl">
            Weekly Automatic Payouts
          </h2>
          <p className="mt-4 text-zinc-600 font-normal">
            Ads2Pub believes in fast and transparent payouts. Weekly schedules calculate your traffic commissions and send rewards automatically.
          </p>
        </div>

        {/* Payments Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Left Panel: Schedule Timeline & Benefits */}
          <div className="lg:col-span-6 flex flex-col justify-between rounded-3xl border border-zinc-200 bg-zinc-50/50 p-6 sm:p-8 shadow-sm">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-normal text-zinc-950">Payment Schedule</h3>
                  <p className="text-xs text-zinc-400 font-normal">Every single week, automatically processed</p>
                </div>
              </div>

              {/* Steps timeline in box */}
              <div className="space-y-4 relative pl-4 border-l border-zinc-200 ml-2">
                <div className="relative">
                  <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-blue-600 ring-4 ring-blue-100" />
                  <h4 className="text-sm font-normal text-zinc-800">Monday to Monday Calculation</h4>
                  <p className="text-xs text-zinc-600 mt-1 font-normal leading-relaxed">
                    Aapki weekly earnings Monday subah se agle Monday subah tak automatically calculate ki jaati hain.
                  </p>
                </div>
                
                <div className="relative">
                  <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-emerald-600 ring-4 ring-emerald-100" />
                  <h4 className="text-sm font-normal text-zinc-800">Monday Automatic Payout</h4>
                  <p className="text-xs text-zinc-600 mt-1 font-normal leading-relaxed">
                    Monday ko payout automatically system dwara initiate hota hai aur selected gateway se direct trigger kiya jata hai.
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-purple-600 ring-4 ring-purple-100" />
                  <h4 className="text-sm font-normal text-zinc-800">Direct Delivery</h4>
                  <p className="text-xs text-zinc-600 mt-1 font-normal leading-relaxed">
                    Approved earnings foran aapke saved address (USDT wallet, PayPal or local bank) me deliver ho jaati hain.
                  </p>
                </div>
              </div>
            </div>

            {/* Checklist of benefits */}
            <div className="mt-8 pt-6 border-t border-zinc-200">
              <h4 className="text-xs font-normal uppercase tracking-wider text-zinc-400 mb-3">Key Payout Advantages</h4>
              <ul className="space-y-2.5">
                {BENEFITS.map((benefit, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-xs text-zinc-600 font-normal">
                    <CheckSquare className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Panel: Supported Gateways list */}
          <div className="lg:col-span-6 rounded-3xl border border-zinc-200 bg-zinc-50/50 p-6 sm:p-8 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 border border-blue-200 text-blue-600">
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-normal text-zinc-950">Supported Payment Gateways</h3>
                  <p className="text-xs text-zinc-400 font-normal">Pick any method that fits your location</p>
                </div>
              </div>

              {/* Gateway Rows */}
              <div className="space-y-2">
                {SUPPORTED_METHODS.map((method, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-3 hover:border-zinc-300 transition-colors shadow-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg bg-zinc-50 border border-zinc-200 h-8 w-8 flex items-center justify-center rounded-lg">{method.icon}</span>
                      <div>
                        <h4 className="text-xs font-normal text-zinc-900">{method.name}</h4>
                        <p className="text-[10px] text-zinc-405 font-normal mt-0.5">{method.details}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">Active</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-200 text-center">
              <span className="text-[11px] text-zinc-400 font-normal block">Minimum threshold limit starts at ₹1,000 only!</span>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
