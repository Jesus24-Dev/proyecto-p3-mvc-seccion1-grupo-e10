import { prisma } from "../../database/prisma";
import type { package_status as PackageStatus } from "../../generated/prisma/client";
import type { CreatePackageBody } from "./package.schema";
import type { PackageEntity } from "./package.types";

const packageSelect = {
  id: true,
  tracking_code: true,
  description: true,
  weight_kg: true,
  dimensions: true,
  status: true,
  created_at: true,
  contact_id: true,
  order_id: true,
} as const;

const eventSelect = {
  id: true,
  status: true,
  note: true,
  created_at: true,
  agency: {
    select: {
      id: true,
      name: true,
      location: true,
      latitude: true,
      longitude: true,
    },
  },
} as const;

// Paquete + contacto + recorrido, ordenado cronológicamente.
const trackingSelect = {
  ...packageSelect,
  contact: { select: { id: true, first_name: true, last_name: true } },
  events: { select: eventSelect, orderBy: { created_at: "asc" } },
} as const;

type CheckpointInput = {
  status: PackageStatus;
  agency_id?: string | null;
  note?: string;
};

export class PackageRepository {
  async findAll(): Promise<PackageEntity[]> {
    return await prisma.packages.findMany({
      select: packageSelect,
      orderBy: { created_at: "desc" },
    });
  }

  async findById(id: string): Promise<PackageEntity | null> {
    return await prisma.packages.findUnique({
      where: { id: id },
      select: packageSelect,
    });
  }

  /** Rastreo por código: paquete + contacto + recorrido completo. */
  async findByTrackingCode(code: string) {
    return await prisma.packages.findUnique({
      where: { tracking_code: code },
      select: trackingSelect,
    });
  }

  async create(
    body: CreatePackageBody,
    trackingCode: string,
  ): Promise<PackageEntity> {
    return await prisma.$transaction(async (tx) => {
      const created = await tx.packages.create({
        data: {
          tracking_code: trackingCode,
          description: body.description,
          weight_kg: body.weight_kg,
          dimensions: body.dimensions ?? "",
          contact_id: body.contact_id,
          order_id: body.order_id ?? null,
          ...(body.status ? { status: body.status } : {}),
        },
        select: packageSelect,
      });

      // Primer checkpoint: la agencia de origen del envío, si existe.
      let agencyId: string | null = null;
      if (created.order_id) {
        const order = await tx.orders.findUnique({
          where: { id: created.order_id },
          select: { origin_agency_id: true },
        });
        agencyId = order?.origin_agency_id ?? null;
      }
      await tx.package_events.create({
        data: {
          package_id: created.id,
          status: created.status,
          agency_id: agencyId,
          note: "Paquete registrado",
        },
      });

      return created;
    });
  }

  async update(id: string, body: CreatePackageBody): Promise<PackageEntity> {
    // El tracking_code nunca cambia después de generado.
    return await prisma.$transaction(async (tx) => {
      const before = await tx.packages.findUnique({
        where: { id: id },
        select: { status: true },
      });
      const updated = await tx.packages.update({
        where: { id: id },
        data: {
          description: body.description,
          weight_kg: body.weight_kg,
          dimensions: body.dimensions ?? "",
          contact_id: body.contact_id,
          order_id: body.order_id ?? null,
          ...(body.status ? { status: body.status } : {}),
        },
        select: packageSelect,
      });

      // Registra un movimiento cuando el estado cambia.
      if (before && body.status && body.status !== before.status) {
        await tx.package_events.create({
          data: {
            package_id: id,
            status: updated.status,
            note: "Estado actualizado",
          },
        });
      }

      return updated;
    });
  }

  /** Registra un movimiento manual y actualiza el estado del paquete. */
  async addCheckpoint(id: string, data: CheckpointInput) {
    return await prisma.$transaction(async (tx) => {
      await tx.packages.update({
        where: { id: id },
        data: { status: data.status },
        select: { id: true },
      });
      await tx.package_events.create({
        data: {
          package_id: id,
          status: data.status,
          agency_id: data.agency_id ?? null,
          note: data.note ?? "",
        },
      });
      return await tx.packages.findUnique({
        where: { id: id },
        select: trackingSelect,
      });
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.packages.delete({
      where: { id: id },
    });
  }
}
