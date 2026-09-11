import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAMES } from "../../../../lib/session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE_NAMES.patientToken);
  response.cookies.delete(SESSION_COOKIE_NAMES.patientClinic);
  return response;
}
