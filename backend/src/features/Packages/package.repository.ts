import { prisma } from "../../database/prisma";
import type { package_status as PackageStatus } from "../../generated/prisma/client";
import type { CreatePackageBody } from "./package.schema";
import type { PackageEntity } from "./package.types";
import type { AgencyScope } from "../Auth/agencyScope.js";

const packageSelect = {
  id: true,
  tracking_code: true,
  description: true,
  weight_kg: true,
  dimensions: true,
  status: true,
  image_urls: true,
  created_at: true,
  contact_id: true,
  order_id: true,
  stage_id: true,
  deleted_at: true,
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
  async findAll(scope?: AgencyScope): Promise<PackageEntity[]> {
    return await prisma.packages.findMany({
      // Acota por la agencia dueña del contacto (alcance por sede / subcuenta).
      where: {
        deleted_at: null,
        ...(scope && !scope.all
          ? { contact: { agency_id: { in: scope.ids } } }
          : {}),
      },
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
          ...(body.image_urls ? { image_urls: body.image_urls } : {}),
          ...(body.status ? { status: body.status } : {}),
        },
        select: packageSelect,
      });

      // Vincula la etapa del pipeline que respalda el status inicial.
      const stage = await tx.pipeline_stages.findFirst({
        where: { status: created.status, is_system: true },
        select: { id: true },
      });
      if (stage) {
        await tx.packages.update({
          where: { id: created.id },
          data: { stage_id: stage.id },
        });
        created.stage_id = stage.id;
      }

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
          ...(body.image_urls ? { image_urls: body.image_urls } : {}),
          ...(body.status ? { status: body.status } : {}),
        },
        select: packageSelect,
      });

      // Registra un movimiento y sincroniza la etapa cuando el estado cambia.
      if (before && body.status && body.status !== before.status) {
        await tx.package_events.create({
          data: {
            package_id: id,
            status: updated.status,
            note: "Estado actualizado",
          },
        });
        const stage = await tx.pipeline_stages.findFirst({
          where: { status: updated.status, is_system: true },
          select: { id: true },
        });
        if (stage) {
          await tx.packages.update({
            where: { id: id },
            data: { stage_id: stage.id },
          });
          updated.stage_id = stage.id;
        }
      }

      return updated;
    });
  }

  /**
   * Mueve un paquete a una etapa del pipeline (tablero). Si la etapa respalda
   * un status del sistema, sincroniza `status` y registra un checkpoint.
   * Devuelve { package, backingStatus } para que el servicio dispare eventos.
   */
  async setStage(id: string, stageId: string) {
    return await prisma.$transaction(async (tx) => {
      const stage = await tx.pipeline_stages.findUnique({
        where: { id: stageId },
        select: { id: true, name: true, status: true },
      });
      if (!stage) {
        throw new Error("STAGE_NOT_FOUND");
      }
      const before = await tx.packages.findUnique({
        where: { id: id },
        select: { status: true, stage_id: true },
      });
      if (!before) {
        throw new Error("PACKAGE_NOT_FOUND");
      }
      const updated = await tx.packages.update({
        where: { id: id },
        data: {
          stage_id: stage.id,
          ...(stage.status ? { status: stage.status } : {}),
        },
        select: packageSelect,
      });
      // Checkpoint solo para etapas del sistema (tienen status válido).
      if (stage.status && stage.status !== before.status) {
        await tx.package_events.create({
          data: {
            package_id: id,
            status: stage.status,
            note: `Movido a "${stage.name}"`,
          },
        });
      }
      return { package: updated, backingStatus: stage.status };
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

  // Elimina un movimiento (checkpoint) del recorrido y devuelve el rastreo
  // actualizado. No toca el estado actual del paquete.
  async deleteEvent(packageId: string, eventId: string) {
    await prisma.package_events.delete({
      where: { id: eventId },
    });
    return await prisma.packages.findUnique({
      where: { id: packageId },
      select: trackingSelect,
    });
  }
}
