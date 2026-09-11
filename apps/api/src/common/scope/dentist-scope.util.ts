import { Role } from "@odontoflow/db";
import type { AuthenticatedUser } from "../decorators/current-user.decorator";

/**
 * Papéis que podem atender paciente. O cargo define o acesso ADMINISTRATIVO;
 * quem define a identidade CLÍNICA é ter ficha de `Professional`. Por isso o
 * dono da clínica (CLINIC_ADMIN) entra aqui: é comum ele também atender, e
 * antes disso ele precisava escolher entre administrar e aparecer na agenda.
 * ASSISTANT fica de fora de propósito — recepção não atende.
 */
export const PAPEIS_CLINICOS: Role[] = [Role.DENTIST, Role.CLINIC_ADMIN, Role.ORG_ADMIN];

/**
 * Id que não casa com nenhum `Professional`. Usado quando o usuário é DENTIST
 * mas não tem ficha de profissional nesta clínica: nesse caso ele não pode ver
 * a agenda nem os pacientes de ninguém. Falhar fechado é de propósito — sem
 * isso, um dentista sem ficha cairia no caminho "sem filtro" e veria tudo.
 */
export const SEM_PROFISSIONAL = "__sem_profissional__";

/** O papel do usuário NESTA clínica (ele pode ter papéis diferentes em outras). */
export function papelNaClinica(user: AuthenticatedUser, clinicId: string): string | undefined {
  return user.memberships.find((m) => m.clinicId === clinicId)?.role;
}

/**
 * Dentista enxerga só o que é dele (agenda e pacientes que atendeu). Os demais
 * papéis da clínica continuam vendo tudo — recepção precisa da agenda inteira.
 */
export function ehDentista(user: AuthenticatedUser, clinicId: string): boolean {
  return papelNaClinica(user, clinicId) === "DENTIST";
}
