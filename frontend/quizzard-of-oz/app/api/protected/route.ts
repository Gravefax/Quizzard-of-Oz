import { NextRequest, NextResponse } from "next/server";

const VALID_TOKEN = process.env.API_SECRET ?? "secret-token";

export function GET(request: NextRequest) {
  const cookieToken = request.cookies.get("access_token")?.value;

  if (!cookieToken || cookieToken !== VALID_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ data: "protected content" }, { status: 200 });
}
