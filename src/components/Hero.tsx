"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Play, Zap, Users, TrendingUp, DollarSign } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-20 pb-16 md:pt-32 md:pb-24 bg-[#F8FAFC]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center relative z-10">

        {/* Banner Tag */}
        <div
          className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs sm:text-sm font-medium text-[#155EEF] shadow-xs"
        >
          <Zap className="h-3.5 w-3.5 fill-[#155EEF] text-[#155EEF]" />
          <span>Turn Your Traffic Into Revenue</span>
        </div>

        {/* Headline */}
        <h1
          className="mt-6 text-4xl font-bold tracking-tight text-[#101828] sm:text-5xl md:text-6xl max-w-4xl mx-auto leading-tight"
        >
          Social Traffic Ko Convert Karein <br className="hidden sm:inline" />
          <span className="text-[#155EEF]">
            Real Revenue Me!
          </span>
        </h1>

        {/* Sub-headline */}
        <p
          className="mt-6 text-base sm:text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed"
        >
          Ads2Pub ek smart traffic monetization platform hai jo publishers ko unke social traffic ke liye suitable campaigns se connect karta hai.
        </p>

        {/* CTA Buttons */}
        <div
          className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3.5 max-w-md sm:max-w-none mx-auto"
        >
          <Link href="/publisher/register" className="w-full sm:w-auto">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#155EEF] to-[#06B6D4] px-8 py-4 text-base font-semibold text-white shadow-md hover:opacity-95 transition-all cursor-pointer"
            >
              Start Earning Today
              <ArrowRight className="h-5 w-5" />
            </motion.div>
          </Link>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              document.getElementById("calculator")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 px-8 py-4 text-base font-medium text-zinc-700 shadow-sm transition-all"
          >
            <Play className="h-4.5 w-4.5 text-blue-600 fill-blue-600" />
            Calculate Potential Earnings
          </motion.button>
        </div>

        {/* Trust Stats Bar */}
        <div
          className="mt-14 sm:mt-20 grid grid-cols-2 md:grid-cols-3 gap-6 max-w-4xl mx-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-md shadow-zinc-200/50"
        >
          <div className="flex flex-col items-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 mb-2">
              <Users className="h-5 w-5" />
            </div>
            <span className="text-2xl font-normal text-zinc-900 sm:text-3xl">12,480+</span>
            <span className="text-xs font-normal text-zinc-400 uppercase tracking-wider mt-1">Active Publishers</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 mb-2">
              <TrendingUp className="h-5 w-5" />
            </div>
            <span className="text-2xl font-normal text-zinc-900 sm:text-3xl">24.8M+</span>
            <span className="text-xs font-normal text-zinc-400 uppercase tracking-wider mt-1">Clicks Tracked</span>
          </div>

          <div className="flex flex-col items-center col-span-2 md:col-span-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 mb-2">
              <DollarSign className="h-5 w-5" />
            </div>
            <span className="text-2xl font-normal text-zinc-900 sm:text-3xl">$2.4M+</span>
            <span className="text-xs font-normal text-zinc-400 uppercase tracking-wider mt-1">Total Payouts Paid</span>
          </div>
        </div>

      </div>
    </section>
  );
}
