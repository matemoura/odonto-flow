import { NextRequest, NextResponse } from "next/server";
import { ApiError, reactivateClinic } from "../../../../../../lib/api";
import { getPlatformSession } from "../../../../../../lib/session";

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getPlatformSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const { id } = await params;
  try {
    await reactivateClinic(session.token, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao reativar a clínica." }, { status: 502 });
  }
}
