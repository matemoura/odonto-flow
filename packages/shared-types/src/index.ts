import { z } from "zod";

export const clinicSlugSchema = z
  .string()
  .min(3)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use apenas letras minúsculas, números e hífens.");

export const roleSchema = z.enum(["SUPER_ADMIN", "ORG_ADMIN", "CLINIC_ADMIN", "DENTIST", "ASSISTANT", "PATIENT"]);
export type RoleDto = z.infer<typeof roleSchema>;

export * from "./integration-config";
