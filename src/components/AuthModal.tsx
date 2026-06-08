"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, User, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (name: string) => void;
}

export default function AuthModal({ isOpen, onClose, onLoginSuccess }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(true);
  const [name, setName] = useState("Samir Kumar");
  const [email, setEmail] = useState("samir@example.com");
  const [password, setPassword] = useState("password");
  const [source, setSource] = useState("facebook");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isSignUp && !name) {
      setError("Please enter your name");
      return;
    }
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      onLoginSuccess(isSignUp ? name : email.split("@")[0]);
      setSuccess(false);
      onClose();
      // Reset form
      setName("Samir Kumar");
      setEmail("samir@example.com");
      setPassword("password");
      setSource("facebook");
    }, 1200);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-zinc-900/60 backdrop-blur-xs"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 15 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl sm:p-8"
          >
            {/* Top decorative glow */}
            <div className="absolute -top-12 -left-12 h-32 w-32 rounded-full bg-blue-500/5 blur-xl pointer-events-none" />
            <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-emerald-500/5 blur-xl pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-10 w-10 animate-bounce" />
                </div>
                <h3 className="text-xl font-normal text-zinc-900">Success!</h3>
                <p className="mt-2 text-sm text-zinc-500">
                  {isSignUp ? "Account registered successfully." : "Welcome back to Ads2Pub!"}
                </p>
                <p className="mt-1 text-xs text-blue-600 font-normal">Loading your publisher panel...</p>
              </motion.div>
            ) : (
              <div>
                {/* Header */}
                <div className="mb-6 text-center">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-sm">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-2xl font-normal tracking-tight text-zinc-955">
                    {isSignUp ? "Create your account" : "Welcome back"}
                  </h2>
                  <p className="mt-1.5 text-sm text-zinc-500">
                    {isSignUp 
                      ? "Start turning your social traffic into revenue" 
                      : "Access your tracking links & real-time analytics"
                    }
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-600 border border-red-200">
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                      <span>{error}</span>
                    </div>
                  )}

                  {isSignUp && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-normal text-zinc-500">Full Name</label>
                      <div className="relative">
                        <User className="absolute top-3.5 left-3 h-4 w-4 text-zinc-400" />
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Samir Kumar"
                          className="shadcn-input pl-10"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-normal text-zinc-500">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute top-3.5 left-3 h-4 w-4 text-zinc-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="samir@example.com"
                        className="shadcn-input pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-normal text-zinc-500">Password</label>
                      {!isSignUp && (
                        <a href="#" className="text-xs text-blue-600 font-normal hover:underline">
                          Forgot password?
                        </a>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute top-3.5 left-3 h-4 w-4 text-zinc-400" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="shadcn-input pl-10"
                      />
                    </div>
                  </div>

                  {isSignUp && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-normal text-zinc-500">Primary Traffic Source</label>
                      <select
                        value={source}
                        onChange={(e) => setSource(e.target.value)}
                        className="shadcn-select"
                      >
                        <option value="facebook">Facebook Pages / Groups</option>
                        <option value="instagram">Instagram bio / stories</option>
                        <option value="telegram">Telegram Channel / Group</option>
                        <option value="whatsapp">WhatsApp Group / status</option>
                        <option value="youtube">YouTube Channel description</option>
                        <option value="twitter">X (Twitter)</option>
                        <option value="other">Other Approved Source</option>
                      </select>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full mt-2 rounded-xl bg-blue-650 py-3 text-sm font-normal text-white shadow-sm hover:bg-blue-700 transition-all"
                  >
                    {isSignUp ? "Register & Enter Dashboard" : "Sign In to Dashboard"}
                  </button>
                </form>

                {/* Toggle sign up / sign in */}
                <div className="mt-6 text-center text-xs text-zinc-500">
                  {isSignUp ? (
                    <span>
                      Already have an account?{" "}
                      <button
                        onClick={() => setIsSignUp(false)}
                        className="font-normal text-blue-600 hover:underline"
                      >
                        Sign In
                      </button>
                    </span>
                  ) : (
                    <span>
                      New to Ads2Pub?{" "}
                      <button
                        onClick={() => setIsSignUp(true)}
                        className="font-normal text-blue-600 hover:underline"
                      >
                        Create Account
                      </button>
                    </span>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
