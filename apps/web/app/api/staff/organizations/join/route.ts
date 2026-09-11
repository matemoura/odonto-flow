import { NextRequest, NextResponse } from "next/server";
import { ApiError, joinOrganization } from "../../../../../lib/api";
import { getStaffSession } from "../../../../../lib/session";

export async function POST(req: NextRequest) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }

  const { organizationId } = await req.json();
  try {
    const result = await joinOrganization(session.clinicSlug, session.token, organizationId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Não foi possível entrar na rede." }, { status: 502 });
  }
}
