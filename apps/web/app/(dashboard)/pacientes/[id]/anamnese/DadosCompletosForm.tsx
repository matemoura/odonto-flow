"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@odontoflow/ui";
import type { Patient } from "../../../../../lib/api";
import s from "../../../admin.module.css";

// Grids que colapsam pra 1 coluna sozinhos em telas estreitas, em vez de estourar a largura da página.
/** Subtítulo de bloco dentro do formulário — ocupa a linha inteira (ver .form). */
const subtitulo = { fontSize: 13, fontWeight: 600, marginTop: 4 } as const;

export function DadosCompletosForm({ patient }: { patient: Patient }) {
  const router = useRouter();
  const [rg, setRg] = useState(patient.rg ?? "");
  const [cpf, setCpf] = useState(patient.cpf ?? "");
  const [addressStreet, setAddressStreet] = useState(patient.addressStreet ?? "");
  const [addressNumber, setAddressNumber] = useState(patient.addressNumber ?? "");
  const [addressComplement, setAddressComplement] = useState(patient.addressComplement ?? "");
  const [addressNeighborhood, setAddressNeighborhood] = useState(patient.addressNeighborhood ?? "");
  const [addressCity, setAddressCity] = useState(patient.addressCity ?? "");
  const [addressState, setAddressState] = useState(patient.addressState ?? "");
  const [addressZip, setAddressZip] = useState(patient.addressZip ?? "");
  const [emergencyContactName, setEmergencyContactName] = useState(patient.emergencyContactName ?? "");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(patient.emergencyContactPhone ?? "");
  const [emergencyContactRelationship, setEmergencyContactRelationship] = useState(
    patient.emergencyContactRelationship ?? "",
  );
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setSucesso(false);
    setEnviando(true);
    try {
      const res = await fetch(`/api/staff/patients/${patient.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rg: rg || undefined,
          cpf: cpf || undefined,
          addressStreet: addressStreet || undefined,
          addressNumber: addressNumber || undefined,
          addressComplement: addressComplement || undefined,
          addressNeighborhood: addressNeighborhood || undefined,
          addressCity: addressCity || undefined,
          addressState: addressState || undefined,
          addressZip: addressZip || undefined,
          emergencyContactName: emergencyContactName || undefined,
          emergencyContactPhone: emergencyContactPhone || undefined,
          emergencyContactRelationship: emergencyContactRelationship || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Não foi possível salvar.");
      }
      setSucesso(true);
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={s.form}>
      {erro ? (
        <p className={s.erro} role="alert">
          {erro}
        </p>
      ) : null}
      {sucesso ? <p className={s.sucesso}>Salvo.</p> : null}

      <div className={s.campo}>
        <label className={s.rotuloCampo} htmlFor="cpf">
          CPF
        </label>
        <input id="cpf" className={s.input} value={cpf} onChange={(e) => setCpf(e.target.value)} />
      </div>
      <div className={s.campo}>
        <label className={s.rotuloCampo} htmlFor="rg">
          RG
        </label>
        <input id="rg" className={s.input} value={rg} onChange={(e) => setRg(e.target.value)} />
      </div>

      <h3 style={subtitulo}>Endereço</h3>
        <div className={s.campo}>
          <label className={s.rotuloCampo} htmlFor="addressStreet">
            Rua
          </label>
          <input
            id="addressStreet"
            className={s.input}
            value={addressStreet}
            onChange={(e) => setAddressStreet(e.target.value)}
          />
        </div>
        <div className={s.campo}>
          <label className={s.rotuloCampo} htmlFor="addressNumber">
            Número
          </label>
          <input
            id="addressNumber"
            className={s.input}
            value={addressNumber}
            onChange={(e) => setAddressNumber(e.target.value)}
          />
        </div>
        <div className={s.campo}>
          <label className={s.rotuloCampo} htmlFor="addressComplement">
            Complemento
          </label>
          <input
            id="addressComplement"
            className={s.input}
            value={addressComplement}
            onChange={(e) => setAddressComplement(e.target.value)}
          />
        </div>
        <div className={s.campo}>
          <label className={s.rotuloCampo} htmlFor="addressNeighborhood">
            Bairro
          </label>
          <input
            id="addressNeighborhood"
            className={s.input}
            value={addressNeighborhood}
            onChange={(e) => setAddressNeighborhood(e.target.value)}
          />
        </div>
        <div className={s.campo}>
          <label className={s.rotuloCampo} htmlFor="addressCity">
            Cidade
          </label>
          <input
            id="addressCity"
            className={s.input}
            value={addressCity}
            onChange={(e) => setAddressCity(e.target.value)}
          />
        </div>
        <div className={s.campo}>
          <label className={s.rotuloCampo} htmlFor="addressState">
            UF
          </label>
          <input
            id="addressState"
            className={s.input}
            maxLength={2}
            value={addressState}
            onChange={(e) => setAddressState(e.target.value.toUpperCase())}
          />
        </div>
        <div className={s.campo}>
          <label className={s.rotuloCampo} htmlFor="addressZip">
            CEP
          </label>
          <input
            id="addressZip"
            className={s.input}
            value={addressZip}
            onChange={(e) => setAddressZip(e.target.value)}
          />
        </div>

      <h3 style={subtitulo}>Contato de emergência</h3>
        <div className={s.campo}>
          <label className={s.rotuloCampo} htmlFor="emergencyContactName">
            Nome
          </label>
          <input
            id="emergencyContactName"
            className={s.input}
            value={emergencyContactName}
            onChange={(e) => setEmergencyContactName(e.target.value)}
          />
        </div>
        <div className={s.campo}>
          <label className={s.rotuloCampo} htmlFor="emergencyContactPhone">
            Telefone
          </label>
          <input
            id="emergencyContactPhone"
            className={s.input}
            value={emergencyContactPhone}
            onChange={(e) => setEmergencyContactPhone(e.target.value)}
          />
        </div>
        <div className={s.campo}>
          <label className={s.rotuloCampo} htmlFor="emergencyContactRelationship">
            Parentesco
          </label>
          <input
            id="emergencyContactRelationship"
            className={s.input}
            value={emergencyContactRelationship}
            onChange={(e) => setEmergencyContactRelationship(e.target.value)}
          />
        </div>

      <div>
        <Button type="submit" variant="primary" disabled={enviando} aria-disabled={enviando}>
          {enviando ? "Salvando…" : "Salvar dados completos"}
        </Button>
      </div>
    </form>
  );
}
