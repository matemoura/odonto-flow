import { NextRequest, NextResponse } from "next/server";
import { getStaffSession } from "../../../../../../lib/session";
import { API_URL } from "../../../../../../lib/api-url";


export async function POST(req: NextRequest, { params }: { params: Promise<{ professionalId: string }> }) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }

  const { professionalId } = await params;
  const body = await req.json();

  const res = await fetch(`${API_URL}/finance/commission-rules/${professionalId}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-clinic-slug": session.clinicSlug,
      authorization: `Bearer ${session.token}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ message: data.message ?? "Falha ao salvar comissão." }, { status: res.status });
  }
  return NextResponse.json(await res.json());
}
