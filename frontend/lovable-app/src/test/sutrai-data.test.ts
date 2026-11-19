import { describe, expect, it, vi, afterEach } from "vitest";
import {
  apiRequest,
  makeDemo,
  normalizeAnswer,
  toCsv,
  validateBaseUrl,
} from "@/features/sutrai/data";
afterEach(() => vi.unstubAllGlobals());
describe("SutrAI boundaries", () => {
  it("labels generated analytics as demo", () => {
    expect(makeDemo("Which categories lead revenue?").demo).toBe(true);
  });
  it("does not invent review evidence or scores from an API summary", () => {
    const result = normalizeAnswer({ answer: "No evidence supplied" });
    expect(result.evidence).toEqual([]);
    expect(result.rows).toEqual([]);
  });
  it("preserves supplied evidence without adding scores", () => {
    const evidence = [{ review_text: "Produto danificado", source: "review-1" }];
    expect(normalizeAnswer({ answer: "Damage reported", evidence }).evidence).toEqual(evidence);
  });
  it("calls the existing POST /ask with the configurable base", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ answer: "Result" }) });
    vi.stubGlobal("fetch", fetcher);
    await apiRequest("https://service.example/", "/ask", "Late deliveries?");
    expect(fetcher).toHaveBeenCalledWith(
      "https://service.example/ask",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ question: "Late deliveries?" }),
      }),
    );
  });
  it("checks actual health using GET /health", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: "ok" }) });
    vi.stubGlobal("fetch", fetcher);
    await apiRequest("https://service.example", "/health");
    expect(fetcher).toHaveBeenCalledWith(
      "https://service.example/health",
      expect.objectContaining({ method: "GET" }),
    );
  });
  it("does not fall back to demo on an API failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    await expect(apiRequest("https://service.example", "/ask", "Revenue?")).rejects.toThrow(
      "HTTP 503",
    );
  });
  it("rejects embedded credentials and unsafe URL protocols", () => {
    expect(() => validateBaseUrl("https://user:pass@example.com")).toThrow();
    expect(() => validateBaseUrl("javascript:alert(1)")).toThrow();
  });
  it("escapes CSV separators and formula cells", () => {
    expect(toCsv([{ Category: "Home, furniture", Note: "=1+1" }])).toBe(
      '"Category","Note"\r\n"Home, furniture","\'=1+1"',
    );
  });
});