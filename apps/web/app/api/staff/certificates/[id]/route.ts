import { NextRequest, NextResponse } from "next/server";
import { ApiError, deleteCertificate } from "../../../../../lib/api";
import { getStaffSession } from "../../../../../lib/session";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const { id } = await params;
  try {
    await deleteCertificate(session.clinicSlug, session.token, id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao excluir o atestado." }, { status: 502 });
  }
}
