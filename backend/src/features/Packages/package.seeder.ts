import { prisma } from "../../database/prisma";
import { package_status } from "../../generated/prisma/enums";
import { packageSeedData } from "../../database/seeders/fixtures.js";

// Secuencia lineal del recorrido feliz; RETURNED es un desvío terminal.
const LINEAR_FLOW: package_status[] = [
  package_status.RECEIVED,
  package_status.IN_TRANSIT,
  package_status.IN_WAREHOUSE,
  package_status.OUT_FOR_DELIVERY,
  package_status.DELIVERED,
];

const EVENT_NOTE: Record<package_status, string> = {
  RECEIVED: "Recibido en la agencia de origen",
  IN_TRANSIT: "En tránsito entre agencias",
  IN_WAREHOUSE: "En almacén de destino",
  OUT_FOR_DELIVERY: "En reparto de última milla",
  DELIVERED: "Entregado al destinatario",
  RETURNED: "Devuelto al remitente",
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Estados que ocurren en la sede de origen; el resto, en destino. */
function agencyForStatus(
  status: package_status,
  originId: string | null,
  destinationId: string | null,
): string | null {
  if (status === package_status.RECEIVED || status === package_status.IN_TRANSIT) {
    return originId;
  }
  if (status === package_status.RETURNED) {
    return originId;
  }
  return destinationId ?? originId;
}

/** Cadena de estados a registrar hasta el estado actual (inclusive). */
function chainFor(current: package_status): package_status[] {
  if (current === package_status.RETURNED) {
    return [package_status.RECEIVED, package_status.IN_TRANSIT, package_status.RETURNED];
  }
  const index = LINEAR_FLOW.indexOf(current);
  return index >= 0 ? LINEAR_FLOW.slice(0, index + 1) : [current];
}

export async function seedPackages() {
  const seededPackages = [];

  for (const seedPackage of packageSeedData) {
    const contact = await prisma.users_information.findFirst({
      where: { user: { email: seedPackage.contactUserEmail } },
      select: { id: true },
    });

    if (!contact) {
      throw new Error(
        `Cannot seed package ${seedPackage.tracking_code}: missing contact for ${seedPackage.contactUserEmail}.`,
      );
    }

    const order = seedPackage.orderDescription
      ? await prisma.orders.findFirst({
          where: { description: seedPackage.orderDescription },
          select: {
            id: true,
            origin_agency_id: true,
            destination_agency_id: true,
          },
        })
      : null;

    const seededPackage = await prisma.packages.upsert({
      where: { tracking_code: seedPackage.tracking_code },
      update: {
        description: seedPackage.description,
        weight_kg: seedPackage.weight_kg,
        status: seedPackage.status,
        contact_id: contact.id,
        order_id: order?.id ?? null,
        ...("created_at" in seedPackage ? { created_at: seedPackage.created_at } : {}),
      },
      create: {
        tracking_code: seedPackage.tracking_code,
        description: seedPackage.description,
        weight_kg: seedPackage.weight_kg,
        status: seedPackage.status,
        contact_id: contact.id,
        order_id: order?.id ?? null,
        ...("created_at" in seedPackage ? { created_at: seedPackage.created_at } : {}),
      },
      select: {
        id: true,
        tracking_code: true,
        description: true,
        status: true,
        created_at: true,
      },
    });

    // Reconstruye el historial de movimientos de forma idempotente.
    await prisma.package_events.deleteMany({
      where: { package_id: seededPackage.id },
    });

    const chain = chainFor(seededPackage.status);
    const baseTime = seededPackage.created_at.getTime();
    const events = chain.map((status, i) => ({
      package_id: seededPackage.id,
      status,
      note: EVENT_NOTE[status],
      agency_id: agencyForStatus(
        status,
        order?.origin_agency_id ?? null,
        order?.destination_agency_id ?? null,
      ),
      created_at: new Date(baseTime + i * DAY_MS),
    }));

    if (events.length > 0) {
      await prisma.package_events.createMany({ data: events });
    }

    seededPackages.push(seededPackage);
  }

  return seededPackages;
}
