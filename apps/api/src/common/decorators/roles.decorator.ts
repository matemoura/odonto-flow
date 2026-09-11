import { SetMetadata } from "@nestjs/common";
import { Role } from "@odontoflow/db";

export const ROLES_KEY = "roles";

/** Restringe o endpoint aos papéis (ClinicMembership.role) informados. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
