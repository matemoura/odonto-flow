import { NextRequest, NextResponse } from "next/server";
import { ApiError, createClinicalRecord } from "../../../../../lib/api";
import { getStaffSession } from "../../../../../lib/session";

/**
 * Registro de evolução clínica. A leitura acontece server-side na página do
 * paciente; esta rota existe só para a escrita, que vem de um componente
 * cliente (o formulário).
 */
export async function POST(req: NextRequest) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  try {
    const record = await createClinicalRecord(session.clinicSlug, session.token, body);
    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError) {
      // A mensagem da API é a útil aqui: "só um profissional vinculado a esta
      // clínica pode registrar prontuário" explica o 404 que o admin não-
      // dentista recebe. Trocar por um texto genérico esconderia o motivo.
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao registrar a evolução." }, { status: 502 });
  }
}
