import { prisma } from "../../database/prisma";
import type { CreatePackageBody } from "./package.schema";
import type { PackageEntity } from "./package.types";

const packageSelect = {
  id: true,
  tracking_code: true,
  description: true,
  weight_kg: true,
  status: true,
  created_at: true,
  contact_id: true,
  order_id: true,
} as const;

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

  async create(
    body: CreatePackageBody,
    trackingCode: string,
  ): Promise<PackageEntity> {
    return await prisma.packages.create({
      data: {
        tracking_code: trackingCode,
        description: body.description,
        weight_kg: body.weight_kg,
        contact_id: body.contact_id,
        order_id: body.order_id ?? null,
        ...(body.status ? { status: body.status } : {}),
      },
      select: packageSelect,
    });
  }

  async update(id: string, body: CreatePackageBody): Promise<PackageEntity> {
    // El tracking_code nunca cambia después de generado.
    return await prisma.packages.update({
      where: { id: id },
      data: {
        description: body.description,
        weight_kg: body.weight_kg,
        contact_id: body.contact_id,
        order_id: body.order_id ?? null,
        ...(body.status ? { status: body.status } : {}),
      },
      select: packageSelect,
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.packages.delete({
      where: { id: id },
    });
  }
}
