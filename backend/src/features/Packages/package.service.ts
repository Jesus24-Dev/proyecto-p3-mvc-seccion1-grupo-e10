import { randomBytes } from "node:crypto";
import { Prisma } from "../../generated/prisma/client.js";
import { PackageRepository } from "./package.repository.js";
import type { AddCheckpointBody, CreatePackageBody } from "./package.schema.js";
import type {
  PublicTrackingResponse,
  TrackingResponse,
} from "./package.types.js";
import type { AgencyScope } from "../Auth/agencyScope.js";

export class PackageServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "PackageServiceError";
  }
}

/** Genera un código de rastreo legible, p. ej. DRL-2026-9F3A21B0. */
function generateTrackingCode(): string {
  const year = new Date().getFullYear();
  const random = randomBytes(4).toString("hex").toUpperCase();
  return `DRL-${year}-${random}`;
}

export class PackageService {
  constructor(private packageRepository: PackageRepository) {}

  async getAllPackages(scope?: AgencyScope) {
    return await this.packageRepository.findAll(scope);
  }

  async getPackageById(id: string) {
    return await this.packageRepository.findById(id);
  }

  /** Rastreo completo por código (admin): 404 si no existe. */
  async getPackageByTrackingCode(code: string): Promise<TrackingResponse> {
    const tracking = await this.packageRepository.findByTrackingCode(code);
    if (!tracking) {
      throw new PackageServiceError("El paquete solicitado no existe.", 404);
    }
    return tracking;
  }

  /** Rastreo público por código: sin datos personales del contacto. */
  async getPublicTracking(code: string): Promise<PublicTrackingResponse> {
    const tracking = await this.packageRepository.findByTrackingCode(code);
    if (!tracking) {
      throw new PackageServiceError(
        "No encontramos un paquete con ese código de rastreo.",
        404,
      );
    }
    // Expone solo lo necesario para el seguimiento; nada del contacto.
    return {
      tracking_code: tracking.tracking_code,
      description: tracking.description,
      weight_kg: tracking.weight_kg,
      status: tracking.status,
      created_at: tracking.created_at,
      events: tracking.events,
    };
  }

  /** Registra un movimiento manual y devuelve el rastreo actualizado. */
  async addCheckpoint(
    id: string,
    body: AddCheckpointBody,
  ): Promise<TrackingResponse> {
    try {
      const tracking = await this.packageRepository.addCheckpoint(id, {
        status: body.status,
        agency_id: body.agency_id ?? null,
        note: body.note ?? "",
      });
      if (!tracking) {
        throw new PackageServiceError("El paquete solicitado no existe.", 404);
      }
      return tracking;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2001" || e.code === "P2025") {
          throw new PackageServiceError("El paquete solicitado no existe.", 404);
        }
        if (e.code === "P2003") {
          throw new PackageServiceError("La agencia indicada no existe.", 400);
        }
      }
      throw e;
    }
  }

  /** Elimina un movimiento del recorrido (solo superadmin, gated en la ruta). */
  async deleteCheckpoint(
    packageId: string,
    eventId: string,
  ): Promise<TrackingResponse> {
    try {
      const tracking = await this.packageRepository.deleteEvent(
        packageId,
        eventId,
      );
      if (!tracking) {
        throw new PackageServiceError("El paquete solicitado no existe.", 404);
      }
      return tracking;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2001" || e.code === "P2025") {
          throw new PackageServiceError("El movimiento no existe o ya fue eliminado.", 404);
        }
      }
      throw e;
    }
  }

  async createPackage(body: CreatePackageBody) {
    // Reintenta ante la improbable colisión del código único.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.packageRepository.create(
          body,
          generateTrackingCode(),
        );
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError) {
          if (e.code === "P2002") {
            continue;
          }
          if (e.code === "P2003") {
            throw new PackageServiceError(
              "El contacto o el envío indicado no existe.",
              400,
            );
          }
        }
        throw e;
      }
    }

    throw new PackageServiceError(
      "No se pudo generar un código de rastreo único. Intenta de nuevo.",
      500,
    );
  }

  async updatePackage(id: string, body: CreatePackageBody) {
    try {
      return await this.packageRepository.update(id, body);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2001" || e.code === "P2025") {
          throw new PackageServiceError(
            "El paquete solicitado no existe.",
            404,
          );
        }
        if (e.code === "P2003") {
          throw new PackageServiceError(
            "El contacto o el envío indicado no existe.",
            400,
          );
        }
      }
      throw e;
    }
  }

  /** Mueve el paquete a una etapa del tablero. */
  async moveToStage(id: string, stageId: string) {
    try {
      return await this.packageRepository.setStage(id, stageId);
    } catch (e) {
      if (e instanceof Error && e.message === "PACKAGE_NOT_FOUND") {
        throw new PackageServiceError("El paquete solicitado no existe.", 404);
      }
      if (e instanceof Error && e.message === "STAGE_NOT_FOUND") {
        throw new PackageServiceError("La etapa indicada no existe.", 400);
      }
      throw e;
    }
  }

  async deletePackage(id: string) {
    try {
      await this.packageRepository.delete(id);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2001" || e.code === "P2025") {
          throw new PackageServiceError(
            "No se pudo eliminar: el paquete no existe o ya fue eliminado.",
            404,
          );
        }
      }
      throw e;
    }
  }
}
