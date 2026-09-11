import { NextRequest, NextResponse } from "next/server";
import { getStaffSession } from "../../../../../lib/session";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

/**
 * BFF: o link de exportação não pode apontar direto para a API porque o
 * JwtAuthGuard exige `Authorization: Bearer`, e o navegador só tem o token
 * no cookie httpOnly desta app — não em nenhum lugar que ele possa anexar
 * sozinho numa navegação direta para outra origem.
 */
export async function GET(req: NextRequest) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const res = await fetch(`${API_URL}/finance/export.xlsx?from=${from}&to=${to}`, {
    headers: {
      "x-clinic-slug": session.clinicSlug,
      authorization: `Bearer ${session.token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json({ message: "Falha ao gerar a planilha." }, { status: res.status });
  }

  const buffer = await res.arrayBuffer();
  return new NextResponse(buffer, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": res.headers.get("content-disposition") ?? `attachment; filename="fluxo-de-caixa.xlsx"`,
    },
  });
}
