import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { RefreshCw, Bookmark, CheckCircle, ExternalLink, Trash2, Eye, EyeOff, MapPin, Tag, Clock, Zap, TrendingUp, Users, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Lead {
  id: number;
  title: string;
  description: string;
  url: string;
  city: string;
  cityLabel: string;
  category: string;
  keywords: string;
  postedAt: string;
  fetchedAt: string;
  isRead: boolean;
  isSaved: boolean;
  isContacted: boolean;
  score: number;
}

interface Stats {
  total: number;
  unread: number;
  saved: number;
  contacted: number;
  byCity: Record<string, number>;
  lastFetched: string | null;
  isFetching: boolean;
  newLastFetch: number;
  newToday: number;
  cities: { id: string; label: string }[];
}

const STATUS_FILTERS = [
  { value: "all", label: "All Leads" },
  { value: "unread", label: "Unread" },
  { value: "saved", label: "Saved" },
  { value: "contacted", label: "Contacted" },
];

const KEYWORD_COLORS: Record<string, string> = {
  "website": "border-green-500 text-green-400",
  "web design": "border-blue-500 text-blue-400",
  "web site": "border-green-500 text-green-400",
  "fix my site": "border-orange-500 text-orange-400",
  "broken site": "border-red-500 text-red-400",
  "redesign": "border-purple-500 text-purple-400",
  "landing page": "border-yellow-500 text-yellow-400",
  "ecommerce": "border-cyan-500 text-cyan-400",
  "e-commerce": "border-cyan-500 text-cyan-400",
  "seo": "border-pink-500 text-pink-400",
  "logo": "border-indigo-500 text-indigo-400",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function LeadCard({ lead, onUpdate, onDelete }: {
  lead: Lead;
  onUpdate: (id: number, updates: Partial<Lead>) => void;
  onDelete: (id: number) => void;
}) {
  const keywords: string[] = JSON.parse(lead.keywords || "[]");

  const scoreColor = lead.score >= 8
    ? "bg-green-500/20 border-green-500 text-green-400"
    : lead.score >= 5
    ? "bg-yellow-500/20 border-yellow-500 text-yellow-400"
    : "bg-zinc-700/40 border-zinc-600 text-zinc-500";

  const scoreLabel = lead.score >= 8 ? "HOT" : lead.score >= 5 ? "WARM" : "COLD";

  return (
    <div
      className={`lead-card rounded-lg border p-4 mb-3 ${lead.isRead ? "border-zinc-800 bg-zinc-900/40" : "border-zinc-700 bg-zinc-900/80"}`}
      data-testid={`card-lead-${lead.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-2 mb-1">
            {!lead.isRead && (
              <span className="w-2 h-2 rounded-full bg-green-400 pulse-neon flex-shrink-0" />
            )}
            <span
              className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded border flex-shrink-0 ${scoreColor}`}
              title={`Lead score: ${lead.score}/10`}
            >
              {lead.score} {scoreLabel}
            </span>
            <a
              href={lead.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`font-semibold text-sm leading-tight hover:text-green-400 transition-colors line-clamp-2 ${lead.isRead ? "text-zinc-400" : "text-zinc-100"}`}
              data-testid={`link-lead-${lead.id}`}
              onClick={() => !lead.isRead && onUpdate(lead.id, { isRead: true })}
            >
              {lead.title}
            </a>
          </div>

          {/* Description */}
          {lead.description && (
            <p className="text-xs text-zinc-500 mb-2 line-clamp-2">{lead.description}</p>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 mb-2">
            <span className="flex items-center gap-1">
              <MapPin size={11} />
              {lead.cityLabel}
            </span>
            <span className="flex items-center gap-1">
              <Tag size={11} />
              {lead.category}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {timeAgo(lead.postedAt)}
            </span>
          </div>

          {/* Keyword chips */}
          <div className="flex flex-wrap gap-1">
            {keywords.map((kw) => (
              <span
                key={kw}
                className={`text-xs px-2 py-0.5 rounded-full border bg-transparent font-mono ${KEYWORD_COLORS[kw] || "border-zinc-600 text-zinc-400"}`}
              >
                {kw}
              </span>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1 flex-shrink-0">
          <a
            href={lead.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-green-400 transition-colors"
            title="Open post"
            data-testid={`btn-open-${lead.id}`}
          >
            <ExternalLink size={14} />
          </a>
          <button
            className={`p-1.5 rounded hover:bg-zinc-800 transition-colors ${lead.isSaved ? "text-yellow-400" : "text-zinc-500 hover:text-yellow-400"}`}
            title={lead.isSaved ? "Unsave" : "Save lead"}
            onClick={() => onUpdate(lead.id, { isSaved: !lead.isSaved })}
            data-testid={`btn-save-${lead.id}`}
          >
            <Bookmark size={14} />
          </button>
          <button
            className={`p-1.5 rounded hover:bg-zinc-800 transition-colors ${lead.isContacted ? "text-green-400" : "text-zinc-500 hover:text-green-400"}`}
            title={lead.isContacted ? "Mark uncontacted" : "Mark contacted"}
            onClick={() => onUpdate(lead.id, { isContacted: !lead.isContacted })}
            data-testid={`btn-contact-${lead.id}`}
          >
            <CheckCircle size={14} />
          </button>
          <button
            className={`p-1.5 rounded hover:bg-zinc-800 transition-colors ${lead.isRead ? "text-zinc-600 hover:text-zinc-400" : "text-zinc-500 hover:text-zinc-300"}`}
            title={lead.isRead ? "Mark unread" : "Mark read"}
            onClick={() => onUpdate(lead.id, { isRead: !lead.isRead })}
            data-testid={`btn-read-${lead.id}`}
          >
            {lead.isRead ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-600 hover:text-red-400 transition-colors"
            title="Delete"
            onClick={() => onDelete(lead.id)}
            data-testid={`btn-delete-${lead.id}`}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { toast } = useToast();
  const [cityFilter, setCityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const LIMIT = 30;

  // Auto-refresh every 60s
  const { data: stats, refetch: refetchStats } = useQuery<Stats>({
    queryKey: ["/api/stats"],
    refetchInterval: 60000,
  });

  const { data: leadsData, isLoading } = useQuery<{ leads: Lead[]; total: number }>({
    queryKey: ["/api/leads", cityFilter, statusFilter, keyword, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        city: cityFilter,
        status: statusFilter,
        keyword,
        page: String(page),
        limit: String(LIMIT),
      });
      const res = await apiRequest("GET", `/api/leads?${params}`);
      return res.json();
    },
    refetchInterval: 60000,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Lead> }) => {
      const res = await apiRequest("PATCH", `/api/leads/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/leads/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });

  const fetchMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/fetch");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.status === "already_running") {
        toast({ title: "Already scanning feeds...", description: "Hang tight." });
      } else {
        toast({ title: "Feed scan started", description: "New leads will appear shortly." });
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
          queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
        }, 8000);
      }
    },
  });

  const handleUpdate = useCallback((id: number, updates: Partial<Lead>) => {
    updateMutation.mutate({ id, updates });
  }, []);

  const handleDelete = useCallback((id: number) => {
    deleteMutation.mutate(id);
  }, []);

  const leads = leadsData?.leads || [];
  const total = leadsData?.total || 0;
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="flex h-screen overflow-hidden bg-[#080808]">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-zinc-800 flex flex-col overflow-y-auto">
        {/* Logo */}
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-label="COAI Logo">
              <rect width="28" height="28" rx="6" fill="#00e600" fillOpacity="0.12" />
              <path d="M14 4L24 9V19L14 24L4 19V9L14 4Z" stroke="#00e600" strokeWidth="1.5" fill="none" />
              <circle cx="14" cy="14" r="3" fill="#00e600" />
              <line x1="14" y1="11" x2="14" y2="4" stroke="#00e600" strokeWidth="1" />
              <line x1="14" y1="17" x2="14" y2="24" stroke="#00e600" strokeWidth="1" />
              <line x1="11.4" y1="12.5" x2="5.2" y2="9" stroke="#00e600" strokeWidth="1" />
              <line x1="16.6" y1="15.5" x2="22.8" y2="19" stroke="#00e600" strokeWidth="1" />
            </svg>
            <div>
              <div className="text-xs font-bold neon-text font-mono tracking-widest">COAI</div>
              <div className="text-xs text-zinc-500 leading-none">Lead Monitor</div>
            </div>
          </div>
        </div>

        {/* Live indicator */}
        <div className="px-4 py-2 border-b border-zinc-800 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 pulse-neon" />
          <span className="text-xs text-zinc-400">
            {stats?.isFetching ? "Scanning..." : "Live Feed"}
          </span>
        </div>

        {/* Stats */}
        <div className="p-3 space-y-2 border-b border-zinc-800">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Total", value: stats?.total || 0, icon: TrendingUp, color: "text-zinc-300" },
              { label: "Unread", value: stats?.unread || 0, icon: AlertCircle, color: "text-green-400" },
              { label: "Saved", value: stats?.saved || 0, icon: Bookmark, color: "text-yellow-400" },
              { label: "Contacted", value: stats?.contacted || 0, icon: CheckCircle, color: "text-blue-400" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-zinc-900 rounded p-2">
                <div className={`text-lg font-bold font-mono ${color}`}>{value}</div>
                <div className="text-xs text-zinc-600">{label}</div>
              </div>
            ))}
          </div>
          {stats?.newToday !== undefined && (
            <div className="text-xs text-zinc-500 text-center">
              <span className="text-green-400 font-mono">{stats.newToday}</span> new today
            </div>
          )}
        </div>

        {/* Status filter */}
        <div className="p-3 border-b border-zinc-800">
          <div className="text-xs text-zinc-600 uppercase tracking-wider mb-2">Filter</div>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setStatusFilter(f.value); setPage(1); }}
              className={`w-full text-left px-2 py-1.5 rounded text-xs mb-0.5 transition-colors ${statusFilter === f.value ? "bg-green-900/30 text-green-400 neon-border border" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"}`}
              data-testid={`filter-status-${f.value}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* City filter */}
        <div className="p-3 flex-1">
          <div className="text-xs text-zinc-600 uppercase tracking-wider mb-2">Cities</div>
          <button
            onClick={() => { setCityFilter("all"); setPage(1); }}
            className={`w-full text-left px-2 py-1.5 rounded text-xs mb-0.5 transition-colors ${cityFilter === "all" ? "bg-green-900/30 text-green-400" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"}`}
            data-testid="filter-city-all"
          >
            All Cities
            <span className="float-right text-zinc-600 font-mono">{stats?.total || 0}</span>
          </button>
          {stats?.cities?.map((city) => {
            const count = stats.byCity?.[city.id] || 0;
            return (
              <button
                key={city.id}
                onClick={() => { setCityFilter(city.id); setPage(1); }}
                className={`w-full text-left px-2 py-1.5 rounded text-xs mb-0.5 transition-colors flex justify-between items-center ${cityFilter === city.id ? "bg-green-900/30 text-green-400" : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"}`}
                data-testid={`filter-city-${city.id}`}
              >
                <span className="truncate pr-1">{city.label.split(",")[0]}</span>
                <span className="font-mono text-zinc-600 flex-shrink-0">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Last fetch */}
        {stats?.lastFetched && (
          <div className="p-3 border-t border-zinc-800 text-xs text-zinc-600">
            Last scan: {timeAgo(stats.lastFetched)}
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 flex-shrink-0">
          <div>
            <h1 className="text-sm font-bold text-zinc-100">
              Craigslist Web Demand Feed
            </h1>
            <p className="text-xs text-zinc-600">
              {total} leads · 20 cities · 3 categories
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Keyword search */}
            <input
              type="text"
              placeholder="Search leads..."
              value={keyword}
              onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
              className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-green-500 w-44"
              data-testid="input-search"
            />
            {/* Fetch button */}
            <button
              onClick={() => fetchMutation.mutate()}
              disabled={stats?.isFetching || fetchMutation.isPending}
              className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold bg-green-900/20 border border-green-800 text-green-400 hover:bg-green-900/40 hover:border-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="btn-scan-feeds"
            >
              <RefreshCw
                size={13}
                className={stats?.isFetching || fetchMutation.isPending ? "animate-spin" : ""}
              />
              {stats?.isFetching ? "Scanning..." : "Scan Now"}
            </button>
          </div>
        </header>

        {/* New leads banner */}
        {stats?.newLastFetch !== undefined && stats.newLastFetch > 0 && (
          <div className="mx-5 mt-3 px-3 py-2 rounded border border-green-800 bg-green-900/20 flex items-center gap-2 text-xs flex-shrink-0">
            <Zap size={13} className="text-green-400" />
            <span className="text-green-300">
              <span className="font-bold font-mono">{stats.newLastFetch}</span> new leads found last scan
            </span>
          </div>
        )}

        {/* No leads state */}
        {!isLoading && leads.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <div className="w-12 h-12 rounded-full border border-zinc-700 flex items-center justify-center mb-4">
              <Zap size={20} className="text-zinc-600" />
            </div>
            <p className="text-zinc-400 text-sm font-semibold mb-1">No leads yet</p>
            <p className="text-zinc-600 text-xs mb-4">Hit "Scan Now" to pull live feed from Craigslist across all 20 cities.</p>
            <button
              onClick={() => fetchMutation.mutate()}
              className="px-4 py-2 rounded text-xs font-semibold bg-green-900/30 border border-green-700 text-green-400 hover:bg-green-900/50 transition-colors"
            >
              Start Scanning
            </button>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-zinc-600 text-xs flex items-center gap-2">
              <RefreshCw size={14} className="animate-spin" />
              Loading leads...
            </div>
          </div>
        )}

        {/* Lead list */}
        {!isLoading && leads.length > 0 && (
          <div className="flex-1 overflow-y-auto px-5 pt-3 pb-4">
            {leads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2 pb-4">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded text-xs bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  data-testid="btn-prev-page"
                >
                  ← Prev
                </button>
                <span className="text-xs text-zinc-600 font-mono">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded text-xs bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  data-testid="btn-next-page"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

