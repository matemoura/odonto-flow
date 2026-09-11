import { NextRequest, NextResponse } from "next/server";
import { ApiError, queryCreditScore } from "../../../../../../lib/api";
import { getStaffSession } from "../../../../../../lib/session";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }

  const { id } = await params;
  const { consent } = await req.json();
  try {
    const result = await queryCreditScore(session.clinicSlug, session.token, id, consent);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao consultar score." }, { status: 502 });
  }
}
