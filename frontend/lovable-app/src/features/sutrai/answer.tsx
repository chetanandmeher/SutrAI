import { useState } from "react";
import { Check, Copy, Download, ArrowDownUp, MessageSquareQuote, CheckCircle2, AlertTriangle, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoBadge } from "./workspace";
import { toCsv, type Analysis, type Row } from "./data";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const text = (v: unknown) => (typeof v === "object" ? JSON.stringify(v) : String(v ?? "—"));
const label = (value: string) => value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const isRevenue = (key: string) => /revenue|sales|amount|price|total/i.test(key);
const formatValue = (key: string, value: unknown) => {
  if (typeof value !== "number") return text(value);
  return isRevenue(key)
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value)
    : new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
};
function cleanSummary(markdown: string) {
  const lines = markdown.split("\n");
  const prose = lines.filter((line) => {
    const trimmed = line.trim();
    return trimmed && !trimmed.startsWith("|") && !/^\|?\s*[-:]+(?:\s*\|\s*[-:]+)+\s*\|?$/.test(trimmed)
      && !/^\*\*[^*]+\*\*$/.test(trimmed);
  });
  return prose.join(" ").replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1").trim();
}
export function Answer({ analysis }: { analysis: Analysis }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [sort, setSort] = useState<{ key: string; asc: boolean } | null>(null);
  const keys = [...new Set(analysis.rows.flatMap(Object.keys))];
  const rows = [...analysis.rows].sort((a, b) => {
    if (!sort) return 0;
    const av = a[sort.key], bv = b[sort.key];
    return (typeof av === "number" && typeof bv === "number" ? av - bv : text(av).localeCompare(text(bv))) * (sort.asc ? 1 : -1);
  });
  const categoryKey = keys.find((key) => /category|product|name|label/i.test(key)) ?? keys[0];
  const valueKey = keys.find((key) => typeof analysis.rows[0]?.[key] === "number" && isRevenue(key))
    ?? keys.find((key) => typeof analysis.rows[0]?.[key] === "number");
  const chartRows = categoryKey && valueKey
    ? [...analysis.rows].filter((row) => typeof row[valueKey] === "number")
        .sort((a, b) => Number(b[valueKey]) - Number(a[valueKey])).slice(0, 10)
    : [];
  const graphData = chartRows.map((row) => ({ category: label(text(row[categoryKey!])), value: Number(row[valueKey!]) }));
  async function copy() {
    try { await navigator.clipboard.writeText(analysis.summary); setCopied(true); setCopyError(""); setTimeout(() => setCopied(false), 2000); }
    catch { setCopyError("Copy unavailable. Select the summary to copy it manually."); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "sutrai-analysis.csv"; a.click(); URL.revokeObjectURL(url);
  }
  const raw: Row = analysis.raw && typeof analysis.raw === "object" ? analysis.raw as Row : {};
  const metrics = analysis.metrics ?? {};
  const summary = cleanSummary(analysis.summary);
  return (
    <section className="answer-panel">
      <div className="section-heading">
        <div className="answer-title">
          <CheckCircle2 size={18} /><h2>Analysis complete</h2>
          {analysis.demo && <DemoBadge />}
          {!analysis.demo && typeof analysis.isGrounded === "boolean" && (
            <span className={analysis.isGrounded ? "success-label" : "error-label"}>
              {analysis.isGrounded ? "Grounding passed" : "Grounding needs review"}
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={copy}>{copied ? <Check /> : <Copy />}{copied ? "Copied" : "Copy answer"}</Button>
      </div>
      {copyError && <p role="status">{copyError}</p>}
      {!analysis.demo && analysis.isGrounded === false && (
        <div className="status-notice"><AlertTriangle size={16} /> The validator flagged unsupported claims. Review the validation details before relying on this answer.</div>
      )}
      <div className="executive-summary">
        <span className="eyebrow">EXECUTIVE SUMMARY</span>
        <p>{summary || (analysis.rows.length ? "The query returned structured results. Review the ranking and detailed data below." : analysis.summary)}</p>
      </div>
      {graphData.length > 0 && (
        <section className="answer-chart" aria-label="Results bar chart">
          <div className="answer-chart-heading">
            <div><BarChart3 size={16} /><h3>Revenue by category</h3></div>
            <span>{label(valueKey!)} · {isRevenue(valueKey!) ? "USD" : "value"}</span>
          </div>
          <div className="answer-graph">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={graphData} margin={{ top: 12, right: 18, left: 12, bottom: 72 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 4" vertical={false} />
                <XAxis
                  dataKey="category"
                  interval={0}
                  angle={-32}
                  textAnchor="end"
                  height={82}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={false}
                />
                <YAxis
                  width={76}
                  tickFormatter={(value: number) => isRevenue(valueKey!) ? `$${(value / 1000).toFixed(0)}k` : new Intl.NumberFormat("en-US", { notation: "compact" }).format(value)}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value) => [formatValue(valueKey!, Number(value)), label(valueKey!)]}
                  labelStyle={{ color: "var(--foreground)", fontWeight: 600 }}
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }}
                  cursor={{ fill: "var(--muted)", opacity: 0.65 }}
                />
                <Bar dataKey="value" name={label(valueKey!)} fill="var(--chart-main)" radius={[4, 4, 0, 0]} maxBarSize={54} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
      {Object.keys(metrics).length > 0 && (
        <p className="subtle answer-metrics">Runtime: {text(metrics["latency_ms"])} ms · Tokens: {text(metrics["total_tokens"])}</p>
      )}
      {keys.length > 0 && <>
        <div className="section-heading table-heading">
          <h3>Detailed results <span className="count-badge">{rows.length} rows</span></h3>
          <Button variant="outline" size="sm" onClick={download}><Download />Export CSV</Button>
        </div>
        <div className="table-scroll"><table><thead><tr>{keys.map((k) => (
          <th key={k} aria-sort={sort?.key === k ? (sort.asc ? "ascending" : "descending") : "none"}>
            <Button variant="ghost" size="sm" onClick={() => setSort({ key: k, asc: sort?.key === k ? !sort.asc : true })}>{label(k)}<ArrowDownUp size={12} /></Button>
          </th>
        ))}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{keys.map((k) => <td key={k}>{formatValue(k, r[k])}</td>)}</tr>)}</tbody></table></div>
      </>}
      {analysis.evidence.length > 0 && <div className="evidence-section">
        <h3>Retrieved review evidence {analysis.demo && <span className="subtle">· Synthetic examples</span>}</h3>
        {analysis.evidence.map((r, i) => <article className="evidence-card" key={i}>
          <MessageSquareQuote size={19} /><div>
            <p>{text(r["text"] ?? r["review_text"] ?? r["content"] ?? r["review_comment_message"] ?? r)}</p>
            <div className="evidence-metadata">{Object.entries(r).filter(([k]) => !["text", "review_text", "content", "review_comment_message"].includes(k)).map(([k, v]) => <span key={k}>{k}: {text(v)}</span>)}</div>
          </div>
        </article>)}
      </div>}
      <div className="transparency">
        <h3>Behind the answer</h3>
        {[
          ["SQL and execution steps", raw["steps"] ?? raw["execution_steps"]],
          ["Grounding validation", analysis.validation ?? raw["validation"]],
          ["Runtime metrics", analysis.metrics ?? raw["metrics"]],
          ["Retrieved review evidence", analysis.evidence.length ? analysis.evidence : undefined],
          ["Full API response", analysis.raw],
        ].map(([labelText, value]) => <details key={String(labelText)}>
          <summary>{String(labelText)}</summary>
          <pre>{value === undefined ? "Not supplied by the API." : typeof value === "string" ? value : JSON.stringify(value, null, 2)}</pre>
        </details>)}
      </div>
    </section>
  );
}
