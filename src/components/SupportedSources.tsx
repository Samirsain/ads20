"use client";

import React from "react";
import { motion } from "framer-motion";
import { CheckCircle, Info, ShieldAlert } from "lucide-react";

const TRAFFIC_SOURCES = [
  {
    name: "Facebook",
    color: "shadow-blue-500/5 border-blue-200 hover:border-blue-500 bg-white",
    iconColor: "text-blue-600",
    iconPath: "/facebook-logo.png",
    desc: "Pages, Groups, and Messenger recommendations",
    status: "Approved",
  },
  {
    name: "Instagram",
    color: "shadow-pink-500/5 border-pink-200 hover:border-pink-500 bg-white",
    iconColor: "text-pink-600",
    iconPath: "/instagram-logo.png",
    desc: "Bio links, Stories stickers, and DM outreach",
    status: "Approved",
  },
  {
    name: "Telegram",
    color: "shadow-sky-500/5 border-sky-200 hover:border-sky-500 bg-white",
    iconColor: "text-sky-500",
    iconPath: "/telegram-logo.png",
    desc: "Channels feeds, Groups pins, and custom bot broadcasts",
    status: "Approved",
  },
  {
    name: "WhatsApp",
    color: "shadow-emerald-500/5 border-emerald-200 hover:border-emerald-500 bg-white",
    iconColor: "text-emerald-600",
    iconPath: "/whatsapp-logo.png",
    desc: "Status views, broadcast lists, and community chats",
    status: "Approved",
  },
  {
    name: "YouTube",
    color: "shadow-red-500/5 border-red-200 hover:border-red-500 bg-white",
    iconColor: "text-red-650",
    iconPath: "/youtube-logo.png",
    desc: "Shorts descriptions, pinned comments, and community tab",
    status: "Approved",
  },
  {
    name: "X (Twitter)",
    color: "shadow-zinc-400/5 border-zinc-200 hover:border-zinc-500 bg-white",
    iconColor: "text-zinc-800",
    iconPath: "/twitter-logo.png",
    desc: "Profile link, tweet replies, and Direct Messages",
    status: "Approved",
  },
];

export default function SupportedSources() {
  return (
    <section className="py-20 bg-zinc-50/50 border-t border-zinc-200 relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-normal uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
            Supported Traffic Sources
          </span>
          <h2 className="mt-4 text-3xl font-normal tracking-tight text-zinc-900 sm:text-4xl">
            Where Can You Share Links?
          </h2>
          <p className="mt-4 text-zinc-600 font-normal">
            Social traffic ko monetization campaigns se connect karein. Hum standard and custom social channels support karte hain.
          </p>
        </div>

        {/* Traffic Sources Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TRAFFIC_SOURCES.map((source, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className={`rounded-2xl border p-6 shadow-sm hover:shadow-md transition-all ${source.color}`}
            >
              <div className="flex justify-between items-center mb-4">
                <span className={`text-lg font-normal tracking-tight flex items-center gap-2 ${source.iconColor}`}>
                  {source.iconPath ? (
                    <img 
                      src={source.iconPath} 
                      alt={`${source.name} Logo`} 
                      className="h-6 w-6 object-contain rounded-full border border-zinc-100 bg-zinc-50" 
                    />
                  ) : null}
                  {source.name}
                </span>
                <span className="flex items-center gap-1 text-[10px] font-normal text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle className="h-3 w-3" />
                  {source.status}
                </span>
              </div>
              <p className="text-sm text-zinc-600 font-normal mb-4 leading-relaxed font-sans">
                {source.desc}
              </p>
              <div className="text-xs text-zinc-400 border-t border-zinc-100 pt-3 flex items-center gap-1.5 font-normal">
                <Info className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                <span>Standard tracking link clicks route instant.</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Other Approved Sources Info Box */}
        <div className="mt-12 rounded-2xl border border-zinc-200 bg-white p-6 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
          <div className="flex gap-3 items-center text-left">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-normal text-zinc-900">Have other traffic channels?</h4>
              <p className="text-xs text-zinc-500 font-normal mt-0.5">
                Blogs, forums, email lists ya media buying networks ko add karne ke liye support ticket generate karein.
              </p>
            </div>
          </div>
          <button 
            onClick={() => {
              document.getElementById("calculator")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="w-full md:w-auto shrink-0 rounded-xl bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 px-5 py-2.5 text-xs font-normal text-zinc-700 transition-all"
          >
            Review Traffic Terms
          </button>
        </div>

      </div>
    </section>
  );
}
