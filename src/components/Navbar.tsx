"use client";

import React from "react";
import Link from "next/link";
import { Layers, LogIn } from "lucide-react";
import { InstallAppButton } from "@/components/PwaManager";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl h-16 items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#155EEF] to-[#06B6D4] shadow-sm">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-[#101828]">
            Ads2<span className="text-[#155EEF]">Pub</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <a href="#features" className="text-sm font-normal text-zinc-500 hover:text-zinc-900 transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="text-sm font-normal text-zinc-500 hover:text-zinc-900 transition-colors">
            How It Works
          </a>
          <a href="#payments" className="text-sm font-normal text-zinc-500 hover:text-zinc-900 transition-colors">
            Daily Payouts
          </a>
        </nav>

        {/* Auth Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:block">
            <InstallAppButton compact />
          </div>
          <Link
            href="/publisher/login"
            className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-normal text-zinc-700 hover:bg-zinc-50 transition-all"
          >
            <LogIn className="h-4 w-4 text-zinc-400" />
            Login
          </Link>

          <Link
            href="/publisher/register"
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#155EEF] to-[#06B6D4] hover:opacity-95 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all"
          >
            Sign Up Free
          </Link>
        </div>

      </div>
    </header>
  );
}
