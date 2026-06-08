"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  DollarSign,
  MousePointerClick,
  CheckCircle,
  Clock,
  Link as LinkIcon,
  Play,
  Pause,
  AlertCircle,
  Copy,
  PlusCircle,
  CreditCard,
  Send,
  HelpCircle,
  ShieldCheck
} from "lucide-react";
import AnalyticsChart from "./AnalyticsChart";

interface DashboardViewProps {
  publisherName: string;
  onLogout: () => void;
}

interface TrackingLink {
  id: string;
  name: string;
  source: string;
  clicks: number;
  conversions: number;
  revenue: number;
  url: string;
  date: string;
}

interface ToastNotification {
  id: number;
  message: string;
  type: "click" | "conversion";
}

const DEFAULT_LINKS: TrackingLink[] = [
  {
    id: "lnk-102",
    name: "Telegram Crypto Campaign",
    source: "telegram",
    clicks: 450,
    conversions: 28,
    revenue: 1120,
    url: "https://a2p.cc/tg-crypto-samir",
    date: "2026-06-05",
  },
  {
    id: "lnk-103",
    name: "WhatsApp Status Offer",
    source: "whatsapp",
    clicks: 280,
    conversions: 18,
    revenue: 720,
    url: "https://a2p.cc/wa-status-samir",
    date: "2026-06-06",
  },
  {
    id: "lnk-104",
    name: "Facebook Reel Promo",
    source: "facebook",
    clicks: 110,
    conversions: 6,
    revenue: 180,
    url: "https://a2p.cc/fb-reel-samir",
    date: "2026-06-07",
  },
];

export default function DashboardView({ publisherName, onLogout }: DashboardViewProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "links" | "payouts" | "support">("overview");
  
  // Real-time Dashboard Metrics
  const [balance, setBalance] = useState(2450.0);
  const [pending, setPending] = useState(890.0);
  const [totalClicks, setTotalClicks] = useState(840);
  const [totalConversions, setTotalConversions] = useState(52);
  const [totalRevenue, setTotalRevenue] = useState(2020.0);
  
  // Chart Data State
  const [chartData, setChartData] = useState([
    { label: "09:00", clicks: 45, revenue: 110 },
    { label: "10:00", clicks: 68, revenue: 170 },
    { label: "11:00", clicks: 95, revenue: 240 },
    { label: "12:00", clicks: 120, revenue: 310 },
    { label: "13:00", clicks: 140, revenue: 380 },
    { label: "14:00", clicks: 160, revenue: 410 },
    { label: "15:00", clicks: 212, revenue: 400 },
  ]);

  // Links state
  const [links, setLinks] = useState<TrackingLink[]>(DEFAULT_LINKS);
  
  // Link Creator Inputs
  const [campaignName, setCampaignName] = useState("");
  const [trafficSource, setTrafficSource] = useState("telegram");
  const [redirectUrl, setRedirectUrl] = useState("https://offer.ads2pub.com/cpa-smart-route");
  
  // Simulation Controls
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(2500); // ms
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const toastIdRef = useRef(0);

  // Countdown timer for Monday payout
  const [countdownText, setCountdownText] = useState("");

  // Payment Setup details
  const [payoutMethod, setPayoutMethod] = useState("usdt");
  const [payoutAddress, setPayoutAddress] = useState("");
  const [isAddressSaved, setIsAddressSaved] = useState(false);
  const [payoutHistory, setPayoutHistory] = useState([
    { date: "2026-06-01", amount: 1820.0, method: "USDT (TRC20)", status: "Completed" },
    { date: "2026-05-25", amount: 1540.0, method: "Binance Pay", status: "Completed" },
  ]);

  // Help Desk state
  const [chatMessages, setChatMessages] = useState<{ sender: "user" | "bot"; text: string }[]>([
    { sender: "bot", text: "Hello! Main Ads2Pub support bot hoon. Aap payout settings, link tracking, ya campaigns matching se related kuch bhi pooch sakte hain." },
  ]);
  const [chatInput, setChatInput] = useState("");

  // Copy success notification
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // Countdown effect
  useEffect(() => {
    const getCountdown = () => {
      const now = new Date();
      // Calculate days until next Monday
      const dayOfWeek = now.getDay();
      const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
      
      const nextMonday = new Date(now);
      nextMonday.setDate(now.getDate() + daysUntilMonday);
      nextMonday.setHours(0, 0, 0, 0);

      const diff = nextMonday.getTime() - now.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setCountdownText(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };

    getCountdown();
    const interval = setInterval(getCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Simulation running loop
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      // Simulate click events
      const addedClicks = Math.floor(Math.random() * 8) + 1;
      
      // Update general metrics
      setTotalClicks((prev) => prev + addedClicks);
      
      // Select a random active link to assign these clicks to
      const randomLinkIdx = Math.floor(Math.random() * links.length);
      const updatedLinks = [...links];
      updatedLinks[randomLinkIdx].clicks += addedClicks;

      let conversionOccurred = false;
      let revenueAmount = 0;

      // Determine if a conversion happened (15% conversion probability)
      if (Math.random() < 0.15) {
        conversionOccurred = true;
        const conversionsCount = Math.floor(Math.random() * 2) + 1;
        // Average payout per conversion: $35 to $85
        revenueAmount = conversionsCount * (Math.floor(Math.random() * 50) + 35);
        
        setTotalConversions((prev) => prev + conversionsCount);
        setTotalRevenue((prev) => prev + revenueAmount);
        setBalance((prev) => prev + revenueAmount);
        setPending((prev) => prev + revenueAmount * 0.35); // 35% buffer goes to pending audit

        updatedLinks[randomLinkIdx].conversions += conversionsCount;
        updatedLinks[randomLinkIdx].revenue += revenueAmount;

        // Show conversion alert
        const id = toastIdRef.current++;
        const msg = `Conversion: ${updatedLinks[randomLinkIdx].name} got +${conversionsCount} leads (Earned $${revenueAmount})`;
        setToasts((prev) => [...prev.slice(-3), { id, message: msg, type: "conversion" }]);
      } else {
        // Show click alert
        const id = toastIdRef.current++;
        const msg = `Traffic: ${addedClicks} clicks routed from ${updatedLinks[randomLinkIdx].source.toUpperCase()}`;
        setToasts((prev) => [...prev.slice(-3), { id, message: msg, type: "click" }]);
      }

      setLinks(updatedLinks);

      // Append to the last node of chart data or shift
      setChartData((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        last.clicks += addedClicks;
        last.revenue += revenueAmount;
        return next;
      });

    }, simulationSpeed);

    return () => clearInterval(interval);
  }, [isSimulating, simulationSpeed, links]);

  // Clean up toasts automatically
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 4000);
    return () => clearTimeout(timer);
  }, [toasts]);

  // Handle Link Generation
  const handleCreateLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName) return;

    const shortId = Math.random().toString(36).substring(2, 7);
    const generatedUrl = `https://a2p.cc/${trafficSource}-${shortId}`;

    const newLink: TrackingLink = {
      id: `lnk-${Math.floor(Math.random() * 900) + 100}`,
      name: campaignName,
      source: trafficSource,
      clicks: 0,
      conversions: 0,
      revenue: 0,
      url: generatedUrl,
      date: new Date().toISOString().split("T")[0],
    };

    setLinks([newLink, ...links]);
    setCampaignName("");

    // Notify user
    const id = toastIdRef.current++;
    setToasts((prev) => [...prev, { id, message: `Created new smart campaign link for ${trafficSource.toUpperCase()}`, type: "click" }]);
  };

  // Helper to copy link text
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(id);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  // Send test click instantly
  const handleForceClick = () => {
    const addedClicks = 10;
    setTotalClicks((prev) => prev + addedClicks);
    
    const randomIdx = Math.floor(Math.random() * links.length);
    const updated = [...links];
    updated[randomIdx].clicks += addedClicks;
    setLinks(updated);

    const id = toastIdRef.current++;
    setToasts((prev) => [...prev.slice(-3), { id, message: `Simulated 10 fast clicks from ${updated[randomIdx].source.toUpperCase()}`, type: "click" }]);
  };

  // Send test conversion instantly
  const handleForceConversion = () => {
    const rev = Math.floor(Math.random() * 40) + 40;
    setTotalConversions((prev) => prev + 1);
    setTotalRevenue((prev) => prev + rev);
    setBalance((prev) => prev + rev);

    const randomIdx = Math.floor(Math.random() * links.length);
    const updated = [...links];
    updated[randomIdx].conversions += 1;
    updated[randomIdx].revenue += rev;
    setLinks(updated);

    const id = toastIdRef.current++;
    setToasts((prev) => [...prev.slice(-3), { id, message: `Conversion Boost: Generated 1 lead for ${updated[randomIdx].name} ($${rev})`, type: "conversion" }]);
  };

  // Calculations for computed ratios
  const ctr = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(2) : "0.00";
  const epc = totalClicks > 0 ? (totalRevenue / totalClicks).toFixed(2) : "0.00";

  // Mock bot support chat flow
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
    setChatInput("");

    setTimeout(() => {
      let reply = "Humne aapki query support system me list kar di hai. A representative will get back to you shortly.";
      const query = userMsg.toLowerCase();
      
      if (query.includes("payout") || query.includes("payment") || query.includes("money") || query.includes("paisa")) {
        reply = "Ads2Pub par payouts har Monday subah automatically process hote hain. Payout threshold $10 hai. Aap Payouts tab me jaakar details verify kar sakte hain.";
      } else if (query.includes("link") || query.includes("campaign")) {
        reply = "Aap 'Link Builder' tab me custom redirect links generate kar sakte hain. WhatsApp, Telegram aur Facebook lists traffic ke liye high-converting landing route defaults choose hote hain.";
      } else if (query.includes("traffic") || query.includes("click") || query.includes("fake")) {
        reply = "Hum fake traffic, bot traffic ya high-frequency auto clickers detect karke suspend karte hain. Real social media platforms, channels and bios se authentic traffic hi trace kiya jayega.";
      }

      setChatMessages((prev) => [...prev, { sender: "bot", text: reply }]);
    }, 1000);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Toast Alert stack absolute layout */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={`rounded-xl border p-4 shadow-xl text-xs flex gap-2 items-center pointer-events-auto ${
                toast.type === "conversion"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-blue-50 border-blue-200 text-blue-800"
              }`}
            >
              {toast.type === "conversion" ? (
                <ShieldCheck className="h-4.5 w-4.5 shrink-0 text-emerald-600 animate-bounce" />
              ) : (
                <MousePointerClick className="h-4.5 w-4.5 shrink-0 text-blue-600" />
              )}
              <span className="font-normal">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Dashboard Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-normal text-zinc-400 uppercase tracking-widest">Publisher Panel</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-emerald-600 font-normal uppercase">Live Tracking Active</span>
          </div>
          <h1 className="text-2xl font-normal text-zinc-900 mt-1">
            Welcome back, <span className="text-blue-600">{publisherName}</span>!
          </h1>
        </div>

        {/* Traffic Simulator Controls */}
        <div className="rounded-xl border border-zinc-200 bg-white p-3 flex flex-wrap items-center gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-normal text-zinc-500 uppercase tracking-wider">Traffic Simulator:</span>
            <button
              onClick={() => setIsSimulating(!isSimulating)}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-normal transition-all ${
                isSimulating
                  ? "bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              }`}
            >
              {isSimulating ? (
                <>
                  <Pause className="h-3.5 w-3.5" />
                  Pause Simulation
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 text-white fill-white" />
                  Start Simulation
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-1.5 border-l border-zinc-200 pl-3">
            <button
              onClick={handleForceClick}
              className="rounded-lg bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 text-xs font-normal text-zinc-700 hover:bg-zinc-100 transition-colors"
              title="Add 10 Clicks"
            >
              +10 Clicks
            </button>
            <button
              onClick={handleForceConversion}
              className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 text-xs font-normal text-emerald-700 hover:bg-emerald-100 transition-colors"
              title="Add 1 Conversion"
            >
              +1 Lead
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Select Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-8">
        {[
          { key: "overview", label: "Analytics Overview", icon: TrendingUp },
          { key: "links", label: "Smart Link Creator", icon: LinkIcon },
          { key: "payouts", label: "Payouts & Wallet", icon: CreditCard },
          { key: "support", label: "Support Chat", icon: HelpCircle },
        ].map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2.5 rounded-xl border p-3.5 text-sm font-normal transition-all ${
                isActive
                  ? "border-blue-600 bg-blue-50/50 text-blue-700 shadow-sm"
                  : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-800"
              }`}
            >
              <TabIcon className={`h-4.5 w-4.5 ${isActive ? "text-blue-600" : "text-zinc-400"}`} />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tabs panels */}
      <div className="min-h-[400px]">
        {activeTab === "overview" && (
          <div className="space-y-8">
            
            {/* Top Cards: Financials and Countdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs relative overflow-hidden">
                <div className="absolute -top-12 -right-12 h-24 w-24 rounded-full bg-emerald-500/5 blur-xl pointer-events-none" />
                <span className="text-xs font-normal text-zinc-400 uppercase tracking-widest block">Available Balance</span>
                <span className="text-3xl font-normal text-zinc-900 block mt-2">
                  ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-emerald-600 flex items-center gap-1 mt-2.5 font-normal">
                  <CheckCircle className="h-3 w-3" />
                  Direct payout eligibility verified
                </span>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs relative overflow-hidden">
                <div className="absolute -top-12 -right-12 h-24 w-24 rounded-full bg-blue-500/5 blur-xl pointer-events-none" />
                <span className="text-xs font-normal text-zinc-400 uppercase tracking-widest block">Pending Earnings</span>
                <span className="text-3xl font-normal text-zinc-900 block mt-2">
                  ${pending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-zinc-500 flex items-center gap-1 mt-2.5 font-normal">
                  <Clock className="h-3 w-3" />
                  Currently under conversion audit
                </span>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
                <div>
                  <span className="text-xs font-normal text-blue-600 uppercase tracking-widest block">Next Automatic Payout</span>
                  <span className="text-xl font-normal text-zinc-900 block mt-2 font-mono tracking-tight">
                    {countdownText}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-400 font-normal block mt-2">
                  Payout automatically processes every Monday 00:00.
                </span>
              </div>

            </div>

            {/* Standard Dashboard stats grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Clicks", val: totalClicks, icon: MousePointerClick, color: "text-blue-600 bg-blue-50" },
                { label: "Total Revenue", val: `$${totalRevenue.toFixed(0)}`, icon: DollarSign, color: "text-emerald-700 bg-emerald-50" },
                { label: "Average EPC", val: `$${epc}`, icon: TrendingUp, color: "text-purple-700 bg-purple-50" },
                { label: "CTR Ratio", val: `${ctr}%`, icon: ShieldCheck, color: "text-amber-700 bg-amber-50" },
              ].map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <div key={idx} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-normal text-zinc-500">{stat.label}</span>
                      <span className={`p-1.5 rounded-lg ${stat.color}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                    </div>
                    <span className="text-xl font-normal text-zinc-900 block mt-2">{stat.val}</span>
                  </div>
                );
              })}
            </div>

            {/* Middle panel: Chart and traffic breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              
              {/* Custom SVG Line Chart */}
              <div className="lg:col-span-8 rounded-2xl border border-zinc-200 bg-white p-6 flex flex-col justify-between shadow-xs">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-base font-normal text-zinc-900">Live Traffic Insights</h3>
                    <p className="text-xs text-zinc-400 font-normal">Hourly performance tracking</p>
                  </div>
                  <span className="text-[10px] bg-blue-50 border border-blue-200 text-blue-600 font-normal px-2 py-0.5 rounded">
                    Clicks Visualizer
                  </span>
                </div>
                <AnalyticsChart data={chartData} type="clicks" />
              </div>

              {/* Traffic sources share logs */}
              <div className="lg:col-span-4 rounded-2xl border border-zinc-200 bg-white p-6 flex flex-col justify-between shadow-xs">
                <div>
                  <h3 className="text-base font-normal text-zinc-900 mb-4">Traffic Channels</h3>
                  <div className="space-y-4">
                    {[
                      { name: "Telegram", share: "55%", clicks: Math.round(totalClicks * 0.55), fill: "bg-blue-600", iconPath: "/telegram-logo.png" },
                      { name: "WhatsApp", share: "20%", clicks: Math.round(totalClicks * 0.20), fill: "bg-emerald-600", iconPath: "/whatsapp-logo.png" },
                      { name: "Facebook", share: "10%", clicks: Math.round(totalClicks * 0.10), fill: "bg-purple-600", iconPath: "/facebook-logo.png" },
                      { name: "YouTube", share: "8%", clicks: Math.round(totalClicks * 0.08), fill: "bg-red-650", iconPath: "/youtube-logo.png" },
                      { name: "Twitter", share: "5%", clicks: Math.round(totalClicks * 0.05), fill: "bg-zinc-800", iconPath: "/twitter-logo.png" },
                      { name: "Other", share: "2%", clicks: Math.round(totalClicks * 0.02), fill: "bg-zinc-400" },
                    ].map((ch, i) => (
                      <div key={i} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-normal">
                          <span className="text-zinc-700 flex items-center gap-1.5">
                            {ch.iconPath && (
                              <img src={ch.iconPath} alt={ch.name} className="h-4 w-4 object-contain rounded-full border border-zinc-200/50 bg-white" />
                            )}
                            {ch.name}
                          </span>
                          <span className="text-zinc-400">{ch.clicks} clicks ({ch.share})</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                          <div className={`h-full ${ch.fill}`} style={{ width: ch.share }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-100 text-xs text-zinc-400 font-normal leading-normal">
                  ⚠️ Traffic is automatically routed to active CPC campaigns for high optimization.
                </div>
              </div>

            </div>

          </div>
        )}

        {activeTab === "links" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Link builder form */}
            <div className="lg:col-span-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs relative overflow-hidden">
              <div className="absolute -bottom-16 -left-16 h-36 w-36 bg-blue-500/5 blur-2xl pointer-events-none" />
              
              <div className="flex items-center gap-2 mb-6">
                <PlusCircle className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-normal text-zinc-900">Generate Custom Smart Link</h3>
              </div>

              <form onSubmit={handleCreateLink} className="space-y-4 relative z-10">
                <div className="space-y-1.5">
                  <label className="text-xs font-normal text-zinc-500">Campaign Name / Identifier</label>
                  <input
                    type="text"
                    required
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="e.g., Summer Gadgets Offer"
                    className="shadcn-input text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-normal text-zinc-500">Target Traffic Source</label>
                  <select
                    value={trafficSource}
                    onChange={(e) => setTrafficSource(e.target.value)}
                    className="shadcn-select text-xs"
                  >
                    <option value="telegram">Telegram Feed Channel</option>
                    <option value="whatsapp">WhatsApp Group broadcast</option>
                    <option value="facebook">Facebook Pages & Posts</option>
                    <option value="youtube">YouTube description & comment</option>
                    <option value="instagram">Instagram link bio status</option>
                    <option value="twitter">X (Twitter)</option>
                    <option value="other">Other approved source</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-normal text-zinc-500">Default Redirect Route (Ads2Pub Smart Route)</label>
                  <input
                    type="text"
                    disabled
                    value={redirectUrl}
                    className="w-full rounded-xl border border-zinc-100 bg-zinc-50 py-2.5 px-3.5 text-xs text-zinc-400 select-none cursor-not-allowed font-normal"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 rounded-xl bg-blue-600 hover:bg-blue-700 py-3 text-xs font-normal text-white shadow-sm transition-all"
                >
                  Create Smart Link URL
                </button>
              </form>
            </div>

            {/* Active Links Grid List */}
            <div className="lg:col-span-7 rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs overflow-hidden">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-base font-normal text-zinc-900">Active Link Campaigns</h3>
                  <p className="text-xs text-zinc-400 font-normal">Track and copy generated URLs</p>
                </div>
                <span className="text-xs text-zinc-500 font-normal">{links.length} Active URLs</span>
              </div>

              <div className="space-y-3 overflow-y-auto max-h-[360px] pr-1">
                {links.map((link) => (
                  <div
                    key={link.id}
                    className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 hover:border-zinc-300 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-normal text-zinc-900">{link.name}</span>
                          <span className="text-[10px] uppercase font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 flex items-center gap-1.5">
                            {link.source === "telegram" && <img src="/telegram-logo.png" className="h-3.5 w-3.5 object-contain rounded-full" />}
                            {link.source === "whatsapp" && <img src="/whatsapp-logo.png" className="h-3.5 w-3.5 object-contain rounded-full" />}
                            {link.source === "facebook" && <img src="/facebook-logo.png" className="h-3.5 w-3.5 object-contain rounded-full" />}
                            {link.source === "instagram" && <img src="/instagram-logo.png" className="h-3.5 w-3.5 object-contain rounded-full" />}
                            {link.source === "youtube" && <img src="/youtube-logo.png" className="h-3.5 w-3.5 object-contain rounded-full" />}
                            {link.source === "twitter" && <img src="/twitter-logo.png" className="h-3.5 w-3.5 object-contain rounded-full" />}
                            {link.source}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-400 font-normal font-mono block mt-1">{link.url}</span>
                      </div>

                      {/* Copy Action */}
                      <button
                        onClick={() => copyToClipboard(link.url, link.id)}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-normal transition-all border shrink-0 ${
                          copySuccess === link.id
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : "bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-700"
                        }`}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {copySuccess === link.id ? "Copied!" : "Copy URL"}
                      </button>
                    </div>

                    {/* Mini statistics values inside link row */}
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-zinc-200 text-center">
                      <div>
                        <span className="text-[9px] text-zinc-400 font-normal block uppercase">Clicks</span>
                        <span className="text-xs font-normal text-zinc-900">{link.clicks}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-400 font-normal block uppercase">Leads</span>
                        <span className="text-xs font-normal text-emerald-600">{link.conversions}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-400 font-normal block uppercase">Revenue</span>
                        <span className="text-xs font-normal text-zinc-900">${link.revenue.toFixed(0)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {activeTab === "payouts" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Configure Method details */}
            <div className="lg:col-span-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs relative overflow-hidden">
              <div className="absolute -top-16 -right-16 h-36 w-36 bg-emerald-500/5 blur-2xl pointer-events-none" />

              <div className="flex items-center gap-2 mb-6">
                <CreditCard className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-normal text-zinc-900">Configure Payout Address</h3>
              </div>

              {isAddressSaved ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                  <CheckCircle className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                  <h4 className="text-xs font-normal text-zinc-900">Payment Method Secured</h4>
                  <p className="text-[11px] text-zinc-500 font-normal mt-1">
                    Your payout setup is live. Payouts will process directly to:
                  </p>
                  <span className="block mt-2 bg-white border border-emerald-100 px-3 py-1.5 rounded-lg text-xs font-mono font-normal text-emerald-700 truncate max-w-full">
                    {payoutAddress}
                  </span>
                  <button
                    onClick={() => setIsAddressSaved(false)}
                    className="mt-4 text-[10px] text-blue-600 hover:underline font-normal"
                  >
                    Edit Details
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (payoutAddress.trim()) setIsAddressSaved(true);
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <label className="text-xs font-normal text-zinc-500">Payment Gateway</label>
                    <select
                      value={payoutMethod}
                      onChange={(e) => setPayoutMethod(e.target.value)}
                      className="shadcn-select text-xs"
                    >
                      <option value="usdt">USDT Wallet (TRC20)</option>
                      <option value="binance">Binance Pay ID</option>
                      <option value="paypal">PayPal Address (Email)</option>
                      <option value="bank">Bank Account details</option>
                      <option value="wise">Wise transfer ID</option>
                      <option value="skrill">Skrill E-wallet ID</option>
                      <option value="payoneer">Payoneer Account ID</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-normal text-zinc-500">
                      {payoutMethod === "usdt" && "USDT TRC20 Deposit Address"}
                      {payoutMethod === "binance" && "Binance Pay ID / Register Email"}
                      {payoutMethod === "paypal" && "PayPal Registered Email"}
                      {payoutMethod === "bank" && "Account No + IFSC / IBAN Code"}
                      {payoutMethod === "wise" && "Wise Registered Email ID"}
                      {payoutMethod === "skrill" && "Skrill registered email address"}
                      {payoutMethod === "payoneer" && "Payoneer payment email"}
                    </label>
                    <input
                      type="text"
                      required
                      value={payoutAddress}
                      onChange={(e) => setPayoutAddress(e.target.value)}
                      placeholder={
                        payoutMethod === "usdt" ? "e.g., TXy1GZq8W4mZ..." : "e.g., payment@domain.com"
                      }
                      className="shadcn-input text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-2 rounded-xl bg-blue-600 hover:bg-blue-700 py-3 text-xs font-normal text-white shadow-sm transition-all"
                  >
                    Save & Lock Details
                  </button>
                </form>
              )}
            </div>

            {/* Right Column: Payout History records */}
            <div className="lg:col-span-7 rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs">
              <h3 className="text-base font-normal text-zinc-900 mb-4">Payout Transaction History</h3>
              <div className="space-y-2">
                {payoutHistory.map((historyItem, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-white border border-zinc-200 flex items-center justify-center text-xs font-normal text-emerald-600">
                        $
                      </div>
                      <div>
                        <h4 className="text-xs font-normal text-zinc-900">${historyItem.amount.toFixed(2)}</h4>
                        <p className="text-[9px] text-zinc-400 font-normal mt-0.5">Paid via {historyItem.method} on {historyItem.date}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-normal text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {historyItem.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {activeTab === "support" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left FAQ grid layout */}
            <div className="lg:col-span-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs">
              <h3 className="text-base font-normal text-zinc-900 mb-4">Quick Publisher FAQ</h3>
              <div className="space-y-4">
                {[
                  { q: "Minimum threshold balance?", a: "Minimum withdrawal balance threshold is $10. Lower balances remain saved inside account until cleared." },
                  { q: "What is CTR & EPC metric?", a: "CTR represents Click-through-rate percentage of click counts. EPC represents average earnings generated from a single visitor redirect." },
                  { q: "Approved traffic lists details?", a: "Traffic lists such as WhatsApp statuses, Telegram groups, Facebook wall posts, and organic media views are auto-approved." },
                ].map((faq, i) => (
                  <div key={i} className="space-y-1">
                    <span className="text-xs font-normal text-zinc-900 block">{faq.q}</span>
                    <span className="text-xs text-zinc-500 font-normal leading-normal block">{faq.a}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Interactive Chat Box */}
            <div className="lg:col-span-7 rounded-2xl border border-zinc-200 bg-white p-6 flex flex-col h-[400px] justify-between shadow-xs">
              
              {/* Chat messages viewport */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-xl p-3 text-xs leading-normal font-normal ${
                        msg.sender === "user"
                          ? "bg-blue-600 text-white"
                          : "bg-zinc-50 text-zinc-800 border border-zinc-200"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat Input form */}
              <form onSubmit={handleSendChat} className="mt-4 pt-3 border-t border-zinc-100 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask a question about your payouts or campaigns..."
                  className="shadcn-input text-xs"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 transition-colors shadow-sm"
                >
                  <Send className="h-4.5 w-4.5 text-white" />
                </button>
              </form>

            </div>

          </div>
        )}
      </div>

    </div>
  );
}
