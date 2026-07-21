import { prisma } from "../../database/prisma";

const stageSelect = {
  id: true,
  name: true,
  color: true,
  position: true,
  is_active: true,
  is_system: true,
  status: true,
} as const;

export class PipelineStageRepository {
  async findAll() {
    return await prisma.pipeline_stages.findMany({
      select: stageSelect,
      orderBy: { position: "asc" },
    });
  }

  async findById(id: string) {
    return await prisma.pipeline_stages.findUnique({
      where: { id },
      select: stageSelect,
    });
  }

  async create(data: { name: string; color: string }) {
    const last = await prisma.pipeline_stages.findFirst({
      orderBy: { position: "desc" },
      select: { position: true },
    });
    const position = (last?.position ?? 0) + 1;
    return await prisma.pipeline_stages.create({
      data: {
        name: data.name,
        color: data.color,
        position,
        is_active: true,
        is_system: false,
        status: null,
      },
      select: stageSelect,
    });
  }

  async update(
    id: string,
    data: { name?: string; color?: string; is_active?: boolean },
  ) {
    return await prisma.pipeline_stages.update({
      where: { id },
      data,
      select: stageSelect,
    });
  }

  /** Reordena por la lista de ids recibida (índice = posición). */
  async reorder(ids: string[]) {
    await prisma.$transaction(
      ids.map((id, index) =>
        prisma.pipeline_stages.update({
          where: { id },
          data: { position: index + 1 },
        }),
      ),
    );
    return await this.findAll();
  }

  async countPackages(id: string) {
    return await prisma.packages.count({ where: { stage_id: id } });
  }

  async delete(id: string) {
    await prisma.pipeline_stages.delete({ where: { id } });
  }
}
