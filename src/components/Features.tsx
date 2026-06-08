"use client";

import React from "react";
import { motion } from "framer-motion";
import { Link, BarChart3, Shuffle, Wallet, CheckSquare, Zap } from "lucide-react";

const FEATURES_DATA = [
  {
    icon: Link,
    title: "Easy Link Creation",
    description: "Apni custom tracking link sirf ek click me create karein aur foran traffic send karna shuru karein.",
    color: "from-blue-500 to-indigo-500",
  },
  {
    icon: BarChart3,
    title: "Real-Time Reporting",
    description: "Total clicks, unique visitors, conversions, revenue, EPC aur CTR ko live dashboard me dynamic updates ke sath track karein.",
    color: "from-purple-500 to-indigo-500",
  },
  {
    icon: Shuffle,
    title: "Smart Campaign Matching",
    description: "Ads2Pub ka core system automatic relevant campaigns par traffic route karta hai taaki highest conversions aur maximum profit mile.",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: Wallet,
    title: "Multiple Withdrawal Options",
    description: "USDT, Binance Pay, PayPal, Bank Transfer, Wise, Skrill aur Payoneer jaise local aur global options ke sath paid rahein.",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: Zap,
    title: "Fast & Transparent Tracking",
    description: "Advanced redirect techniques ensure karti hain ki aapka single click bhi leak na ho, pure accuracy guarantee ke sath.",
    color: "from-pink-500 to-rose-500",
  },
  {
    icon: CheckSquare,
    title: "Dedicated Publisher Support",
    description: "Kisi bhi problem ya payout setup ke liye 24/7 dedicated support desk. Aapka business, hamari priority.",
    color: "from-cyan-500 to-blue-500",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20 border-t border-zinc-200 bg-zinc-50/30 relative">
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -z-10 h-80 w-80 rounded-full bg-blue-600/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 -z-10 h-72 w-72 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-normal uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
            Why Choose Ads2Pub
          </span>
          <h2 className="mt-4 text-3xl font-normal tracking-tight text-zinc-900 sm:text-4xl">
            Smarter Monetization, Faster Payouts
          </h2>
          <p className="mt-4 text-lg text-zinc-650 font-normal">
            Ads2Pub aapke traffic ko optimization technology se analyze karta hai aur campaigns se connect karta hai.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES_DATA.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                className="glass-panel glass-panel-hover group relative rounded-2xl p-6 transition-all duration-300 overflow-hidden"
              >
                {/* Accent top gradient border decoration */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-zinc-200 to-transparent group-hover:via-zinc-300 transition-all" />

                {/* Animated Icon box */}
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr ${feature.color} text-white shadow-md transition-transform group-hover:scale-110 duration-300`}>
                  <Icon className="h-6 w-6" />
                </div>

                <h3 className="mt-4 text-lg font-normal text-zinc-900 group-hover:text-blue-600 transition-colors">
                  {feature.title}
                </h3>
                
                <p className="mt-2.5 text-sm leading-relaxed text-zinc-600 font-normal">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
