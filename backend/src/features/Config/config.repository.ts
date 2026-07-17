import { prisma } from "../../database/prisma";
import { Prisma } from "../../generated/prisma/client.js";
import type { UpdateConfigBody } from "./config.schema.js";

const SINGLETON_ID = "singleton";

/** Elimina claves con valor undefined (incompatibles con exactOptionalPropertyTypes). */
function definedOnly(body: UpdateConfigBody): Record<string, string> {
  return Object.fromEntries(
    Object.entries(body).filter(([, value]) => value !== undefined),
  ) as Record<string, string>;
}

export class ConfigRepository {
  /** Devuelve la configuración, creándola con valores por defecto si no existe. */
  async get() {
    const existing = await prisma.system_config.findUnique({
      where: { id: SINGLETON_ID },
    });
    if (existing) {
      return existing;
    }
    return await prisma.system_config.create({ data: { id: SINGLETON_ID } });
  }

  async update(body: UpdateConfigBody) {
    const data = definedOnly(body);
    return await prisma.system_config.upsert({
      where: { id: SINGLETON_ID },
      update: data as Prisma.system_configUpdateInput,
      create: { id: SINGLETON_ID, ...data },
    });
  }
}
