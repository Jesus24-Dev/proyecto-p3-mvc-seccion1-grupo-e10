import { automationRepo, engine, runRepo } from "./instance.js";
import { parseDefinition, triggerNode } from "./graph.js";

// Encuentra las automatizaciones ACTIVAS cuyo disparador coincide con el
// evento de dominio ocurrido.
async function activeAutomationsFor(triggerKind: string) {
  const all = await automationRepo.findAll();
  return all.filter((automation) => {
    if (!automation.is_active) {
      return false;
    }
    const def = parseDefinition(automation.definition);
    return triggerNode(def)?.data?.trigger === triggerKind;
  });
}

// Inscribe un contacto en todas las automatizaciones que escuchan el evento.
async function fireForContact(
  triggerKind: string,
  contactId: string | null,
): Promise<void> {
  const matches = await activeAutomationsFor(triggerKind);
  for (const automation of matches) {
    await engine.enroll({
      automationId: automation.id,
      contactId,
      trigger: triggerKind,
    });
  }
}

// Disparadores de dominio. Se invocan desde los controladores existentes
// (fire-and-forget: nunca deben romper la petición principal).

export function fireContactCreated(contactId: string): Promise<void> {
  return fireForContact("contact_created", contactId);
}

export function fireTagAdded(contactId: string, _tag: string): Promise<void> {
  return fireForContact("tag_added", contactId);
}

export async function firePackageDelivered(packageId: string): Promise<void> {
  const contactId = await runRepo.contactIdForPackage(packageId);
  await fireForContact("package_delivered", contactId);
}

export async function fireOrderCompleted(orderId: string): Promise<void> {
  const contactId = await runRepo.contactIdForOrder(orderId);
  await fireForContact("order_completed", contactId);
}

// Envoltura segura para llamar desde los controladores sin await ni riesgo:
// registra el error y sigue.
export function safeFire(promise: Promise<void>, label: string): void {
  promise.catch((error) => {
    console.error(`[automations] disparador ${label} falló`, error);
  });
}
