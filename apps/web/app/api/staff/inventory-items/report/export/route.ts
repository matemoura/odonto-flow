import { NextRequest, NextResponse } from "next/server";
import { getStaffSession } from "../../../../../../lib/session";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

/**
 * BFF: mesmo motivo do export do financeiro — o link de download não pode
 * apontar direto pra API porque o token só existe no cookie httpOnly desta
 * app, não em algo que uma navegação direta do navegador consiga anexar.
 */
export async function GET(req: NextRequest) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const res = await fetch(`${API_URL}/inventory-items/report.xlsx?from=${from}&to=${to}`, {
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
      "content-disposition": res.headers.get("content-disposition") ?? `attachment; filename="estoque.xlsx"`,
    },
  });
}
