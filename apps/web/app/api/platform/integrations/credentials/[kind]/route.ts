import { NextRequest, NextResponse } from "next/server";
import { ApiError, upsertPlatformIntegrationCredential, type IntegrationKind } from "../../../../../../lib/api";
import { getPlatformSession } from "../../../../../../lib/session";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ kind: string }> }) {
  const session = await getPlatformSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }

  const { kind } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const credencial = await upsertPlatformIntegrationCredential(session.token, kind as IntegrationKind, {
      providerName: body.providerName,
      config: body.config,
      secret: body.secret || undefined,
    });
    return NextResponse.json(credencial);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao salvar a conexão." }, { status: 502 });
  }
}
