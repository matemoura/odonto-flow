import { NextRequest, NextResponse } from "next/server";
import { ApiError, createOpportunity } from "../../../../../lib/api";
import { getStaffSession } from "../../../../../lib/session";

export async function POST(req: NextRequest) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }

  const body = await req.json();
  try {
    const opportunity = await createOpportunity(session.clinicSlug, session.token, body);
    return NextResponse.json(opportunity, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao criar oportunidade." }, { status: 502 });
  }
}
