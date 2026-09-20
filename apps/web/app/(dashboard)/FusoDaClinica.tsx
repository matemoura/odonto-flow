"use client";

import { createContext, useContext, type ReactNode } from "react";
import { FUSO_PADRAO } from "../../lib/datas";

/**
 * O fuso da clínica logada, disponível em qualquer componente do painel.
 *
 * Contexto e não prop: a data aparece em dezenas de telas, e passar o fuso de
 * mão em mão até cada seção da ficha do paciente significaria lembrar de fazer
 * isso em toda tela nova — exatamente o tipo de disciplina que falha em
 * silêncio, produzindo de novo a data de um dia atrás.
 */
const FusoContext = createContext<string>(FUSO_PADRAO);

export function FusoDaClinicaProvider({ fuso, children }: { fuso: string; children: ReactNode }) {
  return <FusoContext.Provider value={fuso}>{children}</FusoContext.Provider>;
}

export function useFusoDaClinica(): string {
  return useContext(FusoContext);
}
