import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface AuthenticatedUser {
  userId: string;
  email: string;
  memberships: Array<{ clinicId: string; role: string }>;
  /** Presente só em tokens de paciente (role PATIENT), emitidos pelo login mock do portal. */
  patientId?: string;
  /** Presente só em tokens do dono da plataforma (ver SuperAdminGuard) — nunca tem clínica associada. */
  isSuperAdmin?: boolean;
}

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthenticatedUser => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
