import { NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

/**
 * Confere que um id recebido do CLIENTE pertence mesmo à clínica da sessão.
 *
 * O `TenantGuard` prova que o usuário pertence à clínica do slug — ele não
 * olha id nenhum que venha no corpo ou na URL. Sem esta checagem, mandar o
 * `patientId` de outra clínica fazia o Prisma trabalhar em cima do registro
 * dela: no caso da anamnese (cuja chave `patientId` é única GLOBAL), o upsert
 * devolvia e sobrescrevia o prontuário médico inteiro do paciente alheio.
 *
 * `NotFoundException` e não `Forbidden` de propósito: responder "existe, mas
 * não é sua" já confirma que aquele id existe em alguma clínica.
 */
export async function assertPacienteDaClinica(
  prisma: PrismaService,
  clinicId: string,
  patientId: string,
): Promise<void> {
  const paciente = await prisma.patient.findFirst({
    where: { id: patientId, clinicId },
    select: { id: true },
  });
  if (!paciente) {
    throw new NotFoundException("Paciente não encontrado nesta clínica.");
  }
}

/** Mesma ideia para `professionalId` — ver `assertPacienteDaClinica`. */
export async function assertProfissionalDaClinica(
  prisma: PrismaService,
  clinicId: string,
  professionalId: string,
): Promise<void> {
  const profissional = await prisma.professional.findFirst({
    where: { id: professionalId, clinicId },
    select: { id: true },
  });
  if (!profissional) {
    throw new NotFoundException("Profissional não encontrado nesta clínica.");
  }
}

/**
 * Mesma ideia para `appointmentId`, e também confere que é do MESMO paciente —
 * sem isso, um registro de evolução aceitaria o id de uma consulta de outro
 * paciente da mesma clínica, e a assinatura ficaria vinculada à consulta errada.
 */
export async function assertAgendamentoDoPaciente(
  prisma: PrismaService,
  clinicId: string,
  patientId: string,
  appointmentId: string,
): Promise<void> {
  const agendamento = await prisma.appointment.findFirst({
    where: { id: appointmentId, clinicId, patientId },
    select: { id: true },
  });
  if (!agendamento) {
    throw new NotFoundException("Consulta não encontrada para este paciente nesta clínica.");
  }
}
