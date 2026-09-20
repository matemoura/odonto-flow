import { NextRequest, NextResponse } from "next/server";
import { ApiError, updateClinicIntegrationSettings } from "../../../../../lib/api";
import { getStaffSession } from "../../../../../lib/session";

/** Só os campos da clínica. Provedor e liberação são do dono da plataforma. */
export async function PUT(req: NextRequest) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  try {
    const view = await updateClinicIntegrationSettings(session.clinicSlug, session.token, {
      whatsappPhone: body.whatsappPhone ?? null,
    });
    return NextResponse.json(view);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao salvar." }, { status: 502 });
  }
}
