import { notFound, redirect } from "next/navigation";
import { ApiError, getInventoryItem, getInventoryMovements, type InventoryMovement } from "../../../../lib/api";
import { getStaffSession } from "../../../../lib/session";
import { ItemEstoqueDetail } from "./ItemEstoqueDetail";
import s from "../../admin.module.css";

export default async function ItemEstoquePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getStaffSession();
  if (!session) redirect("/entrar");
  if (session.role !== "CLINIC_ADMIN" && session.role !== "ORG_ADMIN") redirect("/agenda");

  const { id } = await params;

  let item;
  try {
    item = await getInventoryItem(session.clinicSlug, session.token, id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    return (
      <div className={s.pagina}>
        <p className={s.erro} role="alert">
          Não foi possível carregar este item agora.
        </p>
      </div>
    );
  }

  let movements: InventoryMovement[];
  try {
    movements = await getInventoryMovements(session.clinicSlug, session.token, id);
  } catch {
    movements = [];
  }

  return (
    <div className={s.pagina}>
      <h1 className={s.titulo}>{item.name}</h1>
      <ItemEstoqueDetail item={item} movements={movements} />
    </div>
  );
}
