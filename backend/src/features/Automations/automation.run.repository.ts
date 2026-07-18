import { prisma } from "../../database/prisma";
import type {
  automation_run_status,
  automation_event_result,
  Prisma,
} from "../../generated/prisma/client";

// Acceso a datos del motor de automatizaciones: ejecuciones (runs), su
// registro de eventos y las lecturas del contacto necesarias para resolver
// variables y ramas. Es la única capa que toca Prisma para el motor.
export class AutomationRunRepository {
  // --- Ejecuciones -------------------------------------------------------

  async createRun(data: {
    automation_id: string;
    contact_id: string | null;
    trigger: string;
    current_node_id: string | null;
    context: Prisma.InputJsonValue;
  }) {
    return await prisma.automation_runs.create({
      data: {
        automation_id: data.automation_id,
        contact_id: data.contact_id,
        trigger: data.trigger,
        current_node_id: data.current_node_id,
        context: data.context,
        status: "RUNNING",
      },
    });
  }

  async getRun(id: string) {
    return await prisma.automation_runs.findUnique({ where: { id } });
  }

  // Ejecución con su registro, para reintentar los pasos fallidos.
  async getRunWithEvents(id: string) {
    return await prisma.automation_runs.findUnique({
      where: { id },
      include: { events: { orderBy: { created_at: "asc" } } },
    });
  }

  async updateRun(
    id: string,
    data: {
      status?: automation_run_status;
      current_node_id?: string | null;
      resume_at?: Date | null;
      context?: Prisma.InputJsonValue;
    },
  ) {
    return await prisma.automation_runs.update({ where: { id }, data });
  }

  // ¿El contacto ya tiene una ejecución viva en este flujo? Evita
  // reinscripciones (y bucles al encadenar tag_added).
  async findActiveRun(automationId: string, contactId: string) {
    return await prisma.automation_runs.findFirst({
      where: {
        automation_id: automationId,
        contact_id: contactId,
        status: { in: ["RUNNING", "WAITING"] },
      },
      select: { id: true },
    });
  }

  // Ejecuciones esperando ("wait") cuyo tiempo ya venció.
  async findDueWaiting(now: Date) {
    return await prisma.automation_runs.findMany({
      where: { status: "WAITING", resume_at: { lte: now } },
      orderBy: { resume_at: "asc" },
      take: 50,
    });
  }

  // Ejecuciones de un flujo con su registro, para las vistas del editor.
  async listRunsByAutomation(automationId: string) {
    return await prisma.automation_runs.findMany({
      where: { automation_id: automationId },
      orderBy: { started_at: "desc" },
      take: 100,
      include: {
        contact: { select: { first_name: true, last_name: true } },
        events: { orderBy: { created_at: "asc" } },
      },
    });
  }

  // Todas las inscripciones de un contacto, en cualquier flujo, para su ficha.
  async listRunsByContact(contactId: string) {
    return await prisma.automation_runs.findMany({
      where: { contact_id: contactId },
      orderBy: { started_at: "desc" },
      take: 100,
      include: {
        automation: { select: { name: true } },
        events: { orderBy: { created_at: "asc" } },
      },
    });
  }

  // --- Eventos (registro/log) -------------------------------------------

  async addEvent(data: {
    run_id: string;
    node_id: string;
    kind: string;
    result: automation_event_result;
    detail: string;
  }) {
    return await prisma.automation_run_events.create({ data });
  }

  // --- Lecturas del contacto (para variables y ramas) --------------------

  async loadContact(contactId: string) {
    return await prisma.users_information.findUnique({
      where: { id: contactId },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        phone: true,
        tags: true,
        user: { select: { email: true } },
        packages: {
          orderBy: { created_at: "desc" },
          take: 1,
          select: {
            tracking_code: true,
            description: true,
            status: true,
            order: {
              select: {
                status: true,
                origin_agency: { select: { name: true } },
              },
            },
          },
        },
      },
    });
  }

  // Agrega una etiqueta al contacto (sin duplicar). Devuelve true si cambió.
  async appendTag(contactId: string, tag: string): Promise<boolean> {
    const contact = await prisma.users_information.findUnique({
      where: { id: contactId },
      select: { tags: true },
    });
    if (!contact) {
      return false;
    }
    if (contact.tags.includes(tag)) {
      return false;
    }
    await prisma.users_information.update({
      where: { id: contactId },
      data: { tags: { set: [...contact.tags, tag] } },
    });
    return true;
  }

  // Quita una etiqueta del contacto. Devuelve true si cambió.
  async removeTag(contactId: string, tag: string): Promise<boolean> {
    const contact = await prisma.users_information.findUnique({
      where: { id: contactId },
      select: { tags: true },
    });
    if (!contact || !contact.tags.includes(tag)) {
      return false;
    }
    await prisma.users_information.update({
      where: { id: contactId },
      data: { tags: { set: contact.tags.filter((item) => item !== tag) } },
    });
    return true;
  }

  // Actualiza un campo del contacto (lista blanca de campos editables).
  async updateContactField(
    contactId: string,
    field: string,
    value: string,
  ): Promise<void> {
    const allowed = ["phone", "address", "first_name", "last_name", "document_id"];
    if (!allowed.includes(field)) {
      throw new Error(`Campo no editable: ${field}`);
    }
    await prisma.users_information.update({
      where: { id: contactId },
      data: { [field]: value },
    });
  }

  // Crea una nota CRM en la ficha del contacto.
  async createContactNote(
    contactId: string,
    kind: string,
    body: string,
  ): Promise<void> {
    const noteKind = ["NOTE", "OBSERVATION", "INCIDENT"].includes(kind)
      ? (kind as "NOTE" | "OBSERVATION" | "INCIDENT")
      : "NOTE";
    await prisma.client_notes.create({
      data: {
        contact_id: contactId,
        kind: noteKind,
        body,
        author_email: "automatización",
      },
    });
  }

  // Un contacto de muestra (para "Ejecutar" sin elegir contacto).
  async findSampleContactId(): Promise<string | null> {
    const contact = await prisma.users_information.findFirst({
      orderBy: { created_at: "desc" },
      select: { id: true },
    });
    return contact?.id ?? null;
  }

  // Contacto (destinatario) de un paquete, para el disparador de entrega.
  async contactIdForPackage(packageId: string): Promise<string | null> {
    const pkg = await prisma.packages.findUnique({
      where: { id: packageId },
      select: { contact_id: true },
    });
    return pkg?.contact_id ?? null;
  }

  // Contacto asociado a una orden (vía el usuario de la orden), para el
  // disparador de envío completado.
  async contactIdForOrder(orderId: string): Promise<string | null> {
    const order = await prisma.orders.findUnique({
      where: { id: orderId },
      select: { user: { select: { user_information: { select: { id: true } } } } },
    });
    return order?.user?.user_information?.id ?? null;
  }
}
