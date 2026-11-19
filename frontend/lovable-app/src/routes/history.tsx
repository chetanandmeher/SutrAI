import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { History, Search, FileText, ChevronRight, ArrowLeft, Plus } from "lucide-react";
import { Workspace, DemoBadge, useWorkspace } from "@/features/sutrai/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Answer } from "@/features/sutrai/answer";
export const Route = createFileRoute("/history")({
  validateSearch: (s: Record<string, unknown>): { id?: string | undefined } => ({
    id: typeof s["id"] === "string" ? s["id"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "SutrAI — Analysis history" },
      {
        name: "description",
        content: "Reopen your session analyses, results, and supporting evidence.",
      },
      { property: "og:title", content: "SutrAI — Analysis history" },
      {
        property: "og:description",
        content: "Return to your questions and insights in this session.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HistoryPage,
});
function HistoryPage() {
  const { analyses } = useWorkspace();
  const { id } = Route.useSearch();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const selected = analyses.find((a) => a.id === id);
  const filtered = analyses.filter(
    (a) =>
      a.question.toLowerCase().includes(query.toLowerCase()) &&
      (status === "all" || a.status === status),
  );
  return (
    <Workspace section="Analysis history">
      <div className="page-heading">
        <div>
          <span className="eyebrow">PICK UP WHERE YOU LEFT OFF</span>
          <h1>Analysis history.</h1>
          <p>Your questions and answers from this session. History resets when you refresh.</p>
        </div>
        <Button asChild size="sm">
          <Link to="/ask">
            <Plus />
            New analysis
          </Link>
        </Button>
      </div>
      {selected ? (
        <>
          <Link className="back-link" to="/history">
            <ArrowLeft size={14} />
            All analyses
          </Link>
          <h2 className="history-question">{selected.question}</h2>
          <p className="subtle">
            {new Date(selected.timestamp).toLocaleString()} {selected.demo && <DemoBadge />}
          </p>
          {selected.status === "success" ? (
            <Answer analysis={selected} />
          ) : (
            <div className="error-panel" role="alert">
              <h2>Analysis failed</h2>
              <p>{selected.error}</p>
              <Button asChild>
                <Link to="/ask" search={{ q: selected.question }}>
                  Try this question again
                </Link>
              </Button>
            </div>
          )}
        </>
      ) : (
        <>
          {id && (
            <p role="status" className="status-notice">
              This answer is not available in the current session.
            </p>
          )}
          <div className="history-toolbar">
            <div className="search-wrap">
              <Search />
              <Input
                aria-label="Search analyses"
                placeholder="Search your questions…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <select
              aria-label="Filter by status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="success">Completed</option>
              <option value="error">Failed</option>
            </select>
            <span className="subtle">{filtered.length} analyses</span>
          </div>
          {filtered.length ? (
            <div className="recent-list history-list">
              {filtered.map((a) => (
                <Button asChild variant="ghost" className="recent-item" key={a.id}>
                  <Link to="/history" search={{ id: a.id }}>
                    <span className="recent-icon">
                      <FileText size={17} />
                    </span>
                    <div>
                      <strong>{a.question}</strong>
                      <div className="recent-meta">
                        <span className={a.status === "success" ? "success-label" : "error-label"}>
                          {a.status === "success" ? "Completed" : "Failed"}
                        </span>
                        <span>{new Date(a.timestamp).toLocaleString()}</span>
                        {a.demo && <DemoBadge />}
                      </div>
                    </div>
                    <ChevronRight />
                  </Link>
                </Button>
              ))}
            </div>
          ) : (
            <div className="empty-answer">
              <div className="empty-symbol">
                <History />
              </div>
              <h2>
                {analyses.length ? "No matching analyses" : "A fresh start for fresh insights."}
              </h2>
              <p>
                {analyses.length
                  ? "Try a different search or status."
                  : "Ask your first question to start your analysis history."}
              </p>
              {!analyses.length && (
                <Button asChild className="mt-5">
                  <Link to="/ask">Ask SutrAI</Link>
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </Workspace>
  );
}