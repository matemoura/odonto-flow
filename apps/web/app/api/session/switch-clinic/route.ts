import { NextRequest, NextResponse } from "next/server";
import { getCurrentOrganization } from "../../../../lib/api";
import { getStaffSession, SESSION_COOKIE_BASE, SESSION_COOKIE_NAMES } from "../../../../lib/session";

/**
 * Fase 6 — troca a clínica "ativa" da sessão para outra unidade da mesma
 * rede, sem novo login: o JWT do ORG_ADMIN já carrega uma membership virtual
 * para toda clínica da rede (ver AuthService.expandMembershipsWithOrgAdmin),
 * então só precisamos apontar o cookie `odontoflow_clinic` para o novo slug.
 */
export async function POST(req: NextRequest) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }

  const { clinicSlug } = await req.json();
  if (!clinicSlug) {
    return NextResponse.json({ message: "Informe a clínica de destino." }, { status: 400 });
  }

  const { organization } = await getCurrentOrganization(session.clinicSlug, session.token).catch(() => ({
    organization: null,
  }));
  const target = organization?.clinics.find((c) => c.slug === clinicSlug);
  if (!target) {
    return NextResponse.json({ message: "Clínica não encontrada nesta rede." }, { status: 404 });
  }

  // Não mexemos no cookie de role aqui: ele só reflete a membership direta
  // resolvida no login (ver /api/session/login) e é usado só para dicas de UI —
  // a autorização de verdade é sempre recalculada pela API a partir do JWT.
  const response = NextResponse.json({ clinicSlug: target.slug });
  response.cookies.set(SESSION_COOKIE_NAMES.staffClinic, target.slug, {
    ...SESSION_COOKIE_BASE,
    maxAge: 60 * 60 * 8,
  });
  return response;
}
