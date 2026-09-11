import { NextRequest, NextResponse } from "next/server";
import { ApiError, adjustInventoryItem } from "../../../../../../lib/api";
import { getStaffSession } from "../../../../../../lib/session";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  try {
    const item = await adjustInventoryItem(session.clinicSlug, session.token, id, body);
    return NextResponse.json(item);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao ajustar o estoque." }, { status: 502 });
  }
}
