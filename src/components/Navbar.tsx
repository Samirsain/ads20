"use client";

import React from "react";
import { motion } from "framer-motion";
import { Layers, ChevronRight, LogIn, LayoutDashboard, Home } from "lucide-react";

interface NavbarProps {
  currentTab: "landing" | "dashboard";
  setTab: (tab: "landing" | "dashboard") => void;
  onOpenAuth: () => void;
  isLoggedIn: boolean;
  onLogout: () => void;
}

export default function Navbar({
  currentTab,
  setTab,
  onOpenAuth,
  isLoggedIn,
  onLogout,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Logo */}
        <div 
          onClick={() => setTab("landing")} 
          className="flex cursor-pointer items-center gap-2"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-md shadow-blue-500/10">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-normal tracking-tight text-zinc-900">
            Ads2<span className="text-blue-600">Pub</span>
          </span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <button
            onClick={() => setTab("landing")}
            className={`flex items-center gap-1.5 text-sm font-normal transition-colors ${
              currentTab === "landing" ? "text-blue-600" : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            <Home className="h-4 w-4" />
            Home
          </button>
          
          <a
            href="#features"
            className="text-sm font-normal text-zinc-500 hover:text-zinc-900 transition-colors"
            onClick={(e) => {
              if (currentTab === "dashboard") {
                setTab("landing");
                setTimeout(() => {
                  document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
                }, 100);
              }
            }}
          >
            Features
          </a>
          
          <a
            href="#how-it-works"
            className="text-sm font-normal text-zinc-500 hover:text-zinc-900 transition-colors"
            onClick={(e) => {
              if (currentTab === "dashboard") {
                setTab("landing");
                setTimeout(() => {
                  document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
                }, 100);
              }
            }}
          >
            How It Works
          </a>

          <a
            href="#payments"
            className="text-sm font-normal text-zinc-500 hover:text-zinc-900 transition-colors"
            onClick={(e) => {
              if (currentTab === "dashboard") {
                setTab("landing");
                setTimeout(() => {
                  document.getElementById("payments")?.scrollIntoView({ behavior: "smooth" });
                }, 100);
              }
            }}
          >
            Weekly Payouts
          </a>
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <>
              {currentTab === "landing" ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setTab("dashboard")}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-normal text-white hover:bg-blue-700 shadow-sm transition-all"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                  <ChevronRight className="h-4 w-4" />
                </motion.button>
              ) : (
                <button
                  onClick={() => setTab("landing")}
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-normal text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 shadow-sm transition-all"
                >
                  View Website
                </button>
              )}
              <button
                onClick={onLogout}
                className="hidden sm:inline-flex text-xs font-normal text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-normal text-zinc-700 hover:bg-zinc-50 transition-all"
              >
                <LogIn className="h-4 w-4 text-zinc-400" />
                Login
              </button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-normal text-white shadow-sm transition-all"
              >
                Sign Up Free
              </motion.button>
            </>
          )}
        </div>

      </div>
    </header>
  );
}
