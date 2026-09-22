import { NextResponse } from "next/server";
import { ApiError, getPlatformIntegrationCredentials } from "../../../../../lib/api";
import { getPlatformSession } from "../../../../../lib/session";

export async function GET() {
  const session = await getPlatformSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  try {
    const credenciais = await getPlatformIntegrationCredentials(session.token);
    return NextResponse.json(credenciais);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao carregar as conexões." }, { status: 502 });
  }
}
