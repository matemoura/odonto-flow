import { NextRequest, NextResponse } from "next/server";
import { ApiError, createProcedure, getProcedures } from "../../../../lib/api";
import { getStaffSession } from "../../../../lib/session";

export async function GET() {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  try {
    const procedures = await getProcedures(session.clinicSlug, session.token);
    return NextResponse.json(procedures);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao carregar serviços." }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const body = await req.json();
  try {
    const procedure = await createProcedure(session.clinicSlug, session.token, body);
    return NextResponse.json(procedure, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao criar serviço." }, { status: 502 });
  }
}
