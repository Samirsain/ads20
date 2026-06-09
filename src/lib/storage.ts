"use client";

export interface Campaign {
  id: string;
  name: string;
  targetUrl: string;
  payout: number; // Payout per registration (INR)
  description: string;
  clicks: number;
  conversions: number;
  revenue: number;
  createdAt: string;
}

export interface TrackingLink {
  id: string;
  campaignId: string;
  name: string;
  source: string;
  clicks: number;
  conversions: number;
  revenue: number;
  url: string;
  shortCode: string;
  date: string;
}

export interface PayoutHistory {
  date: string;
  amount: number;
  method: string;
  status: string;
}

export interface DashboardStats {
  balance: number;
  pending: number;
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
}

const DEFAULT_CAMPAIGNS: Campaign[] = [
  {
    id: "camp-1",
    name: "Binance Premium SignUp Offer",
    targetUrl: "https://www.binance.com/en/activity/referral-entry",
    payout: 350.0, // ₹350 per user registration
    description: "User must sign up via your link and complete KYC verification.",
    clicks: 450,
    conversions: 28,
    revenue: 9800.0,
    createdAt: "2026-06-01",
  },
  {
    id: "camp-2",
    name: "Telegram Crypto Signal Channel",
    targetUrl: "https://telegram.org",
    payout: 300.0, // ₹300 per user channel join & register
    description: "User must click join, verify phone number, and open the start pin message.",
    clicks: 280,
    conversions: 18,
    revenue: 5400.0,
    createdAt: "2026-06-02",
  },
  {
    id: "camp-3",
    name: "Facebook Reels Creator Booster",
    targetUrl: "https://www.facebook.com/creators",
    payout: 250.0, // ₹250 per sign up
    description: "User must register on the Facebook reels monetizer panel.",
    clicks: 110,
    conversions: 6,
    revenue: 1500.0,
    createdAt: "2026-06-03",
  },
];

const DEFAULT_LINKS: TrackingLink[] = [
  {
    id: "lnk-102",
    campaignId: "camp-1",
    name: "Telegram Crypto Campaign",
    source: "telegram",
    clicks: 450,
    conversions: 28,
    revenue: 9800.0,
    shortCode: "tg-crypto-samir",
    url: "https://a2p.cc/tg-crypto-samir", // will be updated dynamically to localhost in client
    date: "2026-06-05",
  },
  {
    id: "lnk-103",
    campaignId: "camp-2",
    name: "WhatsApp Status Offer",
    source: "whatsapp",
    clicks: 280,
    conversions: 18,
    revenue: 5400.0,
    shortCode: "wa-status-samir",
    url: "https://a2p.cc/wa-status-samir",
    date: "2026-06-06",
  },
  {
    id: "lnk-104",
    campaignId: "camp-3",
    name: "Facebook Reel Promo",
    source: "facebook",
    clicks: 110,
    conversions: 6,
    revenue: 1500.0,
    shortCode: "fb-reel-samir",
    url: "https://a2p.cc/fb-reel-samir",
    date: "2026-06-07",
  },
];

const DEFAULT_STATS: DashboardStats = {
  balance: 24500.0,
  pending: 8900.0,
  totalClicks: 840,
  totalConversions: 52,
  totalRevenue: 16700.0,
};

const DEFAULT_PAYOUTS: PayoutHistory[] = [
  { date: "2026-06-01", amount: 18200.0, method: "IMPS Transfer", status: "Completed" },
  { date: "2026-05-25", amount: 15400.0, method: "UPI Pay", status: "Completed" },
];

export function getCampaigns(): Campaign[] {
  if (typeof window === "undefined") return DEFAULT_CAMPAIGNS;
  const stored = localStorage.getItem("ads2pub_campaigns");
  if (!stored) {
    localStorage.setItem("ads2pub_campaigns", JSON.stringify(DEFAULT_CAMPAIGNS));
    return DEFAULT_CAMPAIGNS;
  }
  return JSON.parse(stored);
}

export function saveCampaigns(campaigns: Campaign[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("ads2pub_campaigns", JSON.stringify(campaigns));
}

export function getLinks(): TrackingLink[] {
  if (typeof window === "undefined") return DEFAULT_LINKS;
  const stored = localStorage.getItem("ads2pub_links");
  if (!stored) {
    localStorage.setItem("ads2pub_links", JSON.stringify(DEFAULT_LINKS));
    return DEFAULT_LINKS;
  }
  return JSON.parse(stored);
}

export function saveLinks(links: TrackingLink[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("ads2pub_links", JSON.stringify(links));
}

export function getStats(): DashboardStats {
  if (typeof window === "undefined") return DEFAULT_STATS;
  const stored = localStorage.getItem("ads2pub_stats");
  if (!stored) {
    localStorage.setItem("ads2pub_stats", JSON.stringify(DEFAULT_STATS));
    return DEFAULT_STATS;
  }
  return JSON.parse(stored);
}

export function saveStats(stats: DashboardStats) {
  if (typeof window === "undefined") return;
  localStorage.setItem("ads2pub_stats", JSON.stringify(stats));
}

export function getPayouts(): PayoutHistory[] {
  if (typeof window === "undefined") return DEFAULT_PAYOUTS;
  const stored = localStorage.getItem("ads2pub_payouts");
  if (!stored) {
    localStorage.setItem("ads2pub_payouts", JSON.stringify(DEFAULT_PAYOUTS));
    return DEFAULT_PAYOUTS;
  }
  return JSON.parse(stored);
}

export function savePayouts(payouts: PayoutHistory[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("ads2pub_payouts", JSON.stringify(payouts));
}

export function recordClick(shortCode: string): TrackingLink | null {
  if (typeof window === "undefined") return null;
  const links = getLinks();
  const index = links.findIndex(l => l.shortCode === shortCode);
  if (index === -1) return null;

  links[index].clicks += 1;
  saveLinks(links);

  // Update global stats
  const stats = getStats();
  stats.totalClicks += 1;
  saveStats(stats);

  // Also update campaign clicks
  const campaigns = getCampaigns();
  const campIdx = campaigns.findIndex(c => c.id === links[index].campaignId);
  if (campIdx !== -1) {
    campaigns[campIdx].clicks += 1;
    saveCampaigns(campaigns);
  }

  // Trigger custom storage event for live reloading
  window.dispatchEvent(new Event("storage"));
  return links[index];
}

export function recordConversion(shortCode: string): { link: TrackingLink, payout: number } | null {
  if (typeof window === "undefined") return null;
  const links = getLinks();
  const index = links.findIndex(l => l.shortCode === shortCode);
  if (index === -1) return null;

  // Get campaign payout
  const campaigns = getCampaigns();
  const campaign = campaigns.find(c => c.id === links[index].campaignId);
  const payout = campaign ? campaign.payout : 300.0;

  links[index].conversions += 1;
  links[index].revenue += payout;
  saveLinks(links);

  // Update global stats
  const stats = getStats();
  stats.totalConversions += 1;
  stats.totalRevenue += payout;
  stats.balance += payout;
  stats.pending += payout * 0.35; // 35% buffer
  saveStats(stats);

  // Update campaign conversions & revenue
  if (campaign) {
    const campIdx = campaigns.findIndex(c => c.id === campaign.id);
    if (campIdx !== -1) {
      campaigns[campIdx].conversions += 1;
      campaigns[campIdx].revenue += payout;
      saveCampaigns(campaigns);
    }
  }

  // Trigger custom storage event for live reloading
  window.dispatchEvent(new Event("storage"));
  return { link: links[index], payout };
}
