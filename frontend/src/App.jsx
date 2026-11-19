import { useEffect, useMemo, useState } from "react";

const suggestions = [
  { icon: "↗", title: "Revenue performance", prompt: "What are the top 10 product categories by total revenue?" },
  { icon: "◷", title: "Delivery experience", prompt: "What are the main reasons customers experience late deliveries?" },
  { icon: "◎", title: "Customer sentiment", prompt: "What are the most common complaints in customer reviews?" },
  { icon: "⌁", title: "Orders overview", prompt: "How many orders were placed each year and what is the trend?" },
];

function Icon({ children, className = "" }) {
  return <span className={`icon ${className}`} aria-hidden="true">{children}</span>;
}

function pretty(value) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function EvidenceValue({ value }) {
  if (value === null || value === undefined) return <span className="muted">—</span>;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return <span>{String(value)}</span>;
  }
  return <pre className="json-block">{pretty(value)}</pre>;
}

function SQLResults({ step }) {
  const data = step?.result ?? {};
  const columns = Array.isArray(data.columns) ? data.columns : [];
  const rows = Array.isArray(data.rows) ? data.rows : [];
  return (
    <section className="result-section">
      <div className="result-section-heading">
        <div><span className="eyebrow">STRUCTURED DATA</span><h4>Query results</h4></div>
        <span className="result-count">{rows.length} {rows.length === 1 ? "row" : "rows"}</span>
      </div>
      {columns.length > 0 && rows.length > 0 ? (
        <div className="results-table-wrap">
          <table className="results-table">
            <thead><tr>{columns.map((column) => <th key={column}>{column.replaceAll("_", " ")}</th>)}</tr></thead>
            <tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{columns.map((column, columnIndex) => {
              const value = Array.isArray(row) ? row[columnIndex] : row?.[column];
              return <td key={column}>{value === null || value === undefined ? <span className="muted">—</span> : typeof value === "object" ? pretty(value) : String(value)}</td>;
            })}</tr>)}</tbody>
          </table>
        </div>
      ) : <p className="empty-result">{data.error || "No tabular rows were returned for this step."}</p>}
      {data.sql && <details className="sql-details"><summary>View generated SQL <span className="chevron">⌄</span></summary><pre className="json-block">{data.sql}</pre></details>}
    </section>
  );
}

function ReviewEvidence({ step }) {
  const chunks = step?.result?.chunks ?? [];
  return (
    <section className="result-section">
      <div className="result-section-heading">
        <div><span className="eyebrow">CUSTOMER VOICE</span><h4>Retrieved review evidence</h4></div>
        <span className="result-count">{chunks.length} {chunks.length === 1 ? "review" : "reviews"}</span>
      </div>
      {chunks.length ? <div className="evidence-list">{chunks.map((chunk, index) => (
        <article className="evidence-card" key={chunk.chunk_id ?? index}>
          <div className="evidence-card-top"><strong>{chunk.document_name || `Review ${index + 1}`}</strong>{typeof chunk.similarity === "number" && <span className="similarity">{(chunk.similarity * 100).toFixed(1)}% match</span>}</div>
          <p>{chunk.text || "No review text was returned."}</p>
          {chunk.metadata && <details><summary>Review metadata</summary><pre className="json-block">{pretty(chunk.metadata)}</pre></details>}
        </article>
      ))}</div> : <p className="empty-result">No review chunks were returned for this step.</p>}
    </section>
  );
}

function ResultDetails({ result }) {
  const steps = result?.steps ?? [];
  const validation = result?.validation ?? {};
  const metrics = result?.metrics ?? {};
  const sqlSteps = steps.filter((step) => step.agent === "sql");
  const ragSteps = steps.filter((step) => step.agent === "rag");
  return (
    <section className="details-panel">
      <div className="details-topline"><div><span className="eyebrow">ANALYSIS RESULTS</span><h3>Evidence behind this answer</h3></div><span className="result-count">{steps.length} execution {steps.length === 1 ? "step" : "steps"}</span></div>
      {sqlSteps.map((step, index) => <SQLResults step={step} key={step.step_id ?? index} />)}
      {ragSteps.map((step, index) => <ReviewEvidence step={step} key={step.step_id ?? index} />)}
      <details className="technical-details">
        <summary><span><span className="eyebrow">TECHNICAL DETAILS</span><strong>Execution, validation and plan</strong></span><span className="chevron">⌄</span></summary>
        <div className="metric-grid">
          <div className="metric"><span>Latency</span><strong>{metrics.latency_ms != null ? `${metrics.latency_ms} ms` : "—"}</strong></div>
          <div className="metric"><span>Total tokens</span><strong>{metrics.total_tokens ?? "—"}</strong></div>
          <div className="metric"><span>Prompt tokens</span><strong>{metrics.prompt_tokens ?? "—"}</strong></div>
          <div className="metric"><span>Completion tokens</span><strong>{metrics.completion_tokens ?? "—"}</strong></div>
        </div>
        <div className="validation-row"><span className={`validation-dot ${result?.is_grounded ? "good" : "warn"}`} /><div><strong>{result?.is_grounded ? "Grounding check passed" : "Grounding check needs review"}</strong><p>{validation.reason || "Validator did not provide a reason."}</p></div></div>
        {validation.unsupported_claims?.length > 0 && <div className="claims"><strong>Unsupported claims flagged</strong><ul>{validation.unsupported_claims.map((claim, i) => <li key={i}>{String(claim)}</li>)}</ul></div>}
        {result?.plan && <details className="raw-plan"><summary>Execution plan <span className="chevron">⌄</span></summary><pre className="json-block">{pretty(result.plan)}</pre></details>}
        {steps.length > 0 && <details className="raw-plan"><summary>Raw agent outputs <span className="chevron">⌄</span></summary>{steps.map((step, index) => <div key={step.step_id ?? index}><strong className="raw-step-label">{step.agent || "Agent"} · {step.task || "Execution step"}</strong><EvidenceValue value={step.result} /></div>)}</details>}
      </details>
    </section>
  );
}

function AssistantMessage({ item }) {
  return (
    <div className="message assistant-message">
      <div className="avatar assistant-avatar">S</div>
      <div className="message-body">
        <div className="message-meta"><strong>SutrAI</strong><span>{item.time}</span></div>
        <div className="answer-card">
          <p className="answer-text">{item.answer}</p>
          {item.result && <ResultDetails result={item.result} />}
          {item.error && <div className="error-inline">{item.error}</div>}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState("checking");
  const [apiError, setApiError] = useState("");
  const [activeNav, setActiveNav] = useState("Ask SutrAI");

  const hasMessages = messages.length > 0;
  const canSend = question.trim().length >= 3 && !loading;

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const response = await fetch("/api/health");
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        if (active) { setApiStatus("online"); setApiError(""); }
      } catch (error) {
        if (active) { setApiStatus("offline"); setApiError(error.message); }
      }
    };
    check();
    const interval = window.setInterval(check, 15000);
    return () => { active = false; window.clearInterval(interval); };
  }, []);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  }, []);

  async function sendQuestion(value = question) {
    const text = value.trim();
    if (text.length < 3 || loading) return;
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setQuestion("");
    setMessages((current) => [...current, { role: "user", question: text, time: now }]);
    setLoading(true);
    setApiError("");
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = payload.detail || payload.message || `Request failed with status ${response.status}`;
        throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
      }
      setMessages((current) => [...current, {
        role: "assistant",
        answer: payload.answer || "The request completed, but the API returned no answer text.",
        result: payload,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }]);
      setApiStatus("online");
    } catch (error) {
      setMessages((current) => [...current, {
        role: "assistant",
        answer: "I couldn't complete that analysis. Check the API connection and server logs, then try again.",
        error: error.message,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }]);
      setApiStatus("offline");
      setApiError(error.message);
    } finally {
      setLoading(false);
    }
  }

  function resetChat() {
    setMessages([]);
    setQuestion("");
    setActiveNav("Ask SutrAI");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark"><span /></div>
          <div><div className="brand-name">sutrai<span>.</span></div><div className="brand-caption">OPERATIONS INTELLIGENCE</div></div>
        </div>
        <button className="new-chat-button" onClick={resetChat}><Icon>＋</Icon> New analysis</button>
        <div className="nav-label">WORKSPACE</div>
        <button className={`nav-item ${activeNav === "Ask SutrAI" ? "active" : ""}`} onClick={resetChat}><Icon>◈</Icon> Ask SutrAI</button>
        <div className="nav-label recent-label">YOUR WORK</div>
        {messages.filter((m) => m.role === "user").slice(-5).reverse().map((m, i) => (
          <button className="history-item" key={i} onClick={() => setQuestion(m.question)}><Icon>↳</Icon><span>{m.question}</span></button>
        ))}
        {!hasMessages && <p className="empty-history">Your recent analyses will appear here.</p>}
        <div className="sidebar-bottom">
          <div className="data-source"><div className="source-icon">▦</div><div><strong>Olist dataset</strong><span>PostgreSQL · pgvector</span></div><span className="source-live" /></div>
          <div className="user-profile"><div className="profile-avatar">A</div><div><strong>Analyst workspace</strong><span>Local development</span></div><span className="profile-menu">···</span></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><b>/</b><strong>{activeNav}</strong></div>
          <div className="topbar-right">
            <a href="http://127.0.0.1:8000/docs" target="_blank" rel="noreferrer" className="docs-link">API docs <span>↗</span></a>
            <div className="api-indicator"><span className={`status-dot ${apiStatus}`} />{apiStatus === "checking" ? "Checking API" : apiStatus === "online" ? "API connected" : "API offline"}</div>
          </div>
        </header>

        <div className={`workspace ${hasMessages ? "conversation-workspace" : ""}`}>
          {!hasMessages ? (
            <div className="welcome">
              <div className="welcome-kicker"><span className="spark">✳</span> YOUR E-COMMERCE INTELLIGENCE LAYER</div>
              <h1>{greeting}.<br /><span>Let's find the signal.</span></h1>
              <p className="welcome-copy">Ask complex questions about your e-commerce operations.<br className="desktop-break" /> SutrAI connects the numbers with the customer voice.</p>
              <div className="prompt-label">START WITH A QUESTION</div>
              <div className="suggestion-grid">
                {suggestions.map((item) => (
                  <button className="suggestion-card" key={item.title} onClick={() => sendQuestion(item.prompt)}>
                    <span className="suggestion-icon">{item.icon}</span><strong>{item.title}</strong><span className="suggestion-prompt">{item.prompt}</span><span className="suggestion-arrow">↗</span>
                  </button>
                ))}
              </div>
              <Composer question={question} setQuestion={setQuestion} sendQuestion={sendQuestion} canSend={canSend} loading={loading} />
              {apiStatus === "offline" && <div className="connection-warning">API not reachable at <code>127.0.0.1:8000</code>. Start FastAPI to ask questions. {apiError}</div>}
              <div className="privacy-note"><Icon>⌑</Icon> Your questions run against your local SutrAI backend and Olist database.</div>
            </div>
          ) : (
            <div className="conversation">
              <div className="conversation-heading"><div><span className="eyebrow">ANALYSIS SESSION</span><h1>Business intelligence</h1></div><button className="clear-button" onClick={resetChat}>＋ New analysis</button></div>
              {messages.map((item, index) => item.role === "user" ? (
                <div className="message user-message" key={index}><div className="avatar user-avatar">A</div><div className="message-body"><div className="message-meta"><strong>You</strong><span>{item.time}</span></div><div className="user-bubble">{item.question}</div></div></div>
              ) : <AssistantMessage item={item} key={index} />)}
              {loading && <div className="message assistant-message"><div className="avatar assistant-avatar">S</div><div className="message-body"><div className="message-meta"><strong>SutrAI</strong><span>Working</span></div><div className="thinking-card"><div className="thinking-dots"><i /><i /><i /></div><div><strong>Analyzing your question</strong><span>Planning · querying data · validating evidence</span></div></div></div></div>}
              <Composer question={question} setQuestion={setQuestion} sendQuestion={sendQuestion} canSend={canSend} loading={loading} />
            </div>
          )}
        </div>
        <footer className="footer"><span>Built for clearer decisions.</span><span>SUTRAI <b>·</b> LOCAL ENVIRONMENT</span></footer>
      </main>
    </div>
  );
}

function Composer({ question, setQuestion, sendQuestion, canSend, loading }) {
  function onKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSend) sendQuestion();
    }
  }
  return (
    <div className="composer-wrap">
      <div className="composer">
        <textarea value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={onKeyDown} placeholder="Ask about revenue, orders, delivery, customer reviews..." rows={2} disabled={loading} />
        <div className="composer-bottom"><span><kbd>↵</kbd> to send <span className="composer-hint">·</span> <kbd>shift + ↵</kbd> for new line</span><button className="send-button" disabled={!canSend} onClick={() => sendQuestion()}>{loading ? "Working…" : "Ask SutrAI"} <span>↑</span></button></div>
      </div>
    </div>
  );
}
