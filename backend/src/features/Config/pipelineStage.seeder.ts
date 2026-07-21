import { prisma } from "../../database/prisma";
import { package_status } from "../../generated/prisma/client.js";

// Etapas canónicas del ciclo de vida de un paquete. Respaldan un
// `package_status` para no romper rastreo/automatizaciones/reportes.
const SYSTEM_STAGES: {
  status: package_status;
  name: string;
  color: string;
  position: number;
}[] = [
  { status: package_status.RECEIVED, name: "Recibido", color: "slate", position: 1 },
  { status: package_status.IN_TRANSIT, name: "En tránsito", color: "blue", position: 2 },
  { status: package_status.IN_WAREHOUSE, name: "En almacén", color: "amber", position: 3 },
  { status: package_status.OUT_FOR_DELIVERY, name: "En reparto", color: "violet", position: 4 },
  { status: package_status.DELIVERED, name: "Entregado", color: "emerald", position: 5 },
  { status: package_status.RETURNED, name: "Devuelto", color: "red", position: 6 },
];

export async function seedPipelineStages() {
  // Idempotente: crea las etapas del sistema solo si faltan; NO sobrescribe
  // personalizaciones (nombre/color/orden) que el usuario haya hecho.
  const created = [];
  for (const stage of SYSTEM_STAGES) {
    const existing = await prisma.pipeline_stages.findFirst({
      where: { status: stage.status, is_system: true },
      select: { id: true },
    });
    if (existing) {
      continue;
    }
    const row = await prisma.pipeline_stages.create({
      data: {
        name: stage.name,
        color: stage.color,
        position: stage.position,
        is_active: true,
        is_system: true,
        status: stage.status,
      },
    });
    created.push(row);
  }

  // Rellena stage_id de los paquetes que aún no lo tienen, según su status.
  const stages = await prisma.pipeline_stages.findMany({
    where: { is_system: true },
    select: { id: true, status: true },
  });
  const stageByStatus = new Map(stages.map((s) => [s.status, s.id]));
  const pending = await prisma.packages.findMany({
    where: { stage_id: null },
    select: { id: true, status: true },
  });
  for (const pkg of pending) {
    const stageId = stageByStatus.get(pkg.status);
    if (stageId) {
      await prisma.packages.update({
        where: { id: pkg.id },
        data: { stage_id: stageId },
      });
    }
  }

  return created;
}
