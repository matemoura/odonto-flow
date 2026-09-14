import Link from "next/link";
import { redirect } from "next/navigation";
import { getAgenda, getPublicClinic } from "../../../lib/api";
import { getStaffSession } from "../../../lib/session";
import { AppointmentStatusButton } from "./AppointmentStatusButton";
import { IlhaAtendimento } from "./IlhaAtendimento";
import { AgendaNavegacao } from "./AgendaNavegacao";
import { ListaDeConsultas } from "./ListaDeConsultas";
import {
  agruparPorDia,
  buildAgendaView,
  dataIsoNoFuso,
  dataIsoValida,
  inicioDaSemana,
  saudacao,
  somarDias,
  statusLabel,
  toHHmm,
} from "./agenda-data";
import s from "./agenda.module.css";

export const metadata = { title: "Agenda — Odonto Flow" };

/**
 * Formata uma data CIVIL "YYYY-MM-DD". O `timeZone: "UTC"` não é detalhe: o
 * Date é construído em meia-noite UTC só como recipiente da data, e sem fixar o
 * fuso o Intl o deslocaria para o fuso de quem renderiza — 14/09 viraria 13/09
 * para metade do mundo.
 */
function formatDiaExtenso(dataIso: string) {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(ano, mes - 1, dia)));
}

function formatDiaCurto(dataIso: string) {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(ano, mes - 1, dia)));
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string; vista?: string }>;
}) {
  const session = await getStaffSession();
  if (!session) {
    redirect("/entrar");
  }

  const { data: dataParam, vista: vistaParam } = await searchParams;

  const now = new Date();
  const clinic = await getPublicClinic(session.clinicSlug).catch(() => null);
  const timezone = clinic?.timezone ?? "America/Sao_Paulo";
  // "Hoje" é o dia civil no fuso da clínica, nunca UTC/servidor — perto da
  // meia-noite UTC isso já é um dia diferente do dia civil de Brasília.
  const hojeIso = dataIsoNoFuso(now, timezone);

  // O período vem da URL, e a página abre no dia de hoje quando ela não diz
  // nada. `dataIsoValida` descarta um `?data=` inventado à mão em vez de deixar
  // uma data inválida chegar até a API.
  const vista: "dia" | "semana" = vistaParam === "semana" ? "semana" : "dia";
  const dataSelecionada = dataIsoValida(dataParam) ? dataParam : hojeIso;
  const primeiroDia = vista === "semana" ? inicioDaSemana(dataSelecionada) : dataSelecionada;
  const totalDeDias = vista === "semana" ? 7 : 1;
  const ehHoje = vista === "dia" && dataSelecionada === hojeIso;

  let appointments;
  try {
    appointments = await getAgenda(session.clinicSlug, session.token, primeiroDia, totalDeDias);
  } catch {
    return (
      <div className={s.pagina}>
        <div className={`cartao ${s.erroCarga}`} role="alert">
          Não foi possível carregar a agenda. Verifique se a API está no ar e recarregue a página.
        </div>
      </div>
    );
  }

  const { hoje, emAndamento, proximas, linhaDoDia } = buildAgendaView(appointments, now, timezone);

  const diasDaSemana = Array.from({ length: totalDeDias }, (_, i) => somarDias(primeiroDia, i));
  const porDia = agruparPorDia(appointments, timezone);

  const rotuloPeriodo =
    vista === "semana"
      ? `${formatDiaCurto(primeiroDia)} — ${formatDiaCurto(somarDias(primeiroDia, 6))}`
      : formatDiaExtenso(dataSelecionada);

  return (
    <div className={s.pagina}>
      <div className={s.cabecalho}>
        <div>
          <h1 className={s.saudacao}>{ehHoje ? saudacao(now, timezone) : "Agenda"}</h1>
          <p className={s.resumo}>
            {rotuloPeriodo} · {appointments.length} consulta{appointments.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className={s.acoes}>
          <Link href="/pacientes" className="odontoflow-btn odontoflow-btn--secondary">
            Buscar paciente
          </Link>
          <Link href="/agenda/novo" className="odontoflow-btn odontoflow-btn--primary">
            Novo agendamento
          </Link>
        </div>
      </div>

      <AgendaNavegacao data={dataSelecionada} vista={vista} hojeIso={hojeIso} rotulo={rotuloPeriodo} />

      {ehHoje ? (
        <>
          <div className={s.topo}>
        <IlhaAtendimento
          emAndamento={emAndamento}
          proxima={proximas[0] ?? null}
          timezone={timezone}
        />

        <section className={`cartao ${s.recepcao}`} aria-labelledby="resumo-titulo">
          <span className="rotulo" id="resumo-titulo">
            Resumo do dia
          </span>
          <ul className={s.lista}>
            <li className={s.pessoa}>
              <span>
                <strong className={s.pessoaNome}>{hoje.aguardando}</strong>{" "}
                <span className={hoje.aguardando > 0 ? s.pessoaPresente : s.pessoaDetalhe}>
                  paciente(s) aguardando agora
                </span>
              </span>
            </li>
            <li className={s.pessoa}>
              <span>
                <strong className={s.pessoaNome}>{hoje.aConfirmar}</strong>{" "}
                <span className={s.pessoaDetalhe}>consulta(s) a confirmar</span>
              </span>
            </li>
            <li className={s.pessoa}>
              <span>
                <strong className={s.pessoaNome}>{hoje.faltas}</strong>{" "}
                <span className={hoje.faltas > 0 ? s.pessoaAtencao : s.pessoaDetalhe}>falta(s) hoje</span>
              </span>
            </li>
          </ul>
          <p className={s.espera}>
            Horas livres na agenda hoje: <strong>{hoje.livresLabel}</strong>
          </p>
        </section>
      </div>

      <section className={`cartao ${s.linha}`} aria-labelledby="linha-titulo">
        <div className={s.linhaCabecalho}>
          <h2 className={s.secaoTitulo} id="linha-titulo">
            Linha do dia
          </h2>
          <p className={s.linhaMeta}>08:00 — 18:00</p>
        </div>
        <ol className={s.barra}>
          {linhaDoDia.map((bloco) => (
            <li
              key={bloco.hora}
              className={`${s.bloco} ${s[bloco.ocupacao]}`}
              title={`${bloco.hora}h — ${bloco.ocupacao}`}
            >
              <span className="sr-only">
                {bloco.hora}h: {bloco.ocupacao}
              </span>
            </li>
          ))}
        </ol>
        <div className={s.reguaHoras} aria-hidden="true">
          <span>08h</span>
          <span>10h</span>
          <span>12h</span>
          <span>14h</span>
          <span>16h</span>
          <span>18h</span>
        </div>
      </section>

      <section className={`cartao ${s.proximas}`} aria-labelledby="proximas-titulo">
        <div className={s.proximasCabecalho}>
          <h2 className={s.secaoTitulo} id="proximas-titulo">
            Próximas de hoje
          </h2>
          <span className="chip chip--estatico">{hoje.aConfirmar} a confirmar</span>
          {hoje.aguardando > 0 ? (
            <span className="chip chip--estatico chip--areia">{hoje.aguardando} aguardando</span>
          ) : null}
          {hoje.faltas > 0 ? <span className="chip chip--estatico chip--alerta">{hoje.faltas} falta</span> : null}
        </div>
        {proximas.length === 0 ? (
          <p className={s.consultaDetalhe} style={{ padding: "12px 0" }}>
            Nenhuma consulta agendada para o restante do dia.
          </p>
        ) : (
          <ul className={s.consultas}>
            {proximas.map((item) => (
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
                {item.source === "public-booking" ? (
                  <span className="chip chip--estatico">Veio do link</span>
                ) : null}
                <AppointmentStatusButton appointmentId={item.id} currentStatus={item.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
        </>
      ) : vista === "semana" ? (
        <section className={s.semana} aria-label={`Semana de ${rotuloPeriodo}`}>
          {diasDaSemana.map((diaIso) => {
            const doDia = porDia.get(diaIso) ?? [];
            return (
              <article
                key={diaIso}
                className={`cartao ${s.semanaDia} ${diaIso === hojeIso ? s.semanaDiaHoje : ""}`}
              >
                <div className={s.semanaDiaCabecalho}>
                  <h2 className={s.secaoTitulo}>{formatDiaCurto(diaIso)}</h2>
                  {diaIso === hojeIso ? <span className="chip chip--estatico">Hoje</span> : null}
                  <span className={s.semanaDiaContagem}>
                    {doDia.length} consulta{doDia.length === 1 ? "" : "s"}
                  </span>
                </div>
                <ListaDeConsultas appointments={doDia} timezone={timezone} vazio="Sem consultas neste dia." />
              </article>
            );
          })}
        </section>
      ) : (
        <section className={`cartao ${s.proximas}`} aria-label={`Consultas de ${rotuloPeriodo}`}>
          <div className={s.proximasCabecalho}>
            <h2 className={s.secaoTitulo}>Consultas do dia</h2>
            <span className="chip chip--estatico">
              {appointments.length} no total
            </span>
          </div>
          <ListaDeConsultas
            appointments={appointments}
            timezone={timezone}
            vazio="Nenhuma consulta marcada para este dia."
          />
        </section>
      )}
    </div>
  );
}
