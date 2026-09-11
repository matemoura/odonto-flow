import * as argon2 from "argon2";
import { PrismaClient, Role } from "../generated/client";

const prisma = new PrismaClient();

/** Senha de desenvolvimento para todos os usuários de staff do seed. Nunca usar em produção. */
const DEV_PASSWORD = "senha123";

async function main() {
  const passwordHash = await argon2.hash(DEV_PASSWORD);

  const clinic = await prisma.clinic.upsert({
    where: { slug: "vila-nova" },
    update: {},
    create: {
      name: "Clínica Vila Nova",
      slug: "vila-nova",
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@vilanova.com" },
    update: {},
    create: {
      email: "admin@vilanova.com",
      name: "Admin da Clínica Vila Nova",
      passwordHash,
    },
  });

  await prisma.user.upsert({
    where: { email: "dono@odontoflow.dev" },
    update: { isSuperAdmin: true },
    create: {
      email: "dono@odontoflow.dev",
      name: "Dono da plataforma",
      passwordHash,
      isSuperAdmin: true,
    },
  });

  await prisma.clinicMembership.upsert({
    where: { clinicId_userId: { clinicId: clinic.id, userId: adminUser.id } },
    update: {},
    create: {
      clinicId: clinic.id,
      userId: adminUser.id,
      role: Role.CLINIC_ADMIN,
    },
  });

  const dentistasSeed = [
    {
      email: "ana.prado@vilanova.com",
      name: "Dra. Ana Prado",
      croNumber: "CRO-SP 41.882",
      specialty: "Clínica geral",
      color: "#2563eb",
      bio: "Explico cada passo antes de fazer. Ninguém senta na cadeira sem saber o que vai acontecer.",
    },
    {
      email: "caio.vidal@vilanova.com",
      name: "Dr. Caio Vidal",
      croNumber: "CRO-SP 52.104",
      specialty: "Implantodontia",
      color: "#7a3b57",
      bio: "Reabilitação e implantes. Atende casos encaminhados e segunda opinião.",
    },
  ];

  const professionals = [];
  for (const dentista of dentistasSeed) {
    const dentistUser = await prisma.user.upsert({
      where: { email: dentista.email },
      update: {},
      create: {
        email: dentista.email,
        name: dentista.name,
        passwordHash,
      },
    });

    await prisma.clinicMembership.upsert({
      where: { clinicId_userId: { clinicId: clinic.id, userId: dentistUser.id } },
      update: {},
      create: {
        clinicId: clinic.id,
        userId: dentistUser.id,
        role: Role.DENTIST,
      },
    });

    const professional = await prisma.professional.upsert({
      where: { userId: dentistUser.id },
      update: {
        croNumber: dentista.croNumber,
        specialty: dentista.specialty,
        color: dentista.color,
        bio: dentista.bio,
      },
      create: {
        clinicId: clinic.id,
        userId: dentistUser.id,
        croNumber: dentista.croNumber,
        specialty: dentista.specialty,
        color: dentista.color,
        bio: dentista.bio,
      },
    });

    professionals.push(professional);
  }

  const pacientePortal = await prisma.patient.upsert({
    where: { id: "seed-patient-demo" },
    update: {
      clinicId: clinic.id,
      name: "Marina Bueno",
      email: "marina.bueno@example.com",
      phone: "+55 11 90000-0000",
      consentLGPDAt: new Date(),
    },
    create: {
      id: "seed-patient-demo",
      clinicId: clinic.id,
      name: "Marina Bueno",
      email: "marina.bueno@example.com",
      phone: "+55 11 90000-0000",
      consentLGPDAt: new Date(),
    },
  });

  // ---------------------------------------------------------------------------
  // Agenda de demonstração.
  //
  // As datas são RELATIVAS ao dia em que o seed roda, nunca fixas: uma demo com
  // data cravada envelhece e abre com a agenda vazia. Rodar o seed de novo
  // reposiciona os mesmos atendimentos para a frente (os ids são estáveis).
  //
  // A clínica não abre sábado nem domingo (ver availability.util.ts), então
  // "amanhã" aqui significa o PRÓXIMO DIA ÚTIL — marcar consulta num dia fechado
  // deixaria a agenda parecendo quebrada na hora de mostrar pra alguém.
  // ---------------------------------------------------------------------------

  /** Componentes de data/hora de um instante, vistos no fuso da clínica. */
  function partesNoFuso(date: Date, timeZone: string) {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
    return {
      year: Number(p.year),
      month: Number(p.month),
      day: Number(p.day),
      hour: Number(p.hour),
      minute: Number(p.minute),
    };
  }

  /**
   * Instante UTC de um horário de parede no fuso da clínica — 09:20 tem que ser
   * 09:20 pra quem está na clínica, não pra quem hospeda o banco. Mesma
   * aproximação sucessiva de `zonedTimeToUtc` da API (o seed não pode importar
   * de apps/api, então o algoritmo é repetido aqui).
   */
  function instanteNoFuso(dia: Date, hhmm: string, timeZone: string) {
    const [hora, minuto] = hhmm.split(":").map(Number);
    const ano = dia.getUTCFullYear();
    const mes = dia.getUTCMonth() + 1;
    const diaDoMes = dia.getUTCDate();
    const alvo = Date.UTC(ano, mes - 1, diaDoMes, hora, minuto);
    let palpite = new Date(alvo);
    for (let i = 0; i < 2; i++) {
      const visto = partesNoFuso(palpite, timeZone);
      const diff = alvo - Date.UTC(visto.year, visto.month - 1, visto.day, visto.hour, visto.minute);
      if (diff === 0) break;
      palpite = new Date(palpite.getTime() + diff);
    }
    return palpite;
  }

  /** Dias são Date em meia-noite UTC usados só como calendário, nunca como instante. */
  function proximoDiaUtil(dia: Date) {
    const r = new Date(dia);
    do {
      r.setUTCDate(r.getUTCDate() + 1);
    } while (r.getUTCDay() === 0 || r.getUTCDay() === 6);
    return r;
  }

  const hojeNaClinica = partesNoFuso(new Date(), clinic.timezone);
  const hojeCivil = new Date(Date.UTC(hojeNaClinica.year, hojeNaClinica.month - 1, hojeNaClinica.day));

  const diasDaAgenda: Date[] = [];
  let cursorDia = hojeCivil;
  for (let i = 0; i < 6; i++) {
    cursorDia = proximoDiaUtil(cursorDia);
    diasDaAgenda.push(cursorDia);
  }

  const pacientesSeed = [
    { id: "seed-pac-02", name: "Otávio Ramalho", phone: "+55 11 91111-0002" },
    { id: "seed-pac-03", name: "Helena Doria", phone: "+55 11 91111-0003" },
    { id: "seed-pac-04", name: "Rafael Quintana", phone: "+55 11 91111-0004" },
    { id: "seed-pac-05", name: "Bianca Setúbal", phone: "+55 11 91111-0005" },
    { id: "seed-pac-06", name: "Gustavo Peçanha", phone: "+55 11 91111-0006" },
    { id: "seed-pac-07", name: "Lorena Bastos", phone: "+55 11 91111-0007" },
    { id: "seed-pac-08", name: "Ivan Tagliaferro", phone: "+55 11 91111-0008" },
    { id: "seed-pac-09", name: "Sônia Vasques", phone: "+55 11 91111-0009" },
    { id: "seed-pac-10", name: "Décio Marinho", phone: "+55 11 91111-0010" },
    { id: "seed-pac-11", name: "Alice Fontenele", phone: "+55 11 91111-0011" },
    { id: "seed-pac-12", name: "Nuno Sarmento", phone: "+55 11 91111-0012" },
  ];
  // Começa pela Marina (`seed-patient-demo`), que é quem tem login no portal do
  // paciente — ela precisa ter consulta marcada para a demo do portal fazer sentido.
  const pacientes = [pacientePortal];
  for (const p of pacientesSeed) {
    pacientes.push(
      await prisma.patient.upsert({
        where: { id: p.id },
        update: { clinicId: clinic.id, name: p.name, phone: p.phone },
        create: { id: p.id, clinicId: clinic.id, name: p.name, phone: p.phone, consentLGPDAt: new Date() },
      }),
    );
  }

  // Horários batem com os slots de 40min de availability.util.ts (08h–12h e
  // 13h–18h). Um horário fora da grade apareceria na agenda mas nunca poderia
  // ser remarcado pela tela, o que confunde na demonstração.
  const DIA_CHEIO = [
    { hora: "08:00", prof: 0, pac: 1, status: "CONFIRMED" as const },
    { hora: "08:40", prof: 1, pac: 2, status: "CONFIRMED" as const },
    { hora: "09:20", prof: 0, pac: 3, status: "SCHEDULED" as const },
    { hora: "10:00", prof: 1, pac: 4, status: "CONFIRMED" as const },
    { hora: "10:40", prof: 0, pac: 5, status: "SCHEDULED" as const },
    { hora: "11:20", prof: 1, pac: 6, status: "SCHEDULED" as const },
    { hora: "13:40", prof: 0, pac: 7, status: "CONFIRMED" as const },
    { hora: "14:20", prof: 1, pac: 8, status: "SCHEDULED" as const },
    { hora: "15:00", prof: 0, pac: 9, status: "SCHEDULED" as const },
    { hora: "16:20", prof: 1, pac: 10, status: "SCHEDULED" as const },
  ];
  const DIA_NORMAL = [
    { hora: "09:20", prof: 0, pac: 0, status: "SCHEDULED" as const },
    { hora: "10:40", prof: 1, pac: 3, status: "SCHEDULED" as const },
    { hora: "13:00", prof: 0, pac: 6, status: "SCHEDULED" as const },
    { hora: "15:40", prof: 1, pac: 11, status: "SCHEDULED" as const },
  ];

  const motivos = [
    "Revisão semestral",
    "Restauração no 26",
    "Avaliação para implante",
    "Profilaxia",
    "Retorno de canal",
    "Dor ao mastigar do lado direito",
    "Manutenção de aparelho",
    "Clareamento — primeira sessão",
    "Troca de restauração antiga",
    "Avaliação de siso",
  ];

  let totalAgendados = 0;
  for (const [indiceDia, dia] of diasDaAgenda.entries()) {
    const grade = indiceDia === 0 ? DIA_CHEIO : DIA_NORMAL;
    for (const [indiceSlot, slot] of grade.entries()) {
      const startAt = instanteNoFuso(dia, slot.hora, clinic.timezone);
      const endAt = new Date(startAt.getTime() + 40 * 60 * 1000);
      const id = `seed-appt-d${indiceDia}-s${indiceSlot}`;
      const dados = {
        clinicId: clinic.id,
        patientId: pacientes[slot.pac].id,
        professionalId: professionals[slot.prof].id,
        startAt,
        endAt,
        status: slot.status,
        source: indiceSlot % 3 === 0 ? "public-booking" : "internal",
        notes: motivos[(indiceDia * 4 + indiceSlot) % motivos.length],
      };
      await prisma.appointment.upsert({ where: { id }, update: dados, create: { id, ...dados } });
      totalAgendados += 1;
    }
  }

  const procedimentos = [
    { name: "Avaliação clínica", defaultPriceCents: 0 },
    { name: "Restauração", defaultPriceCents: 25000 },
    { name: "Endodontia (canal)", defaultPriceCents: 90000 },
    { name: "Profilaxia + raspagem", defaultPriceCents: 18000 },
  ];
  for (const procedimento of procedimentos) {
    const existing = await prisma.procedure.findFirst({
      where: { clinicId: clinic.id, name: procedimento.name },
    });
    if (!existing) {
      await prisma.procedure.create({
        data: { clinicId: clinic.id, ...procedimento },
      });
    }
  }

  // Estoque + materiais por procedimento — "Lima endodôntica" nasce de propósito
  // abaixo do mínimo, pra já demonstrar o sinal de "precisa repor" sem precisar
  // simular consumo manualmente.
  const itensDeEstoqueSeed = [
    { name: "Resina composta", unit: "g", unitCostCents: 800, quantityOnHand: 40, minQuantity: 10 },
    { name: "Anestésico (tubete)", unit: "un", unitCostCents: 150, quantityOnHand: 60, minQuantity: 20 },
    { name: "Lima endodôntica", unit: "un", unitCostCents: 500, quantityOnHand: 8, minQuantity: 10 },
    { name: "Luva descartável (par)", unit: "par", unitCostCents: 40, quantityOnHand: 200, minQuantity: 50 },
  ];
  const itensDeEstoquePorNome = new Map<string, string>();
  for (const item of itensDeEstoqueSeed) {
    const existing = await prisma.inventoryItem.findFirst({ where: { clinicId: clinic.id, name: item.name } });
    const record = existing ?? (await prisma.inventoryItem.create({ data: { clinicId: clinic.id, ...item } }));
    itensDeEstoquePorNome.set(item.name, record.id);
  }

  const materiaisPorProcedimentoSeed = [
    { procedimento: "Restauração", material: "Resina composta", quantityUsed: 2 },
    { procedimento: "Restauração", material: "Anestésico (tubete)", quantityUsed: 1 },
    { procedimento: "Restauração", material: "Luva descartável (par)", quantityUsed: 2 },
    { procedimento: "Endodontia (canal)", material: "Lima endodôntica", quantityUsed: 3 },
    { procedimento: "Endodontia (canal)", material: "Anestésico (tubete)", quantityUsed: 2 },
    { procedimento: "Endodontia (canal)", material: "Luva descartável (par)", quantityUsed: 2 },
  ];
  for (const vinculo of materiaisPorProcedimentoSeed) {
    const procedureId = (
      await prisma.procedure.findFirstOrThrow({ where: { clinicId: clinic.id, name: vinculo.procedimento } })
    ).id;
    const inventoryItemId = itensDeEstoquePorNome.get(vinculo.material)!;
    await prisma.procedureMaterial.upsert({
      where: { procedureId_inventoryItemId: { procedureId, inventoryItemId } },
      update: { quantityUsed: vinculo.quantityUsed },
      create: { procedureId, inventoryItemId, quantityUsed: vinculo.quantityUsed },
    });
  }

  // Fase 2 — comissionamento (30% para a Dra. Ana Prado) e alguns lançamentos de exemplo.
  await prisma.commissionRule.upsert({
    where: { professionalId: professionals[0].id },
    update: { percentageBasisPoints: 3000 },
    create: { clinicId: clinic.id, professionalId: professionals[0].id, percentageBasisPoints: 3000 },
  });

  const hoje = new Date();
  const transacoesSeed = [
    { id: "seed-tx-1", type: "INCOME" as const, category: "Restauração", amountCents: 25000, dueDaysAgo: 3, paid: true, professionalId: professionals[0].id },
    { id: "seed-tx-2", type: "INCOME" as const, category: "Avaliação clínica", amountCents: 15000, dueDaysAgo: 1, paid: true, professionalId: professionals[1].id },
    { id: "seed-tx-3", type: "INCOME" as const, category: "Profilaxia + raspagem", amountCents: 18000, dueDaysAgo: -2, paid: false, professionalId: professionals[0].id },
    { id: "seed-tx-4", type: "EXPENSE" as const, category: "Material de consumo", amountCents: 42000, dueDaysAgo: 5, paid: true, professionalId: null },
    { id: "seed-tx-5", type: "EXPENSE" as const, category: "Aluguel", amountCents: 350000, dueDaysAgo: -5, paid: false, professionalId: null },
  ];
  for (const tx of transacoesSeed) {
    const dueDate = new Date(hoje);
    dueDate.setDate(dueDate.getDate() - tx.dueDaysAgo);
    await prisma.transaction.upsert({
      where: { id: tx.id },
      update: {},
      create: {
        id: tx.id,
        clinicId: clinic.id,
        type: tx.type,
        category: tx.category,
        amountCents: tx.amountCents,
        dueDate,
        paidAt: tx.paid ? dueDate : null,
        professionalId: tx.professionalId,
      },
    });
  }
  // gera as comissões das receitas já pagas do seed (idempotente via upsert no service real,
  // aqui só popula direto pois o seed não passa pelo endpoint /finance/transactions/:id/pay)
  for (const tx of transacoesSeed) {
    if (tx.type === "INCOME" && tx.paid && tx.professionalId === professionals[0].id) {
      await prisma.commissionEntry.upsert({
        where: { transactionId: tx.id },
        update: {},
        create: {
          clinicId: clinic.id,
          professionalId: tx.professionalId,
          transactionId: tx.id,
          amountCents: Math.round((tx.amountCents * 3000) / 10000),
        },
      });
    }
  }

  // Fase 3 — CRM (funil) e indicações.
  const patientTiago = await prisma.patient.upsert({
    where: { id: "seed-patient-tiago" },
    update: { clinicId: clinic.id },
    create: {
      id: "seed-patient-tiago",
      clinicId: clinic.id,
      name: "Tiago Verás",
      phone: "+55 11 91111-2222",
    },
  });

  const budgetPendente = await prisma.budget.upsert({
    where: { id: "seed-budget-pendente" },
    update: {},
    create: {
      id: "seed-budget-pendente",
      clinicId: clinic.id,
      patientId: patientTiago.id,
      professionalId: professionals[1].id,
      status: "PENDING",
      items: {
        create: [{ procedureId: (await prisma.procedure.findFirstOrThrow({ where: { clinicId: clinic.id, name: "Endodontia (canal)" } })).id, quantity: 1, unitPriceCents: 90000 }],
      },
    },
  });

  const oportunidadesSeed = [
    { id: "seed-opp-1", patientId: "seed-patient-demo", title: "Retorno pós-restauração", stage: "NEW" as const, ownerId: professionals[0].id },
    { id: "seed-opp-2", patientId: patientTiago.id, title: "Orçamento de canal em aberto", stage: "BUDGET_SENT" as const, ownerId: professionals[1].id, budgetId: budgetPendente.id },
    { id: "seed-opp-3", patientId: "seed-patient-demo", title: "Avaliação de clareamento", stage: "NEGOTIATING" as const, ownerId: professionals[0].id },
  ];
  for (const opp of oportunidadesSeed) {
    await prisma.cRMOpportunity.upsert({
      where: { id: opp.id },
      update: { stage: opp.stage },
      create: {
        id: opp.id,
        clinicId: clinic.id,
        patientId: opp.patientId,
        title: opp.title,
        stage: opp.stage,
        ownerId: opp.ownerId,
        budgetId: opp.budgetId,
      },
    });
  }

  await prisma.referral.upsert({
    where: { id: "seed-referral-1" },
    update: {},
    create: {
      id: "seed-referral-1",
      clinicId: clinic.id,
      referrerPatientId: "seed-patient-demo",
      referredName: "Camila Dias",
      referredPhone: "+55 11 93333-4444",
      status: "PENDING",
    },
  });

  // Fase 5 — ortodontia: tratamento com alinhadores para a Marina, com 3 etapas.
  const treatmentInicio = new Date();
  treatmentInicio.setMonth(treatmentInicio.getMonth() - 2);
  const orthoTreatment = await prisma.orthodonticTreatment.upsert({
    where: { id: "seed-ortho-treatment-1" },
    update: {},
    create: {
      id: "seed-ortho-treatment-1",
      clinicId: clinic.id,
      patientId: "seed-patient-demo",
      professionalId: professionals[0].id,
      applianceType: "ALIGNERS",
      status: "ACTIVE",
      startedAt: treatmentInicio,
      notes: "Correção de apinhamento leve, previsão de 14 alinhadores.",
    },
  });
  const stepsSeed = [
    { id: "seed-ortho-step-1", sequence: 1, description: "Alinhador 1-2", status: "DONE" as const, done: true },
    { id: "seed-ortho-step-2", sequence: 2, description: "Alinhador 3-4", status: "DONE" as const, done: true },
    { id: "seed-ortho-step-3", sequence: 3, description: "Alinhador 5-6", status: "PENDING" as const, done: false },
  ];
  for (const step of stepsSeed) {
    const scheduledFor = new Date(treatmentInicio);
    scheduledFor.setDate(scheduledFor.getDate() + step.sequence * 21);
    await prisma.orthodonticStep.upsert({
      where: { id: step.id },
      update: { status: step.status },
      create: {
        id: step.id,
        treatmentId: orthoTreatment.id,
        sequence: step.sequence,
        description: step.description,
        scheduledFor,
        completedAt: step.done ? scheduledFor : null,
        status: step.status,
      },
    });
  }

  // Fase 6 — rede de clínicas: "Vila Nova" ganha uma segunda unidade (Zona Sul)
  // sob a mesma organização, com o mesmo admin como ORG_ADMIN da rede.
  const organization = await prisma.organization.upsert({
    where: { slug: "grupo-vila-nova" },
    update: {},
    create: { name: "Grupo Vila Nova", slug: "grupo-vila-nova" },
  });
  await prisma.clinic.update({ where: { id: clinic.id }, data: { organizationId: organization.id } });
  const clinicSul = await prisma.clinic.upsert({
    where: { slug: "vila-nova-sul" },
    update: { organizationId: organization.id },
    create: {
      name: "Clínica Vila Nova - Zona Sul",
      slug: "vila-nova-sul",
      organizationId: organization.id,
    },
  });
  await prisma.organizationMembership.upsert({
    where: { organizationId_userId: { organizationId: organization.id, userId: adminUser.id } },
    update: {},
    create: { organizationId: organization.id, userId: adminUser.id, role: Role.ORG_ADMIN },
  });
  await prisma.patient.upsert({
    where: { id: "seed-patient-sul" },
    update: { clinicId: clinicSul.id },
    create: {
      id: "seed-patient-sul",
      clinicId: clinicSul.id,
      name: "Renato Alves",
      phone: "+55 11 94444-5555",
    },
  });

  console.log(`Seed concluído. Clínica demo: /agendar/${clinic.slug}`);
  console.log(
    `Agenda: ${totalAgendados} atendimentos entre ${diasDaAgenda[0].toISOString().slice(0, 10)} e ` +
      `${diasDaAgenda[diasDaAgenda.length - 1].toISOString().slice(0, 10)} (só dias úteis).`,
  );
  console.log(`Login staff: ${adminUser.email} / ${dentistasSeed[0].email} — senha: ${DEV_PASSWORD}`);
  console.log(`Login dono da plataforma: dono@odontoflow.dev — senha: ${DEV_PASSWORD} (acesse em /plataforma/entrar)`);
  console.log(`Login paciente (mock, só e-mail): marina.bueno@example.com`);
  console.log(`Rede (Fase 6): ${organization.name} — clínicas: ${clinic.slug}, ${clinicSul.slug} (login admin é ORG_ADMIN em ambas)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
