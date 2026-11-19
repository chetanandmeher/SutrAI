import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Database, FileText, Globe, RefreshCw, LoaderCircle, FlaskConical, Plug } from "lucide-react";
import { Workspace, useWorkspace } from "@/features/sutrai/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest, validateBaseUrl, type Row } from "@/features/sutrai/data";
export const Route = createFileRoute("/status")({
  head: () => ({ meta: [
    { title: "SutrAI — Data sources & system status" },
    { name: "description", content: "Configure your existing FastAPI service and check actual API health separately from demo data." },
    { property: "og:title", content: "SutrAI — Data sources & system status" },
    { property: "og:description", content: "An honest view of your API connection and supplied health diagnostics." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: StatusPage,
});
function StatusPage() {
  const { baseUrl, setBaseUrl, demo, setDemo, health, setHealth } = useWorkspace();
  const [draft, setDraft] = useState(baseUrl);
  const [notice, setNotice] = useState("");
  function save() {
    try { if (draft) validateBaseUrl(draft); setBaseUrl(draft.trim().replace(/\/+$/, "")); setHealth({ state: "unchecked" }); setNotice("Connection URL saved for this session."); }
    catch (e) { setNotice(e instanceof Error ? e.message : "Invalid URL."); }
  }
  async function check() {
    setHealth({ state: "checking" });
    try { if (!baseUrl) throw new Error("Save your API base URL first."); const raw = await apiRequest(baseUrl, "/health"); setHealth({ state: "online", raw, checkedAt: new Date().toISOString() }); }
    catch (e) { setHealth({ state: "error", checkedAt: new Date().toISOString(), error: e instanceof Error ? e.message : "Unable to reach the API." }); }
  }
  const raw = health.raw && typeof health.raw === "object" ? health.raw as Row : {};
  const db = raw["database"] ?? raw["db_status"] ?? raw["db"];
  const healthText = health.state === "online" ? "Reachable · HTTP success" : health.state === "checking" ? "Checking…" : health.state === "error" ? "Check failed" : "Not checked";
  return (
    <Workspace section="Data sources & system status">
      <div className="page-heading"><div><span className="eyebrow">KNOW WHAT’S CONNECTED</span><h1>Data sources & system status.</h1><p>Your existing service. A transparent connection.</p></div></div>
      <div className="status-layout"><div>
        <section className="status-section"><h2>API connection</h2>
          <p>Connect to your existing SutrAI FastAPI service. No credentials are stored in this prototype.</p>
          <label className="field-label" htmlFor="base-url">API base URL</label>
          <Input id="base-url" className="api-input" placeholder="http://127.0.0.1:8000" value={draft} onChange={(e) => setDraft(e.target.value)} type="url" />
          <div className="field-hint">Uses only POST /ask and GET /health. The service must allow this website’s origin.</div>
          <Button variant="outline" size="sm" className="mt-3" onClick={save}><Plug />Save connection</Button>
          {notice && <p className="field-hint" role="status">{notice}</p>}
          <div className="mode-selector" aria-label="Analysis mode">
            <Button variant={demo ? "default" : "outline"} aria-pressed={demo} onClick={() => setDemo(true)}><FlaskConical />Demo mode</Button>
            <Button variant={!demo ? "default" : "outline"} aria-pressed={!demo} onClick={() => setDemo(false)}><Globe />API mode</Button>
          </div>
          <div className="status-notice">{demo ? "Demo mode uses clearly labeled illustrative answers. It does not query the API." : "API mode sends questions to your configured service. Connection errors will not silently fall back to demo answers."}</div>
          <details className="mt-5"><summary>Connection contract</summary><pre>{JSON.stringify({ method: "POST", path: "/ask", body: { question: "Your natural-language question" }, response: { question: "string", answer: "string", is_grounded: "boolean", validation: { unsupported_claims: ["string"], reason: "string" }, plan: { steps: ["..."] }, steps: [{ agent: "sql | rag", result: "agent output" }], metrics: { latency_ms: "number", total_tokens: "number" } } }, null, 2)}{"\n\n"}SQL step results contain columns and rows; RAG step results contain retrieved chunks. These are mapped into the result table and review evidence.</pre></details>
        </section>
        <section className="status-section"><h2>Source context</h2><p>These describe your existing service, not a verified data inventory.</p>
          <div className="source-item"><Database /><div><h3>PostgreSQL · Olist</h3><p>Orders, products, sellers, and delivery analytics through your service’s SQL layer.</p></div></div>
          <div className="source-item"><FileText /><div><h3>Customer reviews · Portuguese (Brazil)</h3><p>Review retrieval and grounded synthesis through your existing RAG pipeline.</p></div></div>
        </section>
      </div><div>
        <section className="status-section"><h2>Actual health checks</h2><p>Results below come only from GET /health. No sample health results are used.</p>
          <div className="check-row"><div><strong>FastAPI service</strong><small>GET /health</small></div><span className={`health-label ${health.state}`}><span className={`status-dot ${health.state === "online" ? "online" : ""}`} />{healthText}</span></div>
          <div className="check-row"><div><strong>Database health</strong><small>{db !== undefined ? "Reported by the API" : "Not supplied by the API"}</small></div><span className="health-label">{db === undefined ? "Unknown" : typeof db === "string" ? db : typeof db === "boolean" ? db ? "Reported healthy" : "Reported unhealthy" : "See diagnostics"}</span></div>
          <div className="check-row"><div><strong>Last checked</strong></div><span className="health-label">{health.checkedAt ? new Date(health.checkedAt).toLocaleTimeString() : "Never"}</span></div>
          <Button className="check-button" onClick={() => void check()} disabled={health.state === "checking"}>{health.state === "checking" ? <LoaderCircle className="spin" /> : <RefreshCw />}Check API health</Button>
          {health.error && <p className="field-hint error-label" role="alert">{health.error} Check your URL, service availability, and CORS settings.</p>}
          {health.raw !== undefined && <details className="mt-5"><summary>Raw health diagnostics</summary><pre>{JSON.stringify(health.raw, null, 2)}</pre></details>}
        </section>
        <div className="status-notice"><strong>Demo is not live data.</strong><br />Overview charts always remain labeled samples. API answers and session history are kept separate from illustrative results.</div>
      </div></div>
    </Workspace>
  );
}
