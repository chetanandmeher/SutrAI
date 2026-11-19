import { useState } from "react";
import { Check, Copy, Download, ArrowDownUp, MessageSquareQuote, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoBadge } from "./workspace";
import { toCsv, type Analysis, type Row } from "./data";
const text = (v: unknown) => (typeof v === "object" ? JSON.stringify(v) : String(v ?? "—"));
export function Answer({ analysis }: { analysis: Analysis }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [sort, setSort] = useState<{ key: string; asc: boolean } | null>(null);
  const keys = [...new Set(analysis.rows.flatMap(Object.keys))];
  const rows = [...analysis.rows].sort((a, b) => {
    if (!sort) return 0;
    const av = a[sort.key],
      bv = b[sort.key];
    return (
      (typeof av === "number" && typeof bv === "number"
        ? av - bv
        : text(av).localeCompare(text(bv))) * (sort.asc ? 1 : -1)
    );
  });
  async function copy() {
    try {
      await navigator.clipboard.writeText(analysis.summary);
      setCopied(true);
      setCopyError("");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError("Copy unavailable. Select the summary to copy it manually.");
    }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "sutrai-analysis.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  const raw: Row = analysis.raw && typeof analysis.raw === "object" ? (analysis.raw as Row) : {};
  return (
    <section className="answer-panel">
      <div className="section-heading">
        <div className="answer-title">
          <CheckCircle2 size={18} />
          <h2>Analysis complete</h2>
          {analysis.demo && <DemoBadge />}
        </div>
        <Button variant="ghost" size="sm" onClick={copy}>
          {copied ? <Check /> : <Copy />}
          {copied ? "Copied" : "Copy answer"}
        </Button>
      </div>
      {copyError && <p role="status">{copyError}</p>}
      <div className="executive-summary">
        <span className="eyebrow">EXECUTIVE SUMMARY</span>
        <p>{analysis.summary}</p>
      </div>
      {keys.length > 0 && (
        <>
          <div className="section-heading table-heading">
            <h3>
              Results <span className="count-badge">{rows.length} rows</span>
            </h3>
            <Button variant="outline" size="sm" onClick={download}>
              <Download />
              Export CSV
            </Button>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {keys.map((k) => (
                    <th
                      key={k}
                      aria-sort={sort?.key === k ? (sort.asc ? "ascending" : "descending") : "none"}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSort({ key: k, asc: sort?.key === k ? !sort.asc : true })}
                      >
                        {k}
                        <ArrowDownUp size={12} />
                      </Button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    {keys.map((k) => (
                      <td key={k}>{text(r[k])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {analysis.evidence.length > 0 && (
        <div className="evidence-section">
          <h3>
            Review evidence {analysis.demo && <span className="subtle">· Synthetic examples</span>}
          </h3>
          {analysis.evidence.map((r, i) => (
            <article className="evidence-card" key={i}>
              <MessageSquareQuote size={19} />
              <div>
                <p>
                  {text(
                    r["review_text"] ??
                      r["text"] ??
                      r["content"] ??
                      r["review_comment_message"] ??
                      r,
                  )}
                </p>
                <div className="evidence-metadata">
                  {Object.entries(r)
                    .filter(
                      ([k]) =>
                        !["review_text", "text", "content", "review_comment_message"].includes(k),
                    )
                    .map(([k, v]) => (
                      <span key={k}>
                        {k}: {text(v)}
                      </span>
                    ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="transparency">
        <h3>Behind the answer</h3>
        {[
          ["SQL query", raw["sql"] ?? raw["sql_query"]],
          ["Execution steps", raw["steps"] ?? raw["execution_steps"]],
          ["Retrieved review evidence", analysis.evidence.length ? analysis.evidence : undefined],
          [
            "Grounding & validation",
            raw["grounding"] ?? raw["validation"] ?? raw["grounding_status"],
          ],
          ["Raw diagnostics", analysis.raw],
        ].map(([label, value]) => (
          <details key={String(label)}>
            <summary>{String(label)}</summary>
            <pre>
              {value === undefined
                ? "Not supplied by the API."
                : typeof value === "string"
                  ? value
                  : JSON.stringify(value, null, 2)}
            </pre>
          </details>
        ))}
      </div>
    </section>
  );
}