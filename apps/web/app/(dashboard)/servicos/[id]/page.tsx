import { notFound, redirect } from "next/navigation";
import { ApiError, getInventoryItems, getProcedure, type InventoryItem } from "../../../../lib/api";
import { getStaffSession } from "../../../../lib/session";
import { ServicoDetail } from "./ServicoDetail";
import s from "../../admin.module.css";

export default async function ServicoPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getStaffSession();
  if (!session) redirect("/entrar");
  if (session.role !== "CLINIC_ADMIN" && session.role !== "ORG_ADMIN") redirect("/agenda");

  const { id } = await params;

  let procedure;
  try {
    procedure = await getProcedure(session.clinicSlug, session.token, id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    return (
      <div className={s.pagina}>
        <p className={s.erro} role="alert">
          Não foi possível carregar este serviço agora.
        </p>
      </div>
    );
  }

  let inventoryItems: InventoryItem[];
  try {
    inventoryItems = await getInventoryItems(session.clinicSlug, session.token);
  } catch {
    inventoryItems = [];
  }

  return (
    <div className={s.pagina}>
      <h1 className={s.titulo}>{procedure.name}</h1>
      <ServicoDetail procedure={procedure} inventoryItems={inventoryItems} />
    </div>
  );
}
