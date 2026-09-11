import { Equals } from "class-validator";

export class QueryCreditScoreDto {
  /** Precisa vir explicitamente true — é o registro de consentimento do paciente para esta consulta específica. */
  @Equals(true, { message: "É necessário o consentimento do paciente para consultar o score." })
  consent!: boolean;
}
