import { NextRequest, NextResponse } from "next/server";
import { getStaffSession } from "../../../../../../lib/session";
import { API_URL } from "../../../../../../lib/api-url";


/**
 * Serve o binário do documento (ex.: foto do faceograma) num <img src> —
 * o download da API exige Authorization: Bearer, que uma tag <img> comum não
 * consegue enviar sozinha.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }

  const { id } = await params;
  const res = await fetch(`${API_URL}/documents/${id}/download`, {
    headers: {
      "x-clinic-slug": session.clinicSlug,
      authorization: `Bearer ${session.token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json({ message: "Arquivo não encontrado." }, { status: res.status });
  }

  const buffer = await res.arrayBuffer();
  return new NextResponse(buffer, {
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/octet-stream",
    },
  });
}
