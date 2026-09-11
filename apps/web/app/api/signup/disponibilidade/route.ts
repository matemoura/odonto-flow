import { NextRequest, NextResponse } from "next/server";
import { checkSlugAvailability } from "../../../../lib/api";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug") ?? "";
  if (!slug) {
    return NextResponse.json({ available: false });
  }
  try {
    return NextResponse.json(await checkSlugAvailability(slug));
  } catch {
    // 503, nunca `{ available: false }`. Responder "indisponível" quando a API
    // não respondeu faz a tela afirmar que o nome já existe — e aí TODO nome
    // parece ocupado, o que manda o usuário procurar um problema que não é o
    // dele. O erro é da infraestrutura e precisa aparecer como erro.
    return NextResponse.json({ message: "Não foi possível verificar o link agora." }, { status: 503 });
  }
}
