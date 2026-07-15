import { randomBytes } from "node:crypto";
import { Prisma } from "../../generated/prisma/client.js";
import { PackageRepository } from "./package.repository.js";
import type { CreatePackageBody } from "./package.schema.js";

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

  async getAllPackages() {
    return await this.packageRepository.findAll();
  }

  async getPackageById(id: string) {
    return await this.packageRepository.findById(id);
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
