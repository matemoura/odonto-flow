import { NextRequest, NextResponse } from "next/server";
import { ApiError, getPlatformSettings, updatePlatformSettings } from "../../../../lib/api";
import { getPlatformSession } from "../../../../lib/session";

export async function GET() {
  const session = await getPlatformSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  try {
    const settings = await getPlatformSettings(session.token);
    return NextResponse.json(settings);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao carregar as configurações." }, { status: 502 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getPlatformSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const body = await req.json();
  try {
    const settings = await updatePlatformSettings(session.token, body.delinquencyGracePeriodDays);
    return NextResponse.json(settings);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao salvar as configurações." }, { status: 502 });
  }
}
