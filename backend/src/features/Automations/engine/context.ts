import type { AutomationRunRepository } from "../automation.run.repository.js";
import type { EngineContext } from "./types.js";

// Contexto vacío (p. ej. un webhook anónimo sin contacto asociado).
export function emptyContext(): EngineContext {
  return {
    contactId: null,
    contactName: "Contacto externo",
    vars: {},
    tags: [],
    agency: "",
    packageStatus: "",
    orderStatus: "",
  };
}

// Construye el contexto de una ejecución a partir del contacto: variables
// integradas ({{nombre}}, {{tracking}}, …) y los campos crudos que evalúan
// las ramas (etiquetas, agencia, estados). Réplica de AUTOMATION_VARIABLES.
export async function buildContext(
  repo: AutomationRunRepository,
  contactId: string | null,
): Promise<EngineContext> {
  if (!contactId) {
    return emptyContext();
  }
  const contact = await repo.loadContact(contactId);
  if (!contact) {
    return emptyContext();
  }

  const latestPackage = contact.packages[0];
  const agency = latestPackage?.order?.origin_agency?.name ?? "";
  const packageStatus = latestPackage?.status ?? "";
  const orderStatus = latestPackage?.order?.status ?? "";
  const contactName = `${contact.first_name} ${contact.last_name}`.trim();

  const vars: Record<string, string> = {
    nombre: contact.first_name ?? "",
    apellido: contact.last_name ?? "",
    email: contact.user?.email ?? "",
    telefono: contact.phone ?? "",
    agencia: agency,
    tracking: latestPackage?.tracking_code ?? "",
    paquete: latestPackage?.description ?? "",
    estado_paquete: packageStatus,
    estado_envio: orderStatus,
  };

  return {
    contactId,
    contactName: contactName || "Contacto",
    vars,
    tags: contact.tags ?? [],
    agency,
    packageStatus,
    orderStatus,
  };
}

// Reemplaza {{token}} por su valor en el contexto (mismo patrón que el
// editor). Los tokens desconocidos se sustituyen por cadena vacía.
export function interpolate(text: string, ctx: EngineContext): string {
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, token: string) => {
    return ctx.vars[token] ?? "";
  });
}
