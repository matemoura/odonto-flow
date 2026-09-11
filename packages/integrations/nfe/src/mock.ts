import { randomUUID } from "node:crypto";
import { NfeProvider, ServiceInvoiceRequest, ServiceInvoiceResult } from "./types";

/** Gera um "stub" local, sem envio à prefeitura. Nunca usar como nota fiscal real. */
export class MockNfeProvider implements NfeProvider {
  readonly providerName = "mock";

  async issueServiceInvoice(request: ServiceInvoiceRequest): Promise<ServiceInvoiceResult> {
    return {
      externalId: randomUUID(),
      status: "issued",
      pdfUrl: undefined,
    };
  }

  async cancelInvoice(_externalId: string): Promise<void> {
    return;
  }
}
