import { NextRequest, NextResponse } from "next/server";
import { ApiError, createInventoryItem, getInventoryItems } from "../../../../lib/api";
import { getStaffSession } from "../../../../lib/session";

export async function GET() {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  try {
    const items = await getInventoryItems(session.clinicSlug, session.token);
    return NextResponse.json(items);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao carregar o estoque." }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const body = await req.json();
  try {
    const item = await createInventoryItem(session.clinicSlug, session.token, body);
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao criar item de estoque." }, { status: 502 });
  }
}
