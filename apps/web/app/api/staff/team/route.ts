import { NextRequest, NextResponse } from "next/server";
import { ApiError, createTeamMember } from "../../../../lib/api";
import { getStaffSession } from "../../../../lib/session";

export async function POST(req: NextRequest) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }

  const body = await req.json();
  try {
    const member = await createTeamMember(session.clinicSlug, session.token, body);
    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao adicionar membro da equipe." }, { status: 502 });
  }
}
