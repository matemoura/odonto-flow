import { NextRequest, NextResponse } from "next/server";
import { ApiError, deleteProcedure, getProcedure, updateProcedure } from "../../../../../lib/api";
import { getStaffSession } from "../../../../../lib/session";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const { id } = await params;
  try {
    const procedure = await getProcedure(session.clinicSlug, session.token, id);
    return NextResponse.json(procedure);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao carregar o serviço." }, { status: 502 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  try {
    const procedure = await updateProcedure(session.clinicSlug, session.token, id, body);
    return NextResponse.json(procedure);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao atualizar o serviço." }, { status: 502 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const { id } = await params;
  try {
    await deleteProcedure(session.clinicSlug, session.token, id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao excluir o serviço." }, { status: 502 });
  }
}
