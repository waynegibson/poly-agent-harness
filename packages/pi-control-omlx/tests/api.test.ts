import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { applyProfile, listModels, listProfiles } from "../src/api.js";

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(value: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

describe("oMLX API client", () => {
  beforeEach(() => {
    vi.stubEnv("OMLX_BASE_URL", "http://omlx.test:9000/");
    vi.stubEnv("OMLX_REQUEST_TIMEOUT_MS", "2500");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  test("lists models from the configured base URL", async () => {
    const models = [{ id: "model-a" }];
    fetchMock.mockResolvedValue(jsonResponse({ models }));

    await expect(listModels()).resolves.toEqual(models);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://omlx.test:9000/admin/api/models",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  test("encodes model and profile path segments and applies with POST", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ profiles: [{ name: "high quality" }] }))
      .mockResolvedValueOnce(jsonResponse({ model_id: "team/model", settings: {} }));

    await listProfiles("team/model");
    await applyProfile("team/model", "high quality");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://omlx.test:9000/admin/api/models/team%2Fmodel/profiles",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://omlx.test:9000/admin/api/models/team%2Fmodel/profiles/high%20quality/apply",
      expect.objectContaining({ method: "POST", signal: expect.any(AbortSignal) }),
    );
  });

  test("rejects unsuccessful and malformed API responses", async () => {
    fetchMock.mockResolvedValueOnce(new Response("unavailable", { status: 503, statusText: "Unavailable" }));
    await expect(listModels()).rejects.toThrow("oMLX API error (503 Unavailable)");

    fetchMock.mockResolvedValueOnce(jsonResponse({ models: "not-an-array" }));
    await expect(listModels()).rejects.toThrow("expected a models array");

    fetchMock.mockResolvedValueOnce(new Response("not-json", { status: 200 }));
    await expect(listModels()).rejects.toThrow("Invalid JSON from oMLX");
  });

  test("wraps transport errors without exposing an API implementation detail", async () => {
    fetchMock.mockRejectedValue(new Error("socket closed"));
    await expect(listModels()).rejects.toThrow("Could not reach oMLX at http://omlx.test:9000: socket closed");
  });
});
