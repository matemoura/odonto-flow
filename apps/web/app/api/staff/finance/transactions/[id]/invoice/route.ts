import { NextResponse } from "next/server";
import { ApiError, issueInvoice } from "../../../../../../../lib/api";
import { getStaffSession } from "../../../../../../../lib/session";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }

  const { id } = await params;
  try {
    const invoice = await issueInvoice(session.clinicSlug, session.token, id);
    return NextResponse.json(invoice);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao emitir nota." }, { status: 502 });
  }
}
