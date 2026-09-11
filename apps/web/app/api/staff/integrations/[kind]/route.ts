import { NextRequest, NextResponse } from "next/server";
import { ApiError, updateIntegrationConfig, type IntegrationKind } from "../../../../../lib/api";
import { getStaffSession } from "../../../../../lib/session";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ kind: string }> }) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }

  const { kind } = await params;
  const body = await req.json();
  try {
    const config = await updateIntegrationConfig(session.clinicSlug, session.token, kind as IntegrationKind, body);
    return NextResponse.json(config);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao salvar." }, { status: 502 });
  }
}
