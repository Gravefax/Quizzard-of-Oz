import { describe, it, expect, beforeEach } from "vitest";
import { GET } from "@/app/api/protected/route";
import { NextRequest } from "next/server";

const VALID_TOKEN = "secret-token";

function makeRequest(cookieHeader?: string): NextRequest {
  return new NextRequest("http://localhost/api/protected", {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });
}

describe("GET /api/protected — security", () => {
  beforeEach(() => {
    process.env.API_SECRET = VALID_TOKEN;
  });

  it("returns 401 when no auth cookie is provided", async () => {
    const response = GET(makeRequest());
    expect(response.status).toBe(401);
  });

  it("returns 401 for a wrong token", async () => {
    const response = GET(makeRequest("access_token=wrong-token"));
    expect(response.status).toBe(401);
  });

  it("returns 200 with valid token cookie", async () => {
    const response = GET(makeRequest(`access_token=${VALID_TOKEN}`));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ data: "protected content" });
  });
});
