import { cookies } from "next/headers";

// Prefixo `odontoflow_`. O nome do cookie aparece no inspetor do navegador,
// então é parte do que a marca mostra — e o prefixo antigo (`dentista_`)
// sobreviveu ao rebrand porque as conferências procuraram por `dentista-` e
// `sereno`, e nenhuma das duas casa com `dentista_`.
const STAFF_TOKEN_COOKIE = "odontoflow_session";
const STAFF_REFRESH_COOKIE = "odontoflow_refresh";
const STAFF_CLINIC_COOKIE = "odontoflow_clinic";
const STAFF_ROLE_COOKIE = "odontoflow_role";
const PATIENT_TOKEN_COOKIE = "odontoflow_patient_session";
const PATIENT_CLINIC_COOKIE = "odontoflow_patient_clinic";
const PLATFORM_TOKEN_COOKIE = "odontoflow_platform_session";
const PLATFORM_REFRESH_COOKIE = "odontoflow_platform_refresh";

export const SESSION_COOKIE_NAMES = {
  staffToken: STAFF_TOKEN_COOKIE,
  staffRefresh: STAFF_REFRESH_COOKIE,
  staffClinic: STAFF_CLINIC_COOKIE,
  staffRole: STAFF_ROLE_COOKIE,
  patientToken: PATIENT_TOKEN_COOKIE,
  patientClinic: PATIENT_CLINIC_COOKIE,
  platformToken: PLATFORM_TOKEN_COOKIE,
  platformRefresh: PLATFORM_REFRESH_COOKIE,
};

/** Access token dura 1h; cookies de clínica/papel e o refresh (30d) sobrevivem bem mais. */
export const STAFF_ACCESS_COOKIE_MAX_AGE = 60 * 60; // 1h
export const STAFF_REFRESH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30d

/**
 * Opções padrão de todo cookie de sessão.
 *
 * `secure` só fica ligado em produção porque o dev roda em http://localhost, e
 * um cookie `secure` simplesmente não seria gravado ali — a sessão local
 * quebraria sem erro visível. Em produção ele impede que o token trafegue em
 * texto claro caso alguma requisição caia em HTTP.
 */
export const SESSION_COOKIE_BASE = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function getStaffSession() {
  const store = await cookies();
  const token = store.get(STAFF_TOKEN_COOKIE)?.value;
  const clinicSlug = store.get(STAFF_CLINIC_COOKIE)?.value;
  const role = store.get(STAFF_ROLE_COOKIE)?.value;
  if (!token || !clinicSlug) return null;
  return { token, clinicSlug, role };
}

export async function getPatientSession(clinicSlug: string) {
  const store = await cookies();
  const token = store.get(PATIENT_TOKEN_COOKIE)?.value;
  const sessionClinic = store.get(PATIENT_CLINIC_COOKIE)?.value;
  if (!token || sessionClinic !== clinicSlug) return null;
  return { token };
}

export async function getPlatformSession() {
  const store = await cookies();
  const token = store.get(PLATFORM_TOKEN_COOKIE)?.value;
  if (!token) return null;
  return { token };
}
