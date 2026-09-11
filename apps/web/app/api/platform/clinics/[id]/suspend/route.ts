import { NextRequest, NextResponse } from "next/server";
import { ApiError, suspendClinic } from "../../../../../../lib/api";
import { getPlatformSession } from "../../../../../../lib/session";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getPlatformSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    await suspendClinic(session.token, id, body.reason);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao suspender a clínica." }, { status: 502 });
  }
}
