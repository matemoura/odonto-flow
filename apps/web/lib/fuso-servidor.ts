import { getPublicClinic } from "./api";
import { FUSO_PADRAO } from "./datas";

/**
 * Fuso da clínica para Server Components, que não enxergam o contexto React
 * usado pelos componentes cliente (ver FusoDaClinica.tsx).
 *
 * Cai no padrão em vez de estourar: uma página inteira que não abre por causa
 * da formatação de data é pior do que a data sair no fuso errado.
 */
export async function fusoDaClinica(clinicSlug: string): Promise<string> {
  return getPublicClinic(clinicSlug)
    .then((clinic) => clinic.timezone)
    .catch(() => FUSO_PADRAO);
}
