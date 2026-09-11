import { NextRequest, NextResponse } from "next/server";
import { ApiError, createTransaction } from "../../../../../lib/api";
import { getStaffSession } from "../../../../../lib/session";

export async function POST(req: NextRequest) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }

  const body = await req.json();
  try {
    const transaction = await createTransaction(session.clinicSlug, session.token, body);
    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao criar lançamento." }, { status: 502 });
  }
}
