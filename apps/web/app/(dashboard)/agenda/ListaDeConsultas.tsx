import type { AgendaAppointment, AppointmentLabel } from "../../../lib/api";
import { AppointmentStatusButton } from "./AppointmentStatusButton";
import { SeletorDeRotulo } from "./SeletorDeRotulo";
import { statusLabel, toHHmm } from "./agenda-data";
import s from "./agenda.module.css";

/**
 * Lista de consultas de um dia. Usada fora do "hoje": na visão de outro dia e
 * em cada dia da semana. O painel de hoje continua com o layout próprio, que
 * mostra "acontecendo agora" e "próximas" — informação que só faz sentido
 * quando o dia mostrado é o de hoje.
 */
export function ListaDeConsultas({
  appointments,
  timezone,
  labels,
  vazio,
}: {
  appointments: AgendaAppointment[];
  timezone: string;
  labels: AppointmentLabel[];
  vazio: string;
}) {
  if (appointments.length === 0) {
    return (
      <p className={s.consultaDetalhe} style={{ padding: "10px 0" }}>
        {vazio}
      </p>
    );
  }

  return (
    <ul className={s.consultas}>
      {appointments.map((item) => (
        <li key={item.id} className={s.consulta}>
          <span className={s.consultaHora}>{toHHmm(item.startAt, timezone)}</span>
          <span className={s.consultaCorpo}>
            <strong className={s.consultaNome}>{item.patient.name}</strong>
            <span
              className={
                item.status === "NO_SHOW"
                  ? s.consultaAlerta
                  : item.status === "WAITING" || item.status === "FILLING_FORM"
                    ? s.consultaPresente
                    : s.consultaDetalhe
              }
            >
              {statusLabel(item.status)} · {item.professional.user.name}
            </span>
          </span>
          {item.source === "public-booking" ? <span className="chip chip--estatico">Veio do link</span> : null}
          <SeletorDeRotulo appointmentId={item.id} currentLabelId={item.label?.id ?? null} labels={labels} />
          <AppointmentStatusButton
            appointmentId={item.id}
            patientId={item.patient.id}
            currentStatus={item.status}
          />
        </li>
      ))}
    </ul>
  );
}
