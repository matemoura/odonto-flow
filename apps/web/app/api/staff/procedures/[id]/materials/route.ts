import { NextRequest, NextResponse } from "next/server";
import { ApiError, addProcedureMaterial } from "../../../../../../lib/api";
import { getStaffSession } from "../../../../../../lib/session";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  try {
    const material = await addProcedureMaterial(session.clinicSlug, session.token, id, body);
    return NextResponse.json(material, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao adicionar material." }, { status: 502 });
  }
}
