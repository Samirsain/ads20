"use client";

import React from "react";
import { Layers } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-50/50 py-12 relative z-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-sm">
                <Layers className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-normal text-zinc-900">Ads2Pub</span>
            </div>
            <p className="text-xs text-zinc-500 leading-normal max-w-sm font-normal">
              Ads2Pub is a high-performance smart traffic monetization system connecting social media networks to optimized CPA campaigns. Get paid automatically every week.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-normal uppercase tracking-wider text-zinc-400">Resources</h4>
            <ul className="space-y-2 text-xs font-normal">
              <li>
                <a href="#features" className="text-zinc-500 hover:text-zinc-800 transition-colors">Platform Features</a>
              </li>
              <li>
                <a href="#calculator" className="text-zinc-500 hover:text-zinc-800 transition-colors">Earning Calculator</a>
              </li>
              <li>
                <a href="#how-it-works" className="text-zinc-500 hover:text-zinc-800 transition-colors">Onboarding Process</a>
              </li>
            </ul>
          </div>

          {/* Compliance */}
          <div className="space-y-3">
            <h4 className="text-xs font-normal uppercase tracking-wider text-zinc-400">Compliance & Support</h4>
            <ul className="space-y-2 text-xs text-zinc-500 font-normal">
              <li>
                <a href="#" className="hover:text-zinc-800 transition-colors">Terms of Service</a>
              </li>
              <li>
                <a href="#" className="hover:text-zinc-800 transition-colors">Anti-Fraud Guidelines</a>
              </li>
              <li>
                <a href="mailto:support@ads2pub.com" className="hover:text-zinc-800 transition-colors">support@ads2pub.com</a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom copyright row */}
        <div className="pt-8 border-t border-zinc-200/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <span className="text-[11px] text-zinc-500 font-normal">
            &copy; {new Date().getFullYear()} Ads2Pub. All rights reserved.
          </span>
          <span className="text-[10px] text-zinc-400 font-normal">
            Strict Anti-Fraud systems active. Instant bans for click bots or traffic automation.
          </span>
        </div>

      </div>
    </footer>
  );
}
