import { NextRequest, NextResponse } from "next/server";
import { getStaffSession } from "../../../../lib/session";
import { API_URL } from "../../../../lib/api-url";


/**
 * BFF de upload de documento — repassa o multipart/form-data recebido do
 * navegador direto para a API (que precisa do Authorization: Bearer,
 * indisponível para o navegador anexar sozinho num upload cross-origin).
 */
export async function POST(req: NextRequest) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }

  const incoming = await req.formData();
  const res = await fetch(`${API_URL}/documents`, {
    method: "POST",
    headers: {
      "x-clinic-slug": session.clinicSlug,
      authorization: `Bearer ${session.token}`,
    },
    body: incoming,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json({ message: data.message ?? "Falha ao enviar o arquivo." }, { status: res.status });
  }
  return NextResponse.json(data, { status: res.status });
}
