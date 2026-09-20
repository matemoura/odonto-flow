import { NextRequest, NextResponse } from "next/server";
import { ApiError, addProcedurePrescriptionItem } from "../../../../../../lib/api";
import { getStaffSession } from "../../../../../../lib/session";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  try {
    const item = await addProcedurePrescriptionItem(session.clinicSlug, session.token, id, body);
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao adicionar medicamento à receita padrão." }, { status: 502 });
  }
}
