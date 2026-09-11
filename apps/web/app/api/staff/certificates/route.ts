import { NextRequest, NextResponse } from "next/server";
import { ApiError, createCertificate, getCertificates } from "../../../../lib/api";
import { getStaffSession } from "../../../../lib/session";

export async function GET(req: NextRequest) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const patientId = new URL(req.url).searchParams.get("patientId") ?? "";
  try {
    const certificates = await getCertificates(session.clinicSlug, session.token, patientId);
    return NextResponse.json(certificates);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao carregar os atestados." }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const body = await req.json();
  try {
    const certificate = await createCertificate(session.clinicSlug, session.token, body);
    return NextResponse.json(certificate, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao emitir o atestado." }, { status: 502 });
  }
}
