import { NextRequest, NextResponse } from "next/server";
import { ApiError, releaseIntegration, type IntegrationKind } from "../../../../../../lib/api";
import { getPlatformSession } from "../../../../../../lib/session";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ clinicId: string; kind: string }> },
) {
  const session = await getPlatformSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }

  const { clinicId, kind } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const config = await releaseIntegration(session.token, clinicId, kind as IntegrationKind, {
      enabled: Boolean(body.enabled),
      providerName: body.providerName,
    });
    return NextResponse.json(config);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao salvar a liberação." }, { status: 502 });
  }
}
