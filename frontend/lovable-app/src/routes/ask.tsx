import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  ArrowUp,
  LoaderCircle,
  AlertCircle,
  RotateCcw,
  FlaskConical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Workspace, useWorkspace } from "@/features/sutrai/workspace";
import { PromptList } from "@/features/sutrai/overview";
import { Answer } from "@/features/sutrai/answer";
import { apiRequest, normalizeAnswer, makeDemo, type Analysis } from "@/features/sutrai/data";
export const Route = createFileRoute("/ask")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { q?: string | undefined; sample?: boolean | undefined } => ({
    q: typeof s["q"] === "string" ? s["q"] : undefined,
    sample: s["sample"] === true || s["sample"] === "true",
  }),
  head: () => ({
    meta: [
      { title: "Ask SutrAI — Your commerce analyst" },
      {
        name: "description",
        content:
          "Ask questions about revenue, deliveries, and customer feedback with transparent SQL and review evidence.",
      },
      { property: "og:title", content: "Ask SutrAI — Your commerce analyst" },
      {
        property: "og:description",
        content: "Turn your e-commerce questions into actionable, grounded answers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AskPage,
});
function AskPage() {
  const search = Route.useSearch();
  const { demo, setDemo, baseUrl, add } = useWorkspace();
  const [question, setQuestion] = useState(search.q ?? "");
  const [answer, setAnswer] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    setQuestion(search.q ?? "");
    if (search.sample && search.q) {
      setAnswer(makeDemo(search.q));
    } else setAnswer(null);
  }, [search.q, search.sample]);
  async function ask(forceDemo = false) {
    if (!question.trim() || loading) return;
    setLoading(true);
    setError("");
    setAnswer(null);
    const q = question.trim();
    const isDemo = forceDemo || demo;
    try {
      let result: Analysis;
      if (isDemo) {
        await new Promise((resolve) => setTimeout(resolve, 750));
        result = makeDemo(q);
      } else {
        if (!baseUrl)
          throw new Error(
            "No API base URL is configured. Add your service URL in Data sources, or run a labeled demo.",
          );
        const raw = await apiRequest(baseUrl, "/ask", q);
        result = {
          ...normalizeAnswer(raw),
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          question: q,
          status: "success",
          demo: false,
        };
      }
      add(result);
      setAnswer(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : "The analysis could not be completed.";
      setError(message);
      add({
        id: crypto.randomUUID(),
        question: q,
        timestamp: new Date().toISOString(),
        status: "error",
        demo: isDemo,
        summary: "",
        rows: [],
        evidence: [],
        error: message,
      });
    } finally {
      setLoading(false);
    }
  }
  return (
    <Workspace section="Ask SutrAI">
      <div className="page-heading">
        <div>
          <span className="eyebrow">A QUESTION AWAY FROM CLARITY</span>
          <h1>Ask SutrAI.</h1>
          <p>Your AI analyst for the numbers behind your business.</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/history">Analysis history</Link>
        </Button>
      </div>
      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          void ask();
        }}
      >
        <Textarea
          ref={input}
          aria-label="Your business question"
          placeholder="Which product categories generated the most revenue?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={loading}
        />
        <div className="composer-bottom">
          <span className="composer-mode">
            {demo ? <FlaskConical size={13} /> : <Sparkles size={13} />}{" "}
            {demo ? "Demo mode · Illustrative answers" : "API mode · Your configured service"}
          </span>
          <Button type="submit" disabled={loading || !question.trim()}>
            {loading ? <LoaderCircle className="spin" /> : <ArrowUp />}
            {loading ? "Analyzing…" : "Ask SutrAI"}
          </Button>
        </div>
      </form>
      {loading && (
        <div className="loading-panel" role="status" aria-live="polite">
          <LoaderCircle className="spin" size={25} />
          <h2>Finding the signal…</h2>
          <p>
            {demo
              ? "Preparing an illustrative sample answer."
              : "Waiting for your API to complete the analysis."}
          </p>
        </div>
      )}
      {error && (
        <div className="error-panel" role="alert">
          <h2>
            <AlertCircle size={19} />
            We couldn’t complete this analysis
          </h2>
          <p>
            {error} If the URL is correct, confirm the service is running and allows requests from
            this website (CORS). Demo answers are never substituted automatically.
          </p>
          <div className="error-actions">
            <Button variant="outline" onClick={() => void ask()}>
              <RotateCcw />
              Try again
            </Button>
            <Button variant="outline" asChild>
              <Link to="/status">Check connection</Link>
            </Button>
            <Button
              onClick={() => {
                setDemo(true);
                void ask(true);
              }}
            >
              <FlaskConical />
              Run labeled demo
            </Button>
          </div>
        </div>
      )}
      {answer && <Answer key={answer.id} analysis={answer} />}
      {!answer && !loading && !error && (
        <>
          <section className="ask-prompts">
            <div className="section-heading">
              <h2>Where would you like to start?</h2>
              <span className="subtle">Suggested questions</span>
            </div>
            <PromptList
              onSelect={(q) => {
                setQuestion(q);
                input.current?.focus();
              }}
            />
          </section>
          <div className="empty-answer">
            <div className="empty-symbol">
              <Sparkles size={24} />
            </div>
            <h2>Big questions. Clear answers.</h2>
            <p>
              {demo
                ? "Your demo analysis will appear here."
                : "Your analysis and any evidence supplied by the API will appear here."}
            </p>
          </div>
        </>
      )}
    </Workspace>
  );
}