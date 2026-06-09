"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  IndianRupee,
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
  ShieldCheck,
  Settings,
  Sparkles,
  ExternalLink,
  Plus,
  Trash2,
  Cpu
} from "lucide-react";
import AnalyticsChart from "./AnalyticsChart";
import { 
  getCampaigns, 
  saveCampaigns, 
  getLinks, 
  saveLinks, 
  getStats, 
  saveStats, 
  getPayouts, 
  savePayouts, 
  Campaign, 
  TrackingLink, 
  PayoutHistory,
  DashboardStats 
} from "@/lib/storage";

interface DashboardViewProps {
  publisherName: string;
  onLogout: () => void;
}

interface ToastNotification {
  id: number;
  message: string;
  type: "click" | "conversion";
}

export default function DashboardView({ publisherName, onLogout }: DashboardViewProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "links" | "payouts" | "admin" | "support">("overview");
  
  // Real-time Dashboard Metrics
  const [isLoaded, setIsLoaded] = useState(false);
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

  // Links & Campaigns states from LocalStorage
  const [links, setLinks] = useState<TrackingLink[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  
  // Link Creator Inputs
  const [campaignName, setCampaignName] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [trafficSource, setTrafficSource] = useState("telegram");
  
  // Admin Campaign Creator Inputs
  const [adminCampaignName, setAdminCampaignName] = useState("");
  const [adminTargetUrl, setAdminTargetUrl] = useState("");
  const [adminPayout, setAdminPayout] = useState(300.0);
  const [adminDescription, setAdminDescription] = useState("");

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
  const [payoutHistory, setPayoutHistory] = useState<PayoutHistory[]>([]);

  // Help Desk state
  const [chatMessages, setChatMessages] = useState<{ sender: "user" | "bot"; text: string }[]>([
    { sender: "bot", text: "Hello! Main Ads2Pub support bot hoon. Aap payout settings, link tracking, ya campaigns matching se related kuch bhi pooch sakte hain." },
  ]);
  const [chatInput, setChatInput] = useState("");

  // Copy success notification
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // Load data from LocalStorage
  const loadData = () => {
    const stats = getStats();
    setBalance(stats.balance);
    setPending(stats.pending);
    setTotalClicks(stats.totalClicks);
    setTotalConversions(stats.totalConversions);
    setTotalRevenue(stats.totalRevenue);

    const activeCampaigns = getCampaigns();
    setCampaigns(activeCampaigns);

    const activeLinks = getLinks();
    setLinks(activeLinks);

    setPayoutHistory(getPayouts());
  };

  useEffect(() => {
    loadData();
    setIsLoaded(true);

    const handleStorageChange = () => {
      loadData();
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Set default selectedCampaignId when campaigns load
  useEffect(() => {
    if (campaigns.length > 0 && !selectedCampaignId) {
      setSelectedCampaignId(campaigns[0].id);
    }
  }, [campaigns, selectedCampaignId]);

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
      const linksData = getLinks();
      if (linksData.length === 0) return;

      const addedClicks = Math.floor(Math.random() * 8) + 1;
      const randomLinkIdx = Math.floor(Math.random() * linksData.length);
      const targetLink = linksData[randomLinkIdx];

      targetLink.clicks += addedClicks;

      const stats = getStats();
      stats.totalClicks += addedClicks;

      const campaignList = getCampaigns();
      const campIdx = campaignList.findIndex(c => c.id === targetLink.campaignId);
      if (campIdx !== -1) {
        campaignList[campIdx].clicks += addedClicks;
      }

      let conversionOccurred = false;
      let revenueAmount = 0;

      // Determine if a conversion happened (15% conversion probability)
      if (Math.random() < 0.15) {
        conversionOccurred = true;
        const conversionsCount = Math.floor(Math.random() * 2) + 1;
        const payout = campIdx !== -1 ? campaignList[campIdx].payout : 40.0;
        revenueAmount = conversionsCount * payout;

        targetLink.conversions += conversionsCount;
        targetLink.revenue += revenueAmount;

        stats.totalConversions += conversionsCount;
        stats.totalRevenue += revenueAmount;
        stats.balance += revenueAmount;
        stats.pending += revenueAmount * 0.35;

        if (campIdx !== -1) {
          campaignList[campIdx].conversions += conversionsCount;
          campaignList[campIdx].revenue += revenueAmount;
        }

        // Show conversion alert
        const id = toastIdRef.current++;
        const msg = `Lead Verified: ${targetLink.name} got +${conversionsCount} signups (Earned ₹${revenueAmount})`;
        setToasts((prev) => [...prev.slice(-3), { id, message: msg, type: "conversion" }]);
      } else {
        // Show click alert
        const id = toastIdRef.current++;
        const msg = `Traffic: ${addedClicks} clicks routed from ${targetLink.source.toUpperCase()}`;
        setToasts((prev) => [...prev.slice(-3), { id, message: msg, type: "click" }]);
      }

      saveLinks(linksData);
      saveStats(stats);
      saveCampaigns(campaignList);

      // Refresh states locally
      setLinks(linksData);
      setCampaigns(campaignList);
      setTotalClicks(stats.totalClicks);
      setTotalConversions(stats.totalConversions);
      setTotalRevenue(stats.totalRevenue);
      setBalance(stats.balance);
      setPending(stats.pending);

      // Trigger custom storage event for sync
      window.dispatchEvent(new Event("storage"));

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
    if (!campaignName || !selectedCampaignId) return;

    const campaign = campaigns.find(c => c.id === selectedCampaignId);
    if (!campaign) return;

    const shortId = Math.random().toString(36).substring(2, 7);
    const shortCode = `${trafficSource}-${shortId}`;
    const generatedUrl = `${window.location.origin}/go/${shortCode}`;

    const newLink: TrackingLink = {
      id: `lnk-${Math.floor(Math.random() * 900) + 100}`,
      campaignId: selectedCampaignId,
      name: campaignName,
      source: trafficSource,
      clicks: 0,
      conversions: 0,
      revenue: 0,
      url: generatedUrl,
      shortCode: shortCode,
      date: new Date().toISOString().split("T")[0],
    };

    const updatedLinks = [newLink, ...links];
    setLinks(updatedLinks);
    saveLinks(updatedLinks);
    setCampaignName("");

    // Notify user
    const id = toastIdRef.current++;
    setToasts((prev) => [...prev, { id, message: `Created new smart campaign link for ${trafficSource.toUpperCase()}`, type: "click" }]);
    window.dispatchEvent(new Event("storage"));
  };

  // Helper to copy link text
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(id);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  // Send test click instantly
  const handleForceClick = () => {
    const linksData = getLinks();
    if (linksData.length === 0) return;

    const addedClicks = 10;
    const randomIdx = Math.floor(Math.random() * linksData.length);
    const targetLink = linksData[randomIdx];

    targetLink.clicks += addedClicks;

    const stats = getStats();
    stats.totalClicks += addedClicks;

    const campaignList = getCampaigns();
    const campIdx = campaignList.findIndex(c => c.id === targetLink.campaignId);
    if (campIdx !== -1) {
      campaignList[campIdx].clicks += addedClicks;
    }

    saveLinks(linksData);
    saveStats(stats);
    saveCampaigns(campaignList);
    loadData();

    const id = toastIdRef.current++;
    setToasts((prev) => [...prev.slice(-3), { id, message: `Simulated 10 fast clicks from ${targetLink.source.toUpperCase()}`, type: "click" }]);
    window.dispatchEvent(new Event("storage"));
  };

  // Send test conversion instantly
  const handleForceConversion = () => {
    const linksData = getLinks();
    if (linksData.length === 0) return;

    const randomIdx = Math.floor(Math.random() * linksData.length);
    const targetLink = linksData[randomIdx];

    const campaignList = getCampaigns();
    const campIdx = campaignList.findIndex(c => c.id === targetLink.campaignId);
    const payout = campIdx !== -1 ? campaignList[campIdx].payout : 300.0;

    targetLink.conversions += 1;
    targetLink.revenue += payout;

    const stats = getStats();
    stats.totalConversions += 1;
    stats.totalRevenue += payout;
    stats.balance += payout;

    if (campIdx !== -1) {
      campaignList[campIdx].conversions += 1;
      campaignList[campIdx].revenue += payout;
    }

    saveLinks(linksData);
    saveStats(stats);
    saveCampaigns(campaignList);
    loadData();

    const id = toastIdRef.current++;
    setToasts((prev) => [...prev.slice(-3), { id, message: `Conversion Boost: Generated 1 lead for ${targetLink.name} (₹${payout})`, type: "conversion" }]);
    window.dispatchEvent(new Event("storage"));
  };

  // Handle Admin Campaign Creation
  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminCampaignName || !adminTargetUrl) return;

    const newCampaign: Campaign = {
      id: `camp-${Math.floor(Math.random() * 900) + 100}`,
      name: adminCampaignName,
      targetUrl: adminTargetUrl,
      payout: Number(adminPayout),
      description: adminDescription || "Complete registration on target link.",
      clicks: 0,
      conversions: 0,
      revenue: 0,
      createdAt: new Date().toISOString().split("T")[0],
    };

    const updatedCampaigns = [...campaigns, newCampaign];
    setCampaigns(updatedCampaigns);
    saveCampaigns(updatedCampaigns);

    // Reset inputs
    setAdminCampaignName("");
    setAdminTargetUrl("");
    setAdminPayout(300.0);
    setAdminDescription("");

    // Set as selected campaign in creator
    setSelectedCampaignId(newCampaign.id);

    // Notify user
    const id = toastIdRef.current++;
    setToasts((prev) => [...prev, { id, message: `Admin: Added target campaign "${adminCampaignName}"`, type: "click" }]);
    window.dispatchEvent(new Event("storage"));
  };

  // Handle Admin Campaign Delete
  const handleDeleteCampaign = (id: string) => {
    const updated = campaigns.filter(c => c.id !== id);
    setCampaigns(updated);
    saveCampaigns(updated);

    const idToast = toastIdRef.current++;
    setToasts((prev) => [...prev, { id: idToast, message: "Admin: Deleted campaign", type: "click" }]);
    window.dispatchEvent(new Event("storage"));
  };

  // Calculations for computed ratios
  const ctr = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(2) : "0.00";
  const epr = totalConversions > 0 ? (totalRevenue / totalConversions).toFixed(2) : "0.00";

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
        reply = "Ads2Pub par payouts har Monday subah automatically process hote hain. Payout threshold ₹1,000 hai. Aap Payouts tab me jaakar details verify kar sakte hain.";
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-8">
        {[
          { key: "overview", label: "Analytics Overview", icon: TrendingUp },
          { key: "links", label: "Smart Link Creator", icon: LinkIcon },
          { key: "payouts", label: "Payouts & Wallet", icon: CreditCard },
          { key: "admin", label: "Admin Campaigns", icon: Settings },
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
                  ₹{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                  ₹{pending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                { label: "Total Revenue", val: `₹${totalRevenue.toFixed(0)}`, icon: IndianRupee, color: "text-emerald-700 bg-emerald-50" },
                { label: "Average EPR", val: `₹${epr}`, icon: TrendingUp, color: "text-purple-700 bg-purple-50" },
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
                  <label className="text-xs font-normal text-zinc-500">Smart Link Name / Identifier</label>
                  <input
                    type="text"
                    required
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="e.g., Samir Crypto Telegram Channel"
                    className="shadcn-input text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-normal text-zinc-500">Select Target Campaign (Offers)</label>
                  {campaigns.length === 0 ? (
                    <div className="text-xs text-rose-500 bg-rose-50 p-2.5 border border-rose-100 rounded-xl font-normal">
                      No campaigns found. Please add a campaign in the <strong>Admin Campaigns</strong> tab first.
                    </div>
                  ) : (
                    <select
                      value={selectedCampaignId}
                      onChange={(e) => setSelectedCampaignId(e.target.value)}
                      className="shadcn-select text-xs"
                    >
                      {campaigns.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} (Pays ₹{c.payout}/reg)
                        </option>
                      ))}
                    </select>
                  )}
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

                <button
                  type="submit"
                  disabled={campaigns.length === 0}
                  className="w-full mt-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-200 disabled:cursor-not-allowed py-3 text-xs font-normal text-white shadow-sm transition-all"
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

                      {/* Actions */}
                      <div className="flex gap-2 shrink-0">
                        {/* Open Test Link */}
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 px-3 py-1.5 text-xs font-normal transition-all"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Test Link
                        </a>

                        {/* Copy Action */}
                        <button
                          onClick={() => copyToClipboard(link.url, link.id)}
                          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-normal transition-all border ${
                            copySuccess === link.id
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                              : "bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-700"
                          }`}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          {copySuccess === link.id ? "Copied!" : "Copy URL"}
                        </button>
                      </div>
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
                        <span className="text-xs font-normal text-zinc-900">₹{link.revenue.toFixed(0)}</span>
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
                        ₹
                      </div>
                      <div>
                        <h4 className="text-xs font-normal text-zinc-900">₹{historyItem.amount.toFixed(0)}</h4>
                        <p className="text-[9px] text-zinc-400 font-normal mt-0.5 font-sans">Paid via {historyItem.method} on {historyItem.date}</p>
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

        {activeTab === "admin" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Create Campaign */}
            <div className="lg:col-span-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs relative overflow-hidden">
              <div className="absolute -bottom-16 -left-16 h-36 w-36 bg-blue-500/5 blur-2xl pointer-events-none" />
              
              <div className="flex items-center gap-2 mb-6">
                <PlusCircle className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-normal text-zinc-900">Add Target Campaign (Admin)</h3>
              </div>

              <form onSubmit={handleCreateCampaign} className="space-y-4 relative z-10">
                <div className="space-y-1.5">
                  <label className="text-xs font-normal text-zinc-500">Campaign Name</label>
                  <input
                    type="text"
                    required
                    value={adminCampaignName}
                    onChange={(e) => setAdminCampaignName(e.target.value)}
                    placeholder="e.g., Binance Sign-up Promo"
                    className="shadcn-input text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-normal text-zinc-500">Main Target Registration Link</label>
                  <input
                    type="url"
                    required
                    value={adminTargetUrl}
                    onChange={(e) => setAdminTargetUrl(e.target.value)}
                    placeholder="https://example.com/register?ref=samir"
                    className="shadcn-input text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-normal text-zinc-500">Payout per Registration (INR ₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={adminPayout}
                    onChange={(e) => setAdminPayout(Number(e.target.value))}
                    placeholder="e.g., 300.00"
                    className="shadcn-input text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-normal text-zinc-500">Requirement Description</label>
                  <textarea
                    rows={3}
                    value={adminDescription}
                    onChange={(e) => setAdminDescription(e.target.value)}
                    placeholder="Explain what the visitor must do, e.g., register with phone number and verify KYC to credit the referral."
                    className="shadcn-input text-xs"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 rounded-xl bg-blue-600 hover:bg-blue-700 py-3 text-xs font-normal text-white shadow-sm transition-all"
                >
                  Create Target Campaign
                </button>
              </form>
            </div>

            {/* Right Column: Campaigns List & Webhook Docs */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Campaigns list */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-base font-normal text-zinc-900">Offered Target Campaigns</h3>
                    <p className="text-xs text-zinc-400 font-normal">Active registration campaigns publishers can promote</p>
                  </div>
                  <span className="text-xs text-zinc-500 font-normal">{campaigns.length} Campaigns</span>
                </div>

                <div className="space-y-3 overflow-y-auto max-h-[300px] pr-1">
                  {campaigns.length === 0 ? (
                    <div className="text-center py-8 text-xs text-zinc-400 font-normal">
                      No campaigns active. Add one using the form.
                    </div>
                  ) : (
                    campaigns.map((camp) => (
                      <div
                        key={camp.id}
                        className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 hover:border-zinc-300 transition-colors"
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <h4 className="text-xs font-normal text-zinc-900">{camp.name}</h4>
                            <p className="text-[10px] text-zinc-400 font-normal mt-0.5 truncate max-w-md">
                              Link: {camp.targetUrl}
                            </p>
                            <span className="inline-block text-[9px] bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full mt-2 font-normal">
                              Payout: ₹{camp.payout.toFixed(0)} per Register
                            </span>
                          </div>

                          <button
                            onClick={() => handleDeleteCampaign(camp.id)}
                            className="text-zinc-400 hover:text-rose-600 p-1 rounded transition-colors"
                            title="Delete Campaign"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* mini stats */}
                        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-zinc-200 text-center">
                          <div>
                            <span className="text-[9px] text-zinc-400 font-normal block uppercase">Clicks</span>
                            <span className="text-xs font-normal text-zinc-900">{camp.clicks || 0}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-zinc-400 font-normal block uppercase">Registrations</span>
                            <span className="text-xs font-normal text-emerald-600">{camp.conversions || 0}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-zinc-400 font-normal block uppercase">Total Spent</span>
                            <span className="text-xs font-normal text-zinc-900">₹{(camp.revenue || 0).toFixed(0)}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Developer Integration Docs */}
              <div className="rounded-2xl border border-zinc-200 bg-zinc-950 p-6 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 h-32 w-32 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex items-center gap-2 mb-4">
                  <Cpu className="h-4 w-4 text-blue-400 animate-pulse" />
                  <span className="text-xs font-normal uppercase tracking-widest text-zinc-400">
                    S2S Webhook / Postback Integration (Developers)
                  </span>
                </div>

                <h3 className="text-sm font-normal text-white mb-2">How Real Tracking Works</h3>
                <p className="text-xs text-zinc-400 leading-relaxed mb-4 font-normal">
                  In production, when a visitor clicks a publisher's link, they are redirected to your target link with a unique <code>click_id</code> sub-parameter.
                  Once they complete their registration on your external site, your server calls our S2S postback webhook to confirm:
                </p>

                <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800 font-mono text-[10px] text-emerald-400 overflow-x-auto whitespace-pre-wrap select-all">
                  GET {typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/api/postback?click_id=UNIQUE_CLICK_ID&payout_VAL
                </div>

                <div className="mt-4 flex items-center gap-2 text-[10px] text-zinc-500 font-normal">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Postback listener is active & simulated in the bridge test sandbox.</span>
                </div>
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
                  { q: "Minimum threshold balance?", a: "Minimum withdrawal balance threshold is ₹1,000. Lower balances remain saved inside account until cleared." },
                  { q: "What is CTR & EPR metric?", a: "CTR represents Click-through-rate percentage of click counts. EPR represents average earnings generated from a successful registration." },
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
