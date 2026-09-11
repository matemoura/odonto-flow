import { NextRequest, NextResponse } from "next/server";
import { ApiError, updateTeamMemberRole } from "../../../../../../lib/api";
import { getStaffSession } from "../../../../../../lib/session";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  try {
    const member = await updateTeamMemberRole(session.clinicSlug, session.token, id, body.role);
    return NextResponse.json(member);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao atualizar o cargo." }, { status: 502 });
  }
}
