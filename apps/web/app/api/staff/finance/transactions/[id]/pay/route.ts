import { NextResponse } from "next/server";
import { ApiError, markTransactionPaid, type PaymentMethod } from "../../../../../../../lib/api";
import { getStaffSession } from "../../../../../../../lib/session";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }

  const { id } = await params;
  const { paymentMethod } = (await req.json()) as { paymentMethod: PaymentMethod };
  try {
    const transaction = await markTransactionPaid(session.clinicSlug, session.token, id, paymentMethod);
    return NextResponse.json(transaction);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao marcar como pago." }, { status: 502 });
  }
}
