import { NextResponse } from "next/server";
import { getPlatformSession } from "../../../../../lib/session";
import { API_URL } from "../../../../../lib/api-url";

/**
 * Repassa o .zip em streaming — nunca lê a resposta inteira num buffer antes
 * de responder, senão um export grande (muitos documentos) inflaria a
 * memória deste processo à toa, quando ele só precisa passar os bytes adiante.
 */
export async function GET() {
  const session = await getPlatformSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }

  const res = await fetch(`${API_URL}/platform-admin/export/documents`, {
    headers: { authorization: `Bearer ${session.token}` },
    cache: "no-store",
  });

  if (!res.ok || !res.body) {
    return NextResponse.json({ message: "Falha ao exportar os documentos." }, { status: res.status || 502 });
  }

  return new NextResponse(res.body, {
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/zip",
      "content-disposition": res.headers.get("content-disposition") ?? 'attachment; filename="documentos.zip"',
    },
  });
}
