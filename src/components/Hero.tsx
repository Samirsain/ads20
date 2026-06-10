"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Play, Zap, Users, TrendingUp, IndianRupee } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-20 pb-16 md:pt-32 md:pb-24">
      {/* Background decoration */}
      <div className="absolute inset-0 grid-pattern opacity-60" />
      <div className="absolute top-1/4 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl glow-orb animate-glow" />
      <div className="absolute top-1/3 left-1/4 -z-10 h-96 w-96 rounded-full bg-indigo-500/5 blur-3xl glow-orb" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
        
        {/* Banner Tag */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs sm:text-sm font-normal text-blue-600 shadow-sm"
        >
          <Zap className="h-3.5 w-3.5 fill-blue-600" />
          <span>Turn Your Traffic Into Revenue</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-6 text-4xl font-normal tracking-tight text-zinc-950 sm:text-5xl md:text-6xl max-w-4xl mx-auto leading-tight"
        >
          Social Traffic Ko Convert Karein <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-600 bg-clip-text text-transparent">
            Real Revenue Me!
          </span>
        </motion.h1>

        {/* Sub-headline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 text-base sm:text-lg md:text-xl text-zinc-600 max-w-2xl mx-auto leading-relaxed"
        >
          Ads2Pub ek smart traffic monetization platform hai jo publishers ko unke social traffic ke liye suitable campaigns se connect karta hai.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link href="/publisher/register">
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-base font-normal text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all cursor-pointer"
            >
              Start Earning Today
              <ArrowRight className="h-5 w-5" />
            </motion.div>
          </Link>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              document.getElementById("calculator")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 px-8 py-4 text-base font-normal text-zinc-700 shadow-sm transition-all"
          >
            <Play className="h-4.5 w-4.5 text-blue-600 fill-blue-600" />
            Calculate Potential Earnings
          </motion.button>
        </motion.div>

        {/* Trust Stats Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-16 sm:mt-24 grid grid-cols-2 md:grid-cols-3 gap-6 max-w-4xl mx-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-md shadow-zinc-200/50"
        >
          <div className="flex flex-col items-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 mb-2">
              <Users className="h-5 w-5" />
            </div>
            <span className="text-2xl font-normal text-zinc-955 sm:text-3xl">12,480+</span>
            <span className="text-xs font-normal text-zinc-400 uppercase tracking-wider mt-1">Active Publishers</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 mb-2">
              <TrendingUp className="h-5 w-5" />
            </div>
            <span className="text-2xl font-normal text-zinc-955 sm:text-3xl">24.8M+</span>
            <span className="text-xs font-normal text-zinc-400 uppercase tracking-wider mt-1">Clicks Tracked</span>
          </div>

          <div className="flex flex-col items-center col-span-2 md:col-span-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 mb-2">
              <IndianRupee className="h-5 w-5" />
            </div>
            <span className="text-2xl font-normal text-zinc-900 sm:text-3xl">$80L+</span>
            <span className="text-xs font-normal text-zinc-400 uppercase tracking-wider mt-1">Total Payouts Paid</span>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
