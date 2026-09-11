import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAMES } from "../../../../lib/session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE_NAMES.staffToken);
  response.cookies.delete(SESSION_COOKIE_NAMES.staffRefresh);
  response.cookies.delete(SESSION_COOKIE_NAMES.staffClinic);
  response.cookies.delete(SESSION_COOKIE_NAMES.staffRole);
  return response;
}
