/**
 * Cliente HTTP fino para a API (apps/api). Funciona tanto em Server
 * Components/Route Handlers (Node) quanto em Client Components (browser) —
 * o CORS da API já libera a origem de NEXT_PUBLIC_API_URL/WEB_APP_URL.
 */
import { API_URL } from "./api-url";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  /** Ausente só faz sentido pra rotas sem tenant ainda, tipo /signup. */
  clinicSlug?: string;
  token?: string;
  body?: unknown;
};

async function request<T>(path: string, opts: RequestOptions): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(opts.clinicSlug ? { "x-clinic-slug": opts.clinicSlug } : {}),
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}) as { message?: string });
    throw new ApiError(res.status, data.message ?? `Erro ${res.status} ao falar com a API.`);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

/* --- tipos --------------------------------------------------------------- */

export type PublicProfessional = {
  id: string;
  specialty: string | null;
  croNumber: string | null;
  bio: string | null;
  user: { name: string };
};

export type BookableDay = { iso: string; semana: string; numero: string; livre: boolean };
export type AvailabilitySlot = { hora: string; livre: boolean };

export type AppointmentStatus =
  | "SCHEDULED"
  | "CONFIRMED"
  | "WAITING"
  | "FILLING_FORM"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW";

export type AgendaAppointment = {
  id: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  source: string;
  patient: { id: string; name: string };
  professional: { id: string; user: { name: string } };
};

export type Patient = {
  id: string;
  name: string;
  cpf: string | null;
  rg: string | null;
  birthDate: string | null;
  phone: string | null;
  email: string | null;
  consentLGPDAt: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  addressNeighborhood: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZip: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelationship: string | null;
  createdAt: string;
};

export type StaffProfessional = {
  id: string;
  croNumber: string | null;
  specialty: string | null;
  color: string | null;
  bio: string | null;
  user: { name: string; email: string };
};

export type TransactionType = "INCOME" | "EXPENSE";

export type PaymentMethod = "PIX" | "CARD" | "CASH";

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  PIX: "PIX",
  CARD: "Cartão",
  CASH: "Dinheiro",
};

export type Transaction = {
  id: string;
  type: TransactionType;
  category: string;
  description: string | null;
  amountCents: number;
  dueDate: string;
  paidAt: string | null;
  paymentMethod: PaymentMethod | null;
  feeCents: number;
  settledAt: string | null;
  installmentNumber: number | null;
  installmentTotal: number | null;
  professional: { id: string; user: { name: string } } | null;
  invoice: { status: string } | null;
};

export type CashFlowSummary = {
  totalIncomeCents: number;
  totalFeesCents: number;
  netIncomeCents: number;
  settledIncomeCents: number;
  pendingSettlementCents: number;
  totalExpenseCents: number;
  balanceCents: number;
  pendingIncomeCents: number;
  pendingExpenseCents: number;
};

export type CardSettings = { cardFeeBasisPoints: number; cardSettlementDays: number };

/**
 * Rótulos de enum do banco. O status vinha direto para a tela com
 * `.toLowerCase()`, então a clínica lia "NF-e failed" e "Contrato pending" —
 * justamente nos estados de erro, quando o usuário mais precisa entender o que
 * aconteceu.
 */
export type InvoiceStatus = "ISSUED" | "PROCESSING" | "FAILED" | "CANCELLED";

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  ISSUED: "emitida",
  PROCESSING: "em processamento",
  FAILED: "falhou",
  CANCELLED: "cancelada",
};

export type ContractStatus = "PENDING" | "SIGNED" | "DECLINED";

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  PENDING: "aguardando assinatura",
  SIGNED: "assinado",
  DECLINED: "recusado",
};

/* --- agendamento público --------------------------------------------------- */

export function getPublicClinic(clinicSlug: string) {
  return request<{ name: string; slug: string; timezone: string }>("/public/clinic", { clinicSlug });
}

export function getPublicProfessionals(clinicSlug: string) {
  return request<PublicProfessional[]>("/public/professionals", { clinicSlug });
}

/** `from` (YYYY-MM-DD) desloca a janela de dias para frente — navegação por semana. */
export function getBookableDays(clinicSlug: string, professionalId: string, from?: string) {
  const query = from ? `&from=${from}` : "";
  return request<BookableDay[]>(`/public/days?professionalId=${professionalId}${query}`, { clinicSlug });
}

export function getAvailability(clinicSlug: string, professionalId: string, date: string) {
  return request<AvailabilitySlot[]>(`/public/availability?professionalId=${professionalId}&date=${date}`, {
    clinicSlug,
  });
}

export function createPublicAppointment(
  clinicSlug: string,
  input: {
    professionalId: string;
    date: string;
    time: string;
    patientName: string;
    patientPhone: string;
    patientEmail?: string;
    consentLGPD: boolean;
  },
) {
  return request<{ id: string; startAt: string; professional: { user: { name: string } } }>(
    "/public/appointments",
    { clinicSlug, method: "POST", body: input },
  );
}

/* --- autenticação staff ---------------------------------------------------- */

export function loginStaff(clinicSlug: string, email: string, password: string) {
  return request<{
    accessToken: string;
    refreshToken: string;
    user: { id: string; name: string; email: string; role: string };
  }>("/auth/login", { clinicSlug, method: "POST", body: { email, password } });
}

export function refreshStaffSession(clinicSlug: string, refreshToken: string) {
  return request<{ accessToken: string }>("/auth/refresh", {
    clinicSlug,
    method: "POST",
    body: { refreshToken },
  });
}

/* --- autenticação do dono da plataforma (sem clínica nenhuma envolvida) ----- */

export function loginPlatformAdmin(email: string, password: string) {
  return request<{
    accessToken: string;
    refreshToken: string;
    user: { id: string; name: string; email: string };
  }>("/auth/admin/login", { method: "POST", body: { email, password } });
}

export function refreshPlatformSession(refreshToken: string) {
  return request<{ accessToken: string }>("/auth/admin/refresh", { method: "POST", body: { refreshToken } });
}

/* --- painel do dono da plataforma ------------------------------------------- */

export type ClinicSubscriptionStatus = {
  blocked: boolean;
  manuallySuspended: boolean;
  daysSinceLastPayment: number;
  delinquent: boolean;
};

export type PlatformClinic = {
  id: string;
  name: string;
  slug: string;
  plan: string | null;
  createdAt: string;
  lastPaymentAt: string | null;
  manuallySuspendedAt: string | null;
  manuallySuspendedReason: string | null;
  _count: { memberships: number; patients: number };
  subscription: ClinicSubscriptionStatus;
};

export type PlatformSettings = {
  delinquencyGracePeriodDays: number;
};

export function getPlatformClinics(token: string) {
  return request<PlatformClinic[]>("/platform-admin/clinics", { token });
}

export function registerClinicPayment(token: string, clinicId: string) {
  return request<void>(`/platform-admin/clinics/${clinicId}/register-payment`, { token, method: "POST" });
}

export function suspendClinic(token: string, clinicId: string, reason?: string) {
  return request<void>(`/platform-admin/clinics/${clinicId}/suspend`, {
    token,
    method: "PATCH",
    body: { reason },
  });
}

export function reactivateClinic(token: string, clinicId: string) {
  return request<void>(`/platform-admin/clinics/${clinicId}/reactivate`, { token, method: "PATCH" });
}

export function getPlatformSettings(token: string) {
  return request<PlatformSettings>("/platform-admin/settings", { token });
}

export function updatePlatformSettings(token: string, delinquencyGracePeriodDays: number) {
  return request<PlatformSettings>("/platform-admin/settings", {
    token,
    method: "PUT",
    body: { delinquencyGracePeriodDays },
  });
}

/* --- painel de gestão da clínica -------------------------------------------- */

export type DashboardOverview = {
  periodo: { from: string; to: string };
  faturamento: {
    recebidoCents: number;
    taxasCents: number;
    liquidoCents: number;
    despesaPagaCents: number;
    saldoCents: number;
    aReceberCents: number;
    porMes: { mes: string; receitaCents: number; despesaCents: number }[];
    porForma: { metodo: PaymentMethod | "SEM_REGISTRO"; totalCents: number }[];
  };
  agenda: {
    total: number;
    concluidas: number;
    faltas: number;
    canceladas: number;
    taxaFaltaPct: number;
    porMes: { mes: string; total: number; faltas: number }[];
  };
  profissionais: { id: string; nome: string; receitaCents: number; atendimentos: number; comissaoCents: number }[];
  orcamentos: {
    totalCents: number;
    aprovadoCents: number;
    pendenteCents: number;
    recusadoCents: number;
    qtdTotal: number;
    qtdAprovado: number;
    taxaConversaoPct: number;
  };
};

export function getDashboardOverview(clinicSlug: string, token: string, range: { from: string; to: string }) {
  return request<DashboardOverview>(`/dashboard/overview?from=${range.from}&to=${range.to}`, {
    clinicSlug,
    token,
  });
}

/* --- painel de gestão da plataforma ----------------------------------------- */

export type PlatformMetrics = {
  clinicas: { total: number; emDia: number; inadimplentes: number; suspensas: number };
  novasPorMes: { mes: string; total: number }[];
  porPlano: { plano: string; total: number }[];
  agregados: { pacientes: number; profissionais: number; consultasNoMes: number };
};

export function getPlatformMetrics(token: string) {
  return request<PlatformMetrics>("/platform-admin/metrics", { token });
}

/* --- agenda interna --------------------------------------------------------- */

/** `dias` > 1 traz o intervalo inteiro numa consulta só — usado pela visão de semana. */
export function getAgenda(clinicSlug: string, token: string, date: string, dias = 1) {
  return request<AgendaAppointment[]>(`/scheduling/agenda?date=${date}&days=${dias}`, { clinicSlug, token });
}

export function createInternalAppointment(
  clinicSlug: string,
  token: string,
  // `date` ("YYYY-MM-DD") e `time` ("HH:mm") separados, no fuso da clínica —
  // quem monta o instante é a API. Ver CreateAppointmentDto.
  input: {
    patientId: string;
    professionalId: string;
    date: string;
    time: string;
    durationMinutes?: number;
    notes?: string;
  },
) {
  return request<AgendaAppointment>("/scheduling/appointments", {
    clinicSlug,
    token,
    method: "POST",
    body: input,
  });
}

export function updateAppointmentStatus(
  clinicSlug: string,
  token: string,
  appointmentId: string,
  status: AppointmentStatus,
) {
  return request<AgendaAppointment>(`/scheduling/appointments/${appointmentId}/status`, {
    clinicSlug,
    token,
    method: "PATCH",
    body: { status },
  });
}

/* --- pacientes (staff) -------------------------------------------------------- */

/** Uma página de resultados, com o total para a tela poder dizer "1 de 12". */
export type Pagina<T> = {
  itens: T[];
  total: number;
  page: number;
  pageSize: number;
  totalDePaginas: number;
};

/** Listagem paginada — a tela de Pacientes. Para preencher um seletor, use `getPatientOptions`. */
export function getPatients(
  clinicSlug: string,
  token: string,
  search?: string,
  paginacao: { page?: number; pageSize?: number } = {},
) {
  const query = new URLSearchParams();
  if (search) query.set("search", search);
  if (paginacao.page) query.set("page", String(paginacao.page));
  if (paginacao.pageSize) query.set("pageSize", String(paginacao.pageSize));
  const sufixo = query.toString();
  return request<Pagina<Patient>>(`/patients${sufixo ? `?${sufixo}` : ""}`, { clinicSlug, token });
}

export type PatientOption = { id: string; name: string };

/**
 * Id e nome de todos os pacientes, para seletor. Não é paginado de propósito —
 * `<select>` com 25 de 900 esconde quem se procura. `truncado` avisa quando a
 * clínica passou do teto e precisa de um seletor com busca.
 */
export function getPatientOptions(clinicSlug: string, token: string) {
  return request<{ itens: PatientOption[]; truncado: boolean }>("/patients/opcoes", {
    clinicSlug,
    token,
  });
}

export function createPatient(
  clinicSlug: string,
  token: string,
  input: { name: string; phone?: string; email?: string; cpf?: string; birthDate?: string },
) {
  return request<Patient>("/patients", { clinicSlug, token, method: "POST", body: input });
}

export function getPatient(clinicSlug: string, token: string, id: string) {
  return request<Patient>(`/patients/${id}`, { clinicSlug, token });
}

export function updatePatient(
  clinicSlug: string,
  token: string,
  id: string,
  input: Partial<{
    name: string;
    phone: string;
    email: string;
    cpf: string;
    rg: string;
    birthDate: string;
    addressStreet: string;
    addressNumber: string;
    addressComplement: string;
    addressNeighborhood: string;
    addressCity: string;
    addressState: string;
    addressZip: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    emergencyContactRelationship: string;
  }>,
) {
  return request<Patient>(`/patients/${id}`, { clinicSlug, token, method: "PATCH", body: input });
}

/* --- ficha de anamnese: odontograma, periograma, anamnese, plano de tratamento --- */

/** Numeração FDI, em duas arcadas (visão de "sorriso"), pra desenhar o mapa dentário. */
export const TOOTH_ROWS: number[][] = [
  [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28],
  [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38],
];

export const TOOTH_CONDITION_LABEL: Record<string, string> = {
  HEALTHY: "Saudável",
  CARIES: "Cárie",
  RESTORED: "Restaurado",
  MISSING: "Ausente",
  CROWN: "Coroa",
  IMPLANT: "Implante",
  ROOT_CANAL: "Canal",
  EXTRACTION_INDICATED: "Extração indicada",
};

export type ToothCondition = keyof typeof TOOTH_CONDITION_LABEL;

/* --- evolução clínica (prontuário) ---------------------------------------- */

/** `ANAMNESIS` existe no enum do banco mas é gravada pela ficha própria, não aqui. */
export type ClinicalRecordType = "EVOLUTION" | "EXAM";

export const CLINICAL_RECORD_TYPE_LABEL: Record<ClinicalRecordType, string> = {
  EVOLUTION: "Evolução",
  EXAM: "Exame",
};

export type ClinicalRecord = {
  id: string;
  type: ClinicalRecordType;
  content: string;
  createdAt: string;
  appointmentId: string | null;
  professionalSignature: string | null;
  professionalSignedAt: string | null;
  patientSignature: string | null;
  patientSignedAt: string | null;
  professional: { user: { name: string } };
};

export function getClinicalRecords(clinicSlug: string, token: string, patientId: string) {
  return request<ClinicalRecord[]>(`/clinical-records?patientId=${patientId}`, { clinicSlug, token });
}

export function createClinicalRecord(
  clinicSlug: string,
  token: string,
  input: {
    patientId: string;
    type: ClinicalRecordType;
    content: string;
    appointmentId?: string;
    professionalSignature?: string;
    patientSignature?: string;
  },
) {
  return request<ClinicalRecord>("/clinical-records", { clinicSlug, token, method: "POST", body: input });
}

export type OdontogramEntry = {
  toothNumber: number;
  condition: ToothCondition;
  faces: string | null;
  notes: string | null;
  updatedAt: string;
};

export function getOdontogram(clinicSlug: string, token: string, patientId: string) {
  return request<OdontogramEntry[]>(`/clinical-records/odontogram?patientId=${patientId}`, { clinicSlug, token });
}

export function upsertOdontogramEntry(
  clinicSlug: string,
  token: string,
  input: { patientId: string; toothNumber: number; condition: ToothCondition; faces?: string; notes?: string },
) {
  return request<OdontogramEntry>("/clinical-records/odontogram", {
    clinicSlug,
    token,
    method: "PUT",
    body: input,
  });
}

export type PeriodontalEntry = {
  toothNumber: number;
  probingDepthBuccalMesial: number | null;
  probingDepthBuccalCentral: number | null;
  probingDepthBuccalDistal: number | null;
  probingDepthLingualMesial: number | null;
  probingDepthLingualCentral: number | null;
  probingDepthLingualDistal: number | null;
  mobility: number | null;
  recession: number | null;
  bleeding: boolean;
  notes: string | null;
  updatedAt: string;
};

export function getPeriodontogram(clinicSlug: string, token: string, patientId: string) {
  return request<PeriodontalEntry[]>(`/clinical-records/periodontogram?patientId=${patientId}`, {
    clinicSlug,
    token,
  });
}

export function upsertPeriodontalEntry(
  clinicSlug: string,
  token: string,
  input: {
    patientId: string;
    toothNumber: number;
    probingDepthBuccalMesial?: number;
    probingDepthBuccalCentral?: number;
    probingDepthBuccalDistal?: number;
    probingDepthLingualMesial?: number;
    probingDepthLingualCentral?: number;
    probingDepthLingualDistal?: number;
    mobility?: number;
    recession?: number;
    bleeding?: boolean;
    notes?: string;
  },
) {
  return request<PeriodontalEntry>("/clinical-records/periodontogram", {
    clinicSlug,
    token,
    method: "PUT",
    body: input,
  });
}

export type Anamnesis = {
  chiefComplaint: string | null;
  expectedOutcome: string | null;
  hasHypertension: boolean;
  hasDiabetes: boolean;
  hasHeartCondition: boolean;
  hasBleedingDisorder: boolean;
  isPregnant: boolean;
  isSmoker: boolean;
  hasChronicKidneyDisease: boolean;
  hasCancerOrImmunosuppression: boolean;
  hasAllergies: boolean;
  allergyDetails: string | null;
  currentMedications: string | null;
  previousSurgeries: string | null;
  otherHealthNotes: string | null;
  brushingFrequencyPerDay: number | null;
  flossesRegularly: boolean;
  usesMouthwash: boolean;
  hasBruxism: boolean;
  oralHygieneNotes: string | null;
  treatmentConsentAt: string | null;
  imageUseConsentAt: string | null;
} | null;

export function getAnamnesis(clinicSlug: string, token: string, patientId: string) {
  return request<Anamnesis>(`/clinical-records/anamnesis?patientId=${patientId}`, { clinicSlug, token });
}

export function upsertAnamnesis(
  clinicSlug: string,
  token: string,
  input: { patientId: string } & Partial<Omit<NonNullable<Anamnesis>, "treatmentConsentAt" | "imageUseConsentAt">> & {
      treatmentConsent?: boolean;
      imageUseConsent?: boolean;
    },
) {
  return request<Anamnesis>("/clinical-records/anamnesis", { clinicSlug, token, method: "PUT", body: input });
}

export type TreatmentPlanOption = {
  id: string;
  label: string;
  description: string;
  estimatedCostCents: number | null;
  recommended: boolean;
  professionalId: string | null;
  professional: { user: { name: string } } | null;
  createdAt: string;
};

export function getTreatmentPlanOptions(clinicSlug: string, token: string, patientId: string) {
  return request<TreatmentPlanOption[]>(`/clinical-records/treatment-plan-options?patientId=${patientId}`, {
    clinicSlug,
    token,
  });
}

export function createTreatmentPlanOption(
  clinicSlug: string,
  token: string,
  input: {
    patientId: string;
    professionalId?: string;
    label: string;
    description: string;
    estimatedCostCents?: number;
    recommended?: boolean;
  },
) {
  return request<TreatmentPlanOption>("/clinical-records/treatment-plan-options", {
    clinicSlug,
    token,
    method: "POST",
    body: input,
  });
}

export function updateTreatmentPlanOption(
  clinicSlug: string,
  token: string,
  id: string,
  input: Partial<{
    professionalId: string;
    label: string;
    description: string;
    estimatedCostCents: number;
    recommended: boolean;
  }>,
) {
  return request<TreatmentPlanOption>(`/clinical-records/treatment-plan-options/${id}`, {
    clinicSlug,
    token,
    method: "PATCH",
    body: input,
  });
}

export function deleteTreatmentPlanOption(clinicSlug: string, token: string, id: string) {
  return request<void>(`/clinical-records/treatment-plan-options/${id}`, { clinicSlug, token, method: "DELETE" });
}

/* --- profissionais (staff) ---------------------------------------------------- */

export function getStaffProfessionals(clinicSlug: string, token: string) {
  return request<StaffProfessional[]>("/professionals", { clinicSlug, token });
}

export function getStaffProfessional(clinicSlug: string, token: string, id: string) {
  return request<StaffProfessional & { croNumber: string | null }>(`/professionals/${id}`, { clinicSlug, token });
}

export function createProfessional(
  clinicSlug: string,
  token: string,
  input: { name: string; email: string; password?: string; croNumber?: string; specialty?: string; bio?: string },
) {
  return request<StaffProfessional>("/professionals", { clinicSlug, token, method: "POST", body: input });
}

export function updateProfessional(
  clinicSlug: string,
  token: string,
  id: string,
  input: Partial<{ croNumber: string; specialty: string; bio: string; color: string }>,
) {
  return request<StaffProfessional>(`/professionals/${id}`, {
    clinicSlug,
    token,
    method: "PATCH",
    body: input,
  });
}

/* --- equipe / permissões (staff) ------------------------------------------------ */

export type TeamRole = "CLINIC_ADMIN" | "DENTIST" | "ASSISTANT";

export type TeamMember = {
  id: string;
  role: TeamRole;
  createdAt: string;
  user: {
    name: string;
    email: string;
    professional: { id: string; croNumber: string | null; specialty: string | null; color: string | null; bio: string | null } | null;
  };
};

export function getTeamMembers(clinicSlug: string, token: string) {
  return request<TeamMember[]>("/team", { clinicSlug, token });
}

export function createTeamMember(
  clinicSlug: string,
  token: string,
  input: {
    name: string;
    email: string;
    password?: string;
    role: TeamRole;
    /** Dá ficha de profissional a um admin — o dono que também atende. */
    atendePacientes?: boolean;
    croNumber?: string;
    specialty?: string;
    color?: string;
    bio?: string;
  },
) {
  return request<TeamMember>("/team", { clinicSlug, token, method: "POST", body: input });
}

export function updateTeamMemberRole(clinicSlug: string, token: string, membershipId: string, role: TeamRole) {
  return request<TeamMember>(`/team/${membershipId}/role`, { clinicSlug, token, method: "PATCH", body: { role } });
}

export function removeTeamMember(clinicSlug: string, token: string, membershipId: string) {
  return request<void>(`/team/${membershipId}`, { clinicSlug, token, method: "DELETE" });
}

/* --- financeiro (staff) -------------------------------------------------------- */

export function getTransactions(
  clinicSlug: string,
  token: string,
  range: { from: string; to: string },
) {
  return request<Transaction[]>(`/finance/transactions?from=${range.from}&to=${range.to}`, {
    clinicSlug,
    token,
  });
}

export function getCashFlowSummary(clinicSlug: string, token: string, range: { from: string; to: string }) {
  return request<CashFlowSummary>(`/finance/summary?from=${range.from}&to=${range.to}`, { clinicSlug, token });
}

export function createTransaction(
  clinicSlug: string,
  token: string,
  input: {
    type: TransactionType;
    category: string;
    description?: string;
    amountCents: number;
    dueDate: string;
    professionalId?: string;
    /** > 1 divide o valor TOTAL em N parcelas mensais. */
    installments?: number;
  },
) {
  return request<Transaction>("/finance/transactions", { clinicSlug, token, method: "POST", body: input });
}

export function getCardSettings(clinicSlug: string, token: string) {
  return request<CardSettings>("/finance/card-settings", { clinicSlug, token });
}

export function updateCardSettings(clinicSlug: string, token: string, input: CardSettings) {
  return request<CardSettings>("/finance/card-settings", { clinicSlug, token, method: "PUT", body: input });
}

/**
 * Dias e expediente da clínica. `workingWeekdays` usa o padrão de
 * `Date#getDay()` (0 = domingo … 6 = sábado) e os horários são minutos desde a
 * meia-noite (480 = 08:00).
 */
export type SchedulingSettings = {
  workingWeekdays: number[];
  morningStartMinutes: number;
  morningEndMinutes: number;
  afternoonStartMinutes: number;
  afternoonEndMinutes: number;
  slotDurationMinutes: number;
};

export function getSchedulingSettings(clinicSlug: string, token: string) {
  return request<SchedulingSettings>("/scheduling/settings", { clinicSlug, token });
}

export function updateSchedulingSettings(clinicSlug: string, token: string, input: SchedulingSettings) {
  return request<SchedulingSettings>("/scheduling/settings", { clinicSlug, token, method: "PUT", body: input });
}

export function markTransactionPaid(
  clinicSlug: string,
  token: string,
  id: string,
  paymentMethod: PaymentMethod,
) {
  return request<Transaction>(`/finance/transactions/${id}/pay`, {
    clinicSlug,
    token,
    method: "PATCH",
    body: { paymentMethod },
  });
}

export type CommissionRule = { professionalId: string; percentageBasisPoints: number };

export function getCommissionRules(clinicSlug: string, token: string) {
  return request<CommissionRule[]>("/finance/commission-rules", { clinicSlug, token });
}

export type CommissionEntry = {
  id: string;
  amountCents: number;
  createdAt: string;
  professional: { id: string; user: { name: string } };
  transaction: {
    category: string;
    dueDate: string;
    paidAt: string | null;
    amountCents: number;
    patient: { name: string } | null;
  };
};

/** Fechamento de comissão do período — quanto cada profissional tem a receber. */
export type CommissionReport = {
  totalCents: number;
  porProfissional: { professionalId: string; nome: string; totalCents: number; quantidade: number }[];
  entries: CommissionEntry[];
};

export function getCommissionReport(clinicSlug: string, token: string, from: string, to: string) {
  return request<CommissionReport>(`/finance/commission-report?from=${from}&to=${to}`, {
    clinicSlug,
    token,
  });
}

/* --- CRM (staff) --------------------------------------------------------------- */

export type OpportunityStage = "NEW" | "CONTACTED" | "BUDGET_SENT" | "NEGOTIATING" | "WON" | "LOST";

export type Opportunity = {
  id: string;
  title: string;
  stage: OpportunityStage;
  notes: string | null;
  patient: { id: string; name: string; phone: string | null };
  owner: { id: string; user: { name: string } } | null;
  budget: { id: string; status: string } | null;
};

export type PendingBudget = {
  id: string;
  patient: { id: string; name: string; phone: string | null };
  professional: { user: { name: string } };
  diasPendente: number;
  totalCents: number;
};

export function getOpportunities(clinicSlug: string, token: string) {
  return request<Opportunity[]>("/crm/opportunities", { clinicSlug, token });
}

export function getPendingBudgets(clinicSlug: string, token: string) {
  return request<PendingBudget[]>("/crm/pending-budgets", { clinicSlug, token });
}

export function createOpportunity(
  clinicSlug: string,
  token: string,
  input: { patientId: string; title: string; ownerId?: string; notes?: string },
) {
  return request<Opportunity>("/crm/opportunities", { clinicSlug, token, method: "POST", body: input });
}

export function updateOpportunity(
  clinicSlug: string,
  token: string,
  id: string,
  input: Partial<{ stage: OpportunityStage; title: string; notes: string; ownerId: string }>,
) {
  return request<Opportunity>(`/crm/opportunities/${id}`, { clinicSlug, token, method: "PATCH", body: input });
}

/* --- indicações (staff) --------------------------------------------------------- */

export type ReferralStatus = "PENDING" | "CONVERTED" | "REWARDED";

export type Referral = {
  id: string;
  referredName: string;
  referredPhone: string | null;
  status: ReferralStatus;
  rewardGranted: boolean;
  referrerPatient: { id: string; name: string };
  referredPatient: { id: string; name: string } | null;
};

export function getReferrals(clinicSlug: string, token: string) {
  return request<Referral[]>("/referrals", { clinicSlug, token });
}

export function createReferral(
  clinicSlug: string,
  token: string,
  input: { referrerPatientId: string; referredName: string; referredPhone?: string },
) {
  return request<Referral>("/referrals", { clinicSlug, token, method: "POST", body: input });
}

export function updateReferralStatus(
  clinicSlug: string,
  token: string,
  id: string,
  input: { status: ReferralStatus; rewardGranted?: boolean },
) {
  return request<Referral>(`/referrals/${id}/status`, { clinicSlug, token, method: "PATCH", body: input });
}

/* --- integrações (staff) ------------------------------------------------------- */

export type IntegrationKind = "WHATSAPP" | "AI_ASSISTANT" | "NFE" | "E_SIGNATURE" | "CREDIT_SCORE";

/**
 * O que a clínica vê: só as integrações que o dono da plataforma liberou, mais
 * o que é dela para preencher. Não existe rota de trocar provedor aqui — isso
 * é `/platform-admin/integrations`, e a API recusa, não é só a tela que esconde.
 */
export type ClinicIntegrationsView = {
  whatsappPhone: string | null;
  integrations: { kind: IntegrationKind; providerName: string }[];
};

export function getIntegrationsConfig(clinicSlug: string, token: string) {
  return request<ClinicIntegrationsView>("/integrations/config", { clinicSlug, token });
}

export function updateClinicIntegrationSettings(
  clinicSlug: string,
  token: string,
  input: { whatsappPhone: string | null },
) {
  return request<ClinicIntegrationsView>("/integrations/config/settings", {
    clinicSlug,
    token,
    method: "PUT",
    body: input,
  });
}

/* --- integrações (dono da plataforma) ------------------------------------------- */

export type PlatformClinicIntegrations = {
  id: string;
  name: string;
  slug: string;
  integrations: { kind: IntegrationKind; providerName: string; enabled: boolean }[];
};

export function getPlatformIntegrations(token: string) {
  return request<PlatformClinicIntegrations[]>("/platform-admin/integrations", { token });
}

export function releaseIntegration(
  token: string,
  clinicId: string,
  kind: IntegrationKind,
  input: { enabled: boolean; providerName?: string },
) {
  return request<{ kind: IntegrationKind; providerName: string; enabled: boolean }>(
    `/platform-admin/integrations/${clinicId}/${kind}`,
    { token, method: "PUT", body: input },
  );
}

/* --- serviços (procedimentos), estoque e materiais (staff) ----------------------- */

export type ProcedureMaterial = {
  id: string;
  quantityUsed: number;
  inventoryItem: { id: string; name: string; unit: string; unitCostCents: number };
};

export type ProcedurePrescriptionItem = {
  id: string;
  medicationId: string | null;
  medication: Medication | null;
  customName: string | null;
  posology: string;
  instructions: string | null;
  order: number;
};

export type Procedure = {
  id: string;
  name: string;
  code: string | null;
  defaultPriceCents: number;
  active: boolean;
  materials: ProcedureMaterial[];
  prescriptionItems: ProcedurePrescriptionItem[];
  estimatedCostCents: number;
};

export type InventoryItem = {
  id: string;
  name: string;
  unit: string;
  unitCostCents: number;
  quantityOnHand: number;
  quantityReserved: number;
  minQuantity: number;
  available: number;
  needsRestock: boolean;
};

export type InventoryMovement = {
  id: string;
  type: "MANUAL_IN" | "MANUAL_OUT" | "RESERVED" | "RELEASED" | "CONSUMED";
  quantity: number;
  note: string | null;
  budgetItemId: string | null;
  createdAt: string;
};

export function getProcedures(clinicSlug: string, token: string) {
  return request<Procedure[]>("/procedures", { clinicSlug, token });
}

export function getProcedure(clinicSlug: string, token: string, id: string) {
  return request<Procedure>(`/procedures/${id}`, { clinicSlug, token });
}

export function createProcedure(
  clinicSlug: string,
  token: string,
  input: { name: string; code?: string; defaultPriceCents: number },
) {
  return request<Procedure>("/procedures", { clinicSlug, token, method: "POST", body: input });
}

export function updateProcedure(
  clinicSlug: string,
  token: string,
  id: string,
  input: Partial<{ name: string; code: string; defaultPriceCents: number; active: boolean }>,
) {
  return request<Procedure>(`/procedures/${id}`, { clinicSlug, token, method: "PATCH", body: input });
}

export function deleteProcedure(clinicSlug: string, token: string, id: string) {
  return request<void>(`/procedures/${id}`, { clinicSlug, token, method: "DELETE" });
}

export function addProcedureMaterial(
  clinicSlug: string,
  token: string,
  procedureId: string,
  input: { inventoryItemId: string; quantityUsed: number },
) {
  return request<ProcedureMaterial>(`/procedures/${procedureId}/materials`, {
    clinicSlug,
    token,
    method: "POST",
    body: input,
  });
}

export function updateProcedureMaterial(
  clinicSlug: string,
  token: string,
  procedureId: string,
  materialId: string,
  quantityUsed: number,
) {
  return request<ProcedureMaterial>(`/procedures/${procedureId}/materials/${materialId}`, {
    clinicSlug,
    token,
    method: "PATCH",
    body: { quantityUsed },
  });
}

export function removeProcedureMaterial(clinicSlug: string, token: string, procedureId: string, materialId: string) {
  return request<void>(`/procedures/${procedureId}/materials/${materialId}`, {
    clinicSlug,
    token,
    method: "DELETE",
  });
}

export function addProcedurePrescriptionItem(
  clinicSlug: string,
  token: string,
  procedureId: string,
  input: { medicationId?: string; customName?: string; posology: string; instructions?: string },
) {
  return request<ProcedurePrescriptionItem>(`/procedures/${procedureId}/prescription-items`, {
    clinicSlug,
    token,
    method: "POST",
    body: input,
  });
}

export function updateProcedurePrescriptionItem(
  clinicSlug: string,
  token: string,
  procedureId: string,
  itemId: string,
  input: Partial<{ posology: string; instructions: string }>,
) {
  return request<ProcedurePrescriptionItem>(`/procedures/${procedureId}/prescription-items/${itemId}`, {
    clinicSlug,
    token,
    method: "PATCH",
    body: input,
  });
}

export function removeProcedurePrescriptionItem(
  clinicSlug: string,
  token: string,
  procedureId: string,
  itemId: string,
) {
  return request<void>(`/procedures/${procedureId}/prescription-items/${itemId}`, {
    clinicSlug,
    token,
    method: "DELETE",
  });
}

export function getInventoryItems(clinicSlug: string, token: string) {
  return request<InventoryItem[]>("/inventory-items", { clinicSlug, token });
}

export function getInventoryItem(clinicSlug: string, token: string, id: string) {
  return request<InventoryItem>(`/inventory-items/${id}`, { clinicSlug, token });
}

export function createInventoryItem(
  clinicSlug: string,
  token: string,
  input: { name: string; unit: string; unitCostCents?: number; quantityOnHand?: number; minQuantity?: number },
) {
  return request<InventoryItem>("/inventory-items", { clinicSlug, token, method: "POST", body: input });
}

export function updateInventoryItem(
  clinicSlug: string,
  token: string,
  id: string,
  input: Partial<{ name: string; unit: string; unitCostCents: number; minQuantity: number }>,
) {
  return request<InventoryItem>(`/inventory-items/${id}`, { clinicSlug, token, method: "PATCH", body: input });
}

export function deleteInventoryItem(clinicSlug: string, token: string, id: string) {
  return request<void>(`/inventory-items/${id}`, { clinicSlug, token, method: "DELETE" });
}

export function adjustInventoryItem(
  clinicSlug: string,
  token: string,
  id: string,
  input: { direction: "IN" | "OUT"; quantity: number; note?: string },
) {
  return request<InventoryItem>(`/inventory-items/${id}/adjust`, { clinicSlug, token, method: "POST", body: input });
}

export function getInventoryMovements(clinicSlug: string, token: string, id: string) {
  return request<InventoryMovement[]>(`/inventory-items/${id}/movements`, { clinicSlug, token });
}

export type InventoryReportItem = {
  inventoryItemId: string;
  name: string;
  unit: string;
  manualInQuantity: number;
  manualInCostCents: number;
  manualOutQuantity: number;
  manualOutCostCents: number;
  reservedQuantity: number;
  releasedQuantity: number;
  consumedQuantity: number;
  consumedCostCents: number;
  currentQuantityOnHand: number;
  currentQuantityReserved: number;
  minQuantity: number;
  needsRestock: boolean;
};

export type InventoryReport = {
  from: string;
  to: string;
  totals: {
    manualInQuantity: number;
    manualInCostCents: number;
    manualOutQuantity: number;
    manualOutCostCents: number;
    reservedQuantity: number;
    releasedQuantity: number;
    consumedQuantity: number;
    consumedCostCents: number;
  };
  items: InventoryReportItem[];
};

export function getInventoryReport(clinicSlug: string, token: string, range: { from: string; to: string }) {
  return request<InventoryReport>(`/inventory-items/report?from=${range.from}&to=${range.to}`, { clinicSlug, token });
}

/* --- orçamentos e contratos (staff) --------------------------------------------- */

export type Budget = {
  id: string;
  status: "PENDING" | "APPROVED" | "DECLINED" | "EXPIRED";
  createdAt: string;
  professional: { id: string; user: { name: string } };
  items: {
    id: string;
    quantity: number;
    unitPriceCents: number;
    procedure: { name: string };
    materialsReservedAt: string | null;
    executedAt: string | null;
  }[];
};

export type Contract = {
  id: string;
  status: "PENDING" | "SIGNED" | "DECLINED";
  content: string;
  signedAt: string | null;
} | null;

export function getBudgetsForPatient(clinicSlug: string, token: string, patientId: string) {
  return request<Budget[]>(`/budgets?patientId=${patientId}`, { clinicSlug, token });
}

export function createBudget(
  clinicSlug: string,
  token: string,
  input: { patientId: string; professionalId: string; items: { procedureId: string; quantity?: number }[] },
) {
  return request<Budget>("/budgets", { clinicSlug, token, method: "POST", body: input });
}

export function updateBudgetStatus(
  clinicSlug: string,
  token: string,
  id: string,
  status: Budget["status"],
  /** Condição de pagamento — lida só ao APROVAR, e só na primeira vez. */
  pagamento: { installments?: number; firstDueDate?: string } = {},
) {
  return request<Budget>(`/budgets/${id}/status`, {
    clinicSlug,
    token,
    method: "PATCH",
    body: { status, ...pagamento },
  });
}

export function executeBudgetItem(clinicSlug: string, token: string, budgetId: string, itemId: string) {
  return request<Budget["items"][number]>(`/budgets/${budgetId}/items/${itemId}/execute`, {
    clinicSlug,
    token,
    method: "PATCH",
  });
}

export function getContract(clinicSlug: string, token: string, budgetId: string) {
  return request<Contract>(`/budgets/${budgetId}/contract`, { clinicSlug, token });
}

export function generateContract(clinicSlug: string, token: string, budgetId: string) {
  return request<Contract>(`/budgets/${budgetId}/contract`, { clinicSlug, token, method: "POST" });
}

/* --- atestados (comparecimento / médico) — staff --------------------------------- */

export type Certificate = {
  id: string;
  type: "ATTENDANCE" | "MEDICAL";
  beneficiary: "PATIENT" | "COMPANION";
  companionName: string | null;
  visitDate: string;
  arrivalTime: string | null;
  departureTime: string | null;
  daysOff: number | null;
  cidCode: string | null;
  content: string;
  createdAt: string;
  professional: { croNumber: string | null; user: { name: string } };
};

export function getCertificates(clinicSlug: string, token: string, patientId: string) {
  return request<Certificate[]>(`/certificates?patientId=${patientId}`, { clinicSlug, token });
}

export function getCertificate(clinicSlug: string, token: string, id: string) {
  return request<Certificate>(`/certificates/${id}`, { clinicSlug, token });
}

export function createCertificate(
  clinicSlug: string,
  token: string,
  input: {
    patientId: string;
    professionalId: string;
    type: "ATTENDANCE" | "MEDICAL";
    beneficiary?: "PATIENT" | "COMPANION";
    companionName?: string;
    visitDate: string;
    arrivalTime?: string;
    departureTime?: string;
    daysOff?: number;
    cidCode?: string;
  },
) {
  return request<Certificate>("/certificates", { clinicSlug, token, method: "POST", body: input });
}

export function deleteCertificate(clinicSlug: string, token: string, id: string) {
  return request<void>(`/certificates/${id}`, { clinicSlug, token, method: "DELETE" });
}

/* --- receitas (staff) ------------------------------------------------------------- */

export type MedicationClass = "ANALGESIC" | "NSAID" | "CORTICOSTEROID" | "ANTIBIOTIC" | "ANTISEPTIC";

export type RiskFlag =
  | "HYPERTENSION"
  | "DIABETES"
  | "HEART_CONDITION"
  | "BLEEDING_DISORDER"
  | "PREGNANT"
  | "CHRONIC_KIDNEY_DISEASE"
  | "CANCER_OR_IMMUNOSUPPRESSION";

export const RISK_FLAG_LABEL: Record<RiskFlag, string> = {
  HYPERTENSION: "Hipertensão",
  DIABETES: "Diabetes",
  HEART_CONDITION: "Problema cardíaco",
  BLEEDING_DISORDER: "Distúrbio de coagulação",
  PREGNANT: "Gestante",
  CHRONIC_KIDNEY_DISEASE: "Insuficiência renal crônica",
  CANCER_OR_IMMUNOSUPPRESSION: "Câncer/imunossupressão",
};

export type MedicationRiskNote = {
  riskFlag: RiskFlag;
  severity: "AVOID" | "CAUTION";
  note: string;
};

export type Medication = {
  id: string;
  name: string;
  class: MedicationClass;
  defaultPosology: string;
  notes: string | null;
  riskNotes: MedicationRiskNote[];
};

export function getMedications(clinicSlug: string, token: string) {
  return request<Medication[]>("/medications", { clinicSlug, token });
}

export type PrescriptionItem = {
  id: string;
  medicationName: string;
  posology: string;
  instructions: string | null;
  order: number;
};

export type Prescription = {
  id: string;
  notes: string | null;
  riskWarningsShown: string | null;
  content: string;
  createdAt: string;
  items: PrescriptionItem[];
  professional: { croNumber?: string | null; user: { name: string } };
};

export function getPrescriptions(clinicSlug: string, token: string, patientId: string) {
  return request<Prescription[]>(`/prescriptions?patientId=${patientId}`, { clinicSlug, token });
}

export function getPrescription(clinicSlug: string, token: string, id: string) {
  return request<Prescription>(`/prescriptions/${id}`, { clinicSlug, token });
}

export function createPrescription(
  clinicSlug: string,
  token: string,
  input: {
    patientId: string;
    appointmentId?: string;
    procedureId?: string;
    notes?: string;
    items: { medicationId?: string; customName?: string; posology: string; instructions?: string }[];
  },
) {
  return request<Prescription>("/prescriptions", { clinicSlug, token, method: "POST", body: input });
}

/* --- consulta de score (staff) --------------------------------------------------- */

export type CreditScoreQuery = { score: number; riskBand: "low" | "medium" | "high"; queriedAt: string } | null;

export function getCreditScore(clinicSlug: string, token: string, patientId: string) {
  return request<CreditScoreQuery>(`/patients/${patientId}/credit-score`, { clinicSlug, token });
}

export function queryCreditScore(clinicSlug: string, token: string, patientId: string, consent: boolean) {
  return request<CreditScoreQuery>(`/patients/${patientId}/credit-score`, {
    clinicSlug,
    token,
    method: "POST",
    body: { consent },
  });
}

/* --- notas fiscais (staff) -------------------------------------------------------- */

export type Invoice = { id: string; status: string; externalId: string } | null;

export function getInvoice(clinicSlug: string, token: string, transactionId: string) {
  return request<Invoice>(`/finance/transactions/${transactionId}/invoice`, { clinicSlug, token });
}

export function issueInvoice(clinicSlug: string, token: string, transactionId: string) {
  return request<Invoice>(`/finance/transactions/${transactionId}/invoice`, {
    clinicSlug,
    token,
    method: "POST",
  });
}

/* --- portal do paciente ------------------------------------------------------ */

export function loginPatient(clinicSlug: string, email: string) {
  return request<{ accessToken: string; patient: { id: string; name: string } }>("/auth/patient/login", {
    clinicSlug,
    method: "POST",
    body: { email },
  });
}

export function getPortalAppointments(clinicSlug: string, token: string) {
  return request<{ upcoming: AgendaAppointment | null; history: AgendaAppointment[] }>("/portal/appointments", {
    clinicSlug,
    token,
  });
}

/* --- documentos (staff) --------------------------------------------------------- */

export type DocumentType = "RADIOGRAPHY" | "PHOTO" | "CONTRACT" | "OTHER";

export type PatientDocument = {
  id: string;
  type: DocumentType;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

export function getDocuments(clinicSlug: string, token: string, patientId: string) {
  return request<PatientDocument[]>(`/documents?patientId=${patientId}`, { clinicSlug, token });
}

/* --- ortodontia (staff, Fase 5) --------------------------------------------------- */

export type OrthodonticApplianceType = "METALLIC_BRACKETS" | "CERAMIC_BRACKETS" | "ALIGNERS" | "OTHER";
export type OrthodonticTreatmentStatus = "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
export type OrthodonticStepStatus = "PENDING" | "DONE" | "SKIPPED";

export type OrthodonticStep = {
  id: string;
  sequence: number;
  description: string;
  scheduledFor: string | null;
  completedAt: string | null;
  status: OrthodonticStepStatus;
};

export type OrthodonticTreatment = {
  id: string;
  applianceType: OrthodonticApplianceType;
  status: OrthodonticTreatmentStatus;
  startedAt: string;
  notes: string | null;
  professional: { id: string; user: { name: string } };
  steps: OrthodonticStep[];
};

export function getOrthodonticTreatments(clinicSlug: string, token: string, patientId: string) {
  return request<OrthodonticTreatment[]>(`/orthodontics/treatments?patientId=${patientId}`, { clinicSlug, token });
}

export function createOrthodonticTreatment(
  clinicSlug: string,
  token: string,
  input: {
    patientId: string;
    professionalId: string;
    applianceType: OrthodonticApplianceType;
    startedAt: string;
    notes?: string;
    steps?: { description: string; scheduledFor?: string }[];
  },
) {
  return request<OrthodonticTreatment>("/orthodontics/treatments", { clinicSlug, token, method: "POST", body: input });
}

export function addOrthodonticStep(
  clinicSlug: string,
  token: string,
  treatmentId: string,
  input: { description: string; scheduledFor?: string },
) {
  return request<OrthodonticTreatment>(`/orthodontics/treatments/${treatmentId}/steps`, {
    clinicSlug,
    token,
    method: "POST",
    body: input,
  });
}

export function updateOrthodonticStepStatus(
  clinicSlug: string,
  token: string,
  stepId: string,
  status: OrthodonticStepStatus,
) {
  return request<OrthodonticTreatment>(`/orthodontics/steps/${stepId}/status`, {
    clinicSlug,
    token,
    method: "PATCH",
    body: { status },
  });
}

export function updateOrthodonticTreatmentStatus(
  clinicSlug: string,
  token: string,
  treatmentId: string,
  status: OrthodonticTreatmentStatus,
) {
  return request<OrthodonticTreatment>(`/orthodontics/treatments/${treatmentId}/status`, {
    clinicSlug,
    token,
    method: "PATCH",
    body: { status },
  });
}

/* --- faceograma (staff, Fase 5) --------------------------------------------------- */

export type FacialPlanning = {
  id: string;
  version: number;
  overlayData: unknown;
  notes: string | null;
  createdAt: string;
  document: { id: string; fileName: string; mimeType: string };
};

export function getFacialPlannings(clinicSlug: string, token: string, patientId: string) {
  return request<FacialPlanning[]>(`/faceogram?patientId=${patientId}`, { clinicSlug, token });
}

export function createFacialPlanning(
  clinicSlug: string,
  token: string,
  input: { patientId: string; documentId: string; overlayData: unknown[]; notes?: string },
) {
  return request<FacialPlanning>("/faceogram", { clinicSlug, token, method: "POST", body: input });
}

/* --- rede de clínicas / franquias (staff, Fase 6) --------------------------------- */

export type OrganizationClinic = { id: string; name: string; slug: string };
export type Organization = { id: string; name: string; slug: string; clinics: OrganizationClinic[] };

export function getCurrentOrganization(clinicSlug: string, token: string) {
  return request<{ organization: Organization | null; isOrgAdmin: boolean }>("/organizations/current", {
    clinicSlug,
    token,
  });
}

export function createOrganization(clinicSlug: string, token: string, input: { name: string; slug: string }) {
  return request<Organization>("/organizations", { clinicSlug, token, method: "POST", body: input });
}

export function joinOrganization(clinicSlug: string, token: string, organizationId: string) {
  return request<{ organization: Organization | null; isOrgAdmin: boolean }>("/organizations/join", {
    clinicSlug,
    token,
    method: "POST",
    body: { organizationId },
  });
}

export type OrganizationClinicMetrics = {
  clinic: OrganizationClinic;
  patients: number;
  appointmentsThisMonth: number;
  pendingBudgets: number;
  revenueThisMonthCents: number;
};

export type OrganizationDashboard = {
  clinics: OrganizationClinicMetrics[];
  totals: {
    patients: number;
    appointmentsThisMonth: number;
    pendingBudgets: number;
    revenueThisMonthCents: number;
  };
};

export function getOrganizationDashboard(clinicSlug: string, token: string) {
  return request<OrganizationDashboard>("/organizations/dashboard", { clinicSlug, token });
}

export function transferPatient(
  clinicSlug: string,
  token: string,
  input: { patientId: string; toClinicId: string },
) {
  return request<Patient>("/organizations/transfer-patient", { clinicSlug, token, method: "POST", body: input });
}

export function syncProcedures(clinicSlug: string, token: string, sourceClinicId: string) {
  return request<{ clinic: OrganizationClinic; created: number }[]>("/organizations/procedures/sync", {
    clinicSlug,
    token,
    method: "POST",
    body: { sourceClinicId },
  });
}

/* --- auto-cadastro de clínica (sem sessão, sem tenant) --------------------------- */

export function checkSlugAvailability(slug: string) {
  return request<{ available: boolean }>(`/signup/disponibilidade?slug=${encodeURIComponent(slug)}`, {});
}

export function signup(input: {
  clinicName: string;
  clinicSlug: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  plan?: "basic" | "plus" | "pro";
}) {
  return request<{
    accessToken: string;
    refreshToken: string;
    user: { id: string; name: string; email: string; role: string };
  }>("/signup", { method: "POST", body: input });
}
