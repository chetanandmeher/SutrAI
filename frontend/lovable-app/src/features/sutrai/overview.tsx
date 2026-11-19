import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CircleDollarSign,
  ShoppingBag,
  Truck,
  Star,
  TrendingUp,
  Sparkles,
  Database,
  ChevronRight,
  MessageSquareText,
  RotateCcw,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Workspace, DemoBadge, useWorkspace } from "./workspace";
import { prompts } from "./data";
export const promptIcons = {
  revenue: TrendingUp,
  delivery: Truck,
  reviews: MessageSquareText,
  refund: RotateCcw,
};
export function PromptList({
  limit = 6,
  onSelect,
}: {
  limit?: number;
  onSelect?: (q: string) => void;
}) {
  return (
    <div className="prompt-list">
      {prompts.slice(0, limit).map((p) => {
        const Icon = promptIcons[p.icon as keyof typeof promptIcons];
        const content = (
          <>
            <span className="prompt-icon">
              <Icon size={16} />
            </span>
            <span>
              <strong>{p.title}</strong>
              <small>{p.kind}</small>
            </span>
            <ArrowUpRight />
          </>
        );
        return onSelect ? (
          <Button
            key={p.title}
            variant="ghost"
            className="prompt-item"
            onClick={() => onSelect(p.question)}
          >
            {content}
          </Button>
        ) : (
          <Button key={p.title} variant="ghost" className="prompt-item" asChild>
            <Link to="/ask" search={{ q: p.question }}>
              {content}
            </Link>
          </Button>
        );
      })}
    </div>
  );
}
const kpis = [
  {
    title: "Total revenue",
    value: "R$ 440,200",
    change: "+12.8%",
    icon: CircleDollarSign,
    tone: "",
  },
  { title: "Total orders", value: "3,690", change: "+8.2%", icon: ShoppingBag, tone: "blue" },
  { title: "On-time delivery", value: "91.4%", change: "+2.1 pts", icon: Truck, tone: "violet" },
  {
    title: "Average review score",
    value: "4.2 / 5",
    change: "+0.3 pts",
    icon: Star,
    tone: "amber",
  },
];
const categories = [
  { name: "Health & beauty", value: "R$ 142.9k" },
  { name: "Home & furniture", value: "R$ 118.4k" },
  { name: "Sports & leisure", value: "R$ 96.4k" },
  { name: "Computers & accessories", value: "R$ 82.6k" },
];
export function Overview() {
  const [period, setPeriod] = useState("6 months");
  const { analyses, demo, health } = useWorkspace();
  return (
    <Workspace section="Overview">
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR COMMERCE, IN FOCUS</span>
          <h1>A clearer view of your business.</h1>
          <p>From numbers to next steps. Let’s find what matters.</p>
        </div>
        <span className="date-label">
          <CalendarDays size={13} /> Sample period · Jan – Jun
        </span>
      </div>
      <div className="connection-banner">
        <Database />
        <div>
          <strong>
            {demo
              ? "You’re exploring the demo workspace"
              : health.state === "online"
                ? "Your API is reachable"
                : "Live API not verified"}
          </strong>
          <p>
            {demo
              ? "All metrics below are illustrative, not live store data."
              : "Overview metrics remain samples, not API results."}
          </p>
        </div>
        <Button asChild variant="ghost">
          <Link to="/status">
            {demo ? "Connect data" : "System status"}
            <ArrowRight />
          </Link>
        </Button>
      </div>
      <section>
        <div className="section-heading">
          <div className="heading-group">
            <h2>Business at a glance</h2>
            <DemoBadge />
          </div>
          <span className="subtle">Sample month</span>
        </div>
        <div className="kpi-grid">
          {kpis.map((k) => (
            <article className="kpi-card" key={k.title}>
              <div className="kpi-top">
                <span>{k.title}</span>
                <span className={`metric-icon ${k.tone}`}>
                  <k.icon size={14} />
                </span>
              </div>
              <div className="kpi-value">{k.value}</div>
              <div className="kpi-foot">
                <span className="trend">
                  <TrendingUp />
                  {k.change}
                </span>
                <span>vs. previous sample month</span>
              </div>
            </article>
          ))}
        </div>
      </section>
      <div className="chart-grid">
        <section className="chart-card">
          <div className="section-heading">
            <div className="heading-group">
              <h3>Revenue over time</h3>
              <DemoBadge />
            </div>
            <div className="chart-tabs" aria-label="Sample chart period">
              {["6 months", "12 months"].map((p) => (
                <Button
                  key={p}
                  variant="ghost"
                  className={period === p ? "selected" : ""}
                  aria-pressed={period === p}
                  onClick={() => setPeriod(p)}
                >
                  {p}
                </Button>
              ))}
            </div>
          </div>
          <p className="chart-description">A little perspective on the bigger picture.</p>
          <svg
            className="revenue-chart"
            viewBox="0 0 520 195"
            role="img"
            aria-label={`Illustrative sample revenue trend over ${period}, not live data`}
            preserveAspectRatio="none"
          >
            {[25, 65, 105, 145].map((y, i) => (
              <g key={y}>
                <line x1="44" y1={y} x2="510" y2={y} className="chart-gridline" />
                <text x="0" y={y + 3} className="chart-label">
                  R$ {150 - i * 40}k
                </text>
              </g>
            ))}
            <path
              className="chart-area"
              d={
                period === "6 months"
                  ? "M45 128 C85 128 105 84 140 94 S197 127 231 100 S291 92 325 74 S382 77 420 57 S473 40 510 22 L510 156 L45 156Z"
                  : "M45 141 L87 129 L130 135 L172 100 L215 114 L257 90 L300 95 L342 71 L385 76 L427 52 L470 45 L510 22 L510 156 L45 156Z"
              }
            />
            <path
              className="chart-line"
              d={
                period === "6 months"
                  ? "M45 128 C85 128 105 84 140 94 S197 127 231 100 S291 92 325 74 S382 77 420 57 S473 40 510 22"
                  : "M45 141 L87 129 L130 135 L172 100 L215 114 L257 90 L300 95 L342 71 L385 76 L427 52 L470 45 L510 22"
              }
            />
            <circle cx="510" cy="22" r="3.5" className="chart-point" />
            {(period === "6 months"
              ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
              : ["Jan", "Mar", "May", "Jul", "Sep", "Dec"]
            ).map((m, i) => (
              <text key={m} x={44 + i * 92} y="182" className="chart-label">
                {m}
              </text>
            ))}
          </svg>
          <div className="chart-legend">
            <span>
              <i className="legend-line" />
              Sample revenue
            </span>
            <span>· BRL (R$)</span>
          </div>
        </section>
        <section className="chart-card">
          <div className="section-heading">
            <div className="heading-group">
              <h3>Top categories</h3>
              <DemoBadge />
            </div>
            <TrendingUp size={14} className="subtle" />
          </div>
          <p className="chart-description">Revenue by product category · Sample month</p>
          <div className="category-chart">
            {categories.map((c, i) => (
              <div key={c.name}>
                <div className="category-row-top">
                  <span>{c.name}</span>
                  <span>{c.value}</span>
                </div>
                <div className="category-bar">
                  <div className={`bar-${i + 1}`} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="ask-banner">
        <div className="ask-banner-icon">
          <Sparkles size={23} />
        </div>
        <div>
          <h2>Your next insight starts with a question.</h2>
          <p>Ask SutrAI about sales, deliveries, or what your customers are saying.</p>
        </div>
        <Button asChild>
          <Link to="/ask">
            Ask SutrAI
            <ArrowRight />
          </Link>
        </Button>
      </section>
      <div className="lower-grid">
        <section>
          <div className="section-heading">
            <h2>A few good starting points</h2>
            <Link to="/ask">
              Explore all
              <ArrowRight />
            </Link>
          </div>
          <PromptList limit={3} />
        </section>
        <section>
          <div className="section-heading">
            <div className="heading-group">
              <h2>Recent analyses</h2>
              {!analyses.length && <DemoBadge />}
            </div>
            <Link to="/history">
              View history
              <ArrowRight />
            </Link>
          </div>
          <div className="recent-list">
            {analyses.length
              ? analyses.slice(0, 3).map((a) => (
                  <Button key={a.id} variant="ghost" className="recent-item" asChild>
                    <Link to="/history" search={{ id: a.id }}>
                      <span className="recent-icon">
                        <FileText size={15} />
                      </span>
                      <div>
                        <strong>{a.question}</strong>
                        <div className="recent-meta">
                          <span
                            className={a.status === "success" ? "success-label" : "error-label"}
                          >
                            {a.status === "success" ? "Completed" : "Failed"}
                          </span>
                          <span>
                            {new Date(a.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {a.demo && <DemoBadge />}
                        </div>
                      </div>
                      <ChevronRight />
                    </Link>
                  </Button>
                ))
              : prompts.slice(0, 3).map((p, i) => (
                  <Button key={p.title} variant="ghost" className="recent-item" asChild>
                    <Link to="/ask" search={{ q: p.question, sample: true }}>
                      <span className="recent-icon">
                        <FileText size={15} />
                      </span>
                      <div>
                        <strong>{p.question}</strong>
                        <div className="recent-meta">
                          <span className="success-label">Sample answer</span>
                          <span>Example {i + 1} · Not previously run</span>
                        </div>
                      </div>
                      <ChevronRight />
                    </Link>
                  </Button>
                ))}
          </div>
        </section>
      </div>
    </Workspace>
  );
}