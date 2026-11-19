import { createContext, useContext, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Sparkles,
  History,
  Database,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowUpRight,
  HelpCircle,
  ChevronDown,
  Menu,
  X,
  FlaskConical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Analysis } from "./data";
type Health = {
  state: "unchecked" | "checking" | "online" | "error";
  raw?: unknown;
  checkedAt?: string;
  error?: string;
};
type WorkspaceState = {
  analyses: Analysis[];
  add: (a: Analysis) => void;
  baseUrl: string;
  setBaseUrl: (s: string) => void;
  demo: boolean;
  setDemo: (b: boolean) => void;
  health: Health;
  setHealth: (h: Health) => void;
};
const Context = createContext<WorkspaceState | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [baseUrl, setBaseUrl] = useState(import.meta.env["VITE_SUTRAI_API_BASE_URL"] ?? "");
  const [demo, setDemo] = useState(true);
  const [health, setHealth] = useState<Health>({ state: "unchecked" });
  return (
    <Context.Provider
      value={{
        analyses,
        add: (a) => setAnalyses((prev) => [a, ...prev]),
        baseUrl,
        setBaseUrl,
        demo,
        setDemo,
        health,
        setHealth,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useWorkspace() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("Workspace context missing");
  return ctx;
}
const links = [
  { to: "/" as const, label: "Overview", icon: LayoutDashboard },
  { to: "/ask" as const, label: "Ask SutrAI", icon: Sparkles },
  { to: "/history" as const, label: "Analysis history", icon: History },
  { to: "/status" as const, label: "Data sources", icon: Database },
];
export function Workspace({ children, section }: { children: ReactNode; section: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const { demo, health } = useWorkspace();
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className={`workspace ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
        <Link to="/" className="brand">
          <span className="brand-mark">
            <Sparkles size={21} />
          </span>
          <span className="brand-name">
            Sutr<span>AI</span>
            <span className="brand-period">.</span>
          </span>
        </Link>
        <div className="workspace-picker">
          <span className="workspace-avatar">S</span>
          <div>
            <strong>Commerce workspace</strong>
            <small>Demo environment</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <div className="nav-caption">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {links.map((l) => (
            <Button
              key={l.to}
              variant="ghost"
              asChild
              className={`nav-link ${path === l.to ? "active" : ""}`}
              title={l.label}
            >
              <Link to={l.to} onClick={() => setMobile(false)}>
                <l.icon size={18} />
                <span>{l.label}</span>
                {l.to === "/ask" && <span className="nav-new">AI</span>}
              </Link>
            </Button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="demo-note">
            <FlaskConical size={18} />
            <strong>A little curiosity. A lot of clarity.</strong>
            <p>Better decisions start with better questions.</p>
            <Button variant="outline" asChild>
              <Link to="/ask">
                Ask your first question <ArrowUpRight />
              </Link>
            </Button>
          </div>
          <Button variant="ghost" asChild className="sidebar-help">
            <Link to="/status">
              <HelpCircle />
              <span>System status</span>
              <span className={`status-dot ${health.state === "online" ? "online" : ""}`} />
            </Link>
          </Button>
          <div className="profile">
            <span className="profile-avatar">SC</span>
            <div>
              <strong>SutrAI workspace</strong>
              <small>Frontend prototype</small>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            </Button>
          </div>
        </div>
        <Button
          className="mobile-close"
          variant="ghost"
          size="icon"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        >
          <X />
        </Button>
      </aside>
      {mobile && <div className="mobile-scrim" onClick={() => setMobile(false)} />}
      <div className="workspace-main">
        <header className="topbar">
          <div className="breadcrumb">
            <Button
              variant="ghost"
              size="icon"
              className="mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu />
            </Button>
            <span>Workspace</span>
            <span>/</span>
            <strong>{section}</strong>
          </div>
          <div className="topbar-right">
            <span className="mode-badge">
              <span className="status-dot" />
              {demo ? "Demo workspace" : "API workspace"}
            </span>
            <span className="topbar-avatar">SC</span>
          </div>
        </header>
        <main className="page-content">{children}</main>
        <footer className="workspace-footer">
          <span>
            <Sparkles size={13} /> SutrAI · Clarity for commerce
          </span>
          <span>
            {demo ? "Sample data. Real possibilities." : "Connected to your configured service."}
          </span>
        </footer>
      </div>
    </div>
  );
}
export function DemoBadge() {
  return (
    <span className="sample-badge">
      <FlaskConical size={11} /> Demo data
    </span>
  );
}