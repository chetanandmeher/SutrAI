export type Row = Record<string, unknown>;
export type Analysis = {
  id: string;
  question: string;
  timestamp: string;
  status: "success" | "error";
  demo: boolean;
  summary: string;
  rows: Row[];
  evidence: Row[];
  raw?: unknown;
  error?: string;
};
export const prompts = [
  {
    title: "What’s driving revenue?",
    question: "Which product categories generated the most revenue?",
    kind: "Revenue & categories",
    icon: "revenue",
  },
  {
    title: "Where are deliveries slipping?",
    question: "Which regions have the highest rate of late deliveries?",
    kind: "Delivery performance",
    icon: "delivery",
  },
  {
    title: "What are customers telling us?",
    question: "What do customer reviews say about damaged products?",
    kind: "Customer experience",
    icon: "reviews",
  },
  {
    title: "Why are orders cancelled?",
    question: "What patterns are associated with refunds and cancellations?",
    kind: "Refunds & cancellations",
    icon: "refund",
  },
  {
    title: "Are sellers communicating well?",
    question: "What do reviews say about seller communication?",
    kind: "Seller communication",
    icon: "reviews",
  },
  {
    title: "Which carriers need attention?",
    question: "How does delivery performance compare across carriers?",
    kind: "Carrier performance",
    icon: "delivery",
  },
];
export const sampleRows: Row[] = [
  { Category: "Health & beauty", Revenue: 142850, Orders: 1248, "Average order value": 114.46 },
  { Category: "Home & furniture", Revenue: 118420, Orders: 986, "Average order value": 120.1 },
  { Category: "Sports & leisure", Revenue: 96370, Orders: 842, "Average order value": 114.45 },
  {
    Category: "Computers & accessories",
    Revenue: 82560,
    Orders: 614,
    "Average order value": 134.46,
  },
];
export function makeDemo(question: string): Analysis {
  const review = /review|damaged|communicat/i.test(question);
  return {
    id: crypto.randomUUID(),
    question,
    timestamp: new Date().toISOString(),
    status: "success",
    demo: true,
    summary: review
      ? "In this illustrative review sample, customers describe damaged packaging and difficulty reaching sellers. These themes suggest checking packaging quality and seller response practices. This is a demonstration, not a finding from your customer data."
      : "In this illustrative dataset, health & beauty leads category revenue at R$142,850, followed by home & furniture at R$118,420. Compare order volume and average order value before prioritizing a category. This is a demonstration, not an analysis of your store.",
    rows: review ? [] : sampleRows,
    evidence: review
      ? [
          {
            review_text:
              "O produto chegou com a embalagem danificada. Precisei entrar em contato com o vendedor.",
            source: "Synthetic review for demonstration",
            language: "Portuguese (Brazil)",
          },
          {
            review_text: "A entrega demorou e não consegui uma resposta do vendedor.",
            source: "Synthetic review for demonstration",
            language: "Portuguese (Brazil)",
          },
        ]
      : [],
    raw: { mode: "demo", grounding: "Not validated against the existing backend" },
  };
}
export function normalizeAnswer(
  payload: unknown,
): Pick<Analysis, "summary" | "rows" | "evidence" | "raw"> {
  if (typeof payload === "string")
    return { summary: payload, rows: [], evidence: [], raw: payload };
  const p = payload && typeof payload === "object" ? (payload as Row) : {};
  const list = (v: unknown): Row[] =>
    Array.isArray(v)
      ? v.filter((x): x is Row => !!x && typeof x === "object" && !Array.isArray(x))
      : [];
  const summary = [p["executive_summary"], p["answer"], p["summary"], p["response"]].find(
    (v) => typeof v === "string",
  );
  return {
    summary:
      typeof summary === "string"
        ? summary
        : "The API returned a response without a recognized summary. Expand raw diagnostics to inspect it.",
    rows: list(p["rows"] ?? p["sql_results"] ?? p["data"]),
    evidence: list(p["evidence"] ?? p["reviews"] ?? p["sources"]),
    raw: payload,
  };
}
export function toCsv(rows: Row[]): string {
  const keys = [...new Set(rows.flatMap(Object.keys))];
  const escape = (v: unknown) => {
    const s = typeof v === "object" ? JSON.stringify(v) : String(v ?? "");
    const safe = /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
    return '"' + safe.replace(/"/g, '""') + '"';
  };
  return [keys, ...rows.map((row) => keys.map((k) => row[k]))]
    .map((r) => r.map(escape).join(","))
    .join("\r\n");
}
export function validateBaseUrl(value: string): string {
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error(
      "Use an HTTP or HTTPS base URL without credentials, query parameters, or fragments.",
    );
  return value.replace(/\/+$/, "");
}
export async function apiRequest(
  base: string,
  path: "/ask" | "/health",
  question?: string,
): Promise<unknown> {
  const response = await fetch(`${validateBaseUrl(base)}${path}`, {
    method: path === "/ask" ? "POST" : "GET",
    ...(path === "/ask"
      ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) }
      : {}),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok)
    throw new Error(
      `The API returned HTTP ${response.status}. Check the service URL and request contract.`,
    );
  return response.json();
}