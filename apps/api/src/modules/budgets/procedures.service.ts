import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { CreateProcedureDto } from "./dto/create-procedure.dto";
import { UpdateProcedureDto } from "./dto/update-procedure.dto";
import { CreateProcedureMaterialDto } from "./dto/create-procedure-material.dto";
import { UpdateProcedureMaterialDto } from "./dto/update-procedure-material.dto";

const MATERIALS_INCLUDE = { materials: { include: { inventoryItem: true } } } as const;

type ProcedureWithMaterials = {
  materials: { quantityUsed: number; inventoryItem: { unitCostCents: number } }[];
};

@Injectable()
export class ProceduresService {
  constructor(private readonly prisma: PrismaService) {}

  private withEstimatedCost<T extends ProcedureWithMaterials>(procedure: T) {
    const estimatedCostCents = procedure.materials.reduce(
      (sum, m) => sum + m.quantityUsed * m.inventoryItem.unitCostCents,
      0,
    );
    return { ...procedure, estimatedCostCents };
  }

  async findAll(clinicId: string) {
    const procedures = await this.prisma.procedure.findMany({
      where: { clinicId },
      include: MATERIALS_INCLUDE,
      orderBy: { name: "asc" },
    });
    return procedures.map((p) => this.withEstimatedCost(p));
  }

  async findOne(clinicId: string, id: string) {
    const procedure = await this.prisma.procedure.findFirst({
      where: { id, clinicId },
      include: MATERIALS_INCLUDE,
    });
    if (!procedure) {
      throw new NotFoundException("Serviço não encontrado.");
    }
    return this.withEstimatedCost(procedure);
  }

  create(clinicId: string, dto: CreateProcedureDto) {
    return this.prisma.procedure.create({ data: { clinicId, ...dto } });
  }

  async update(clinicId: string, id: string, dto: UpdateProcedureDto) {
    await this.assertExists(clinicId, id);
    return this.prisma.procedure.update({ where: { id }, data: dto });
  }

  async remove(clinicId: string, id: string) {
    await this.assertExists(clinicId, id);
    const usedInBudgets = await this.prisma.budgetItem.count({ where: { procedureId: id } });
    if (usedInBudgets > 0) {
      throw new BadRequestException(
        "Este serviço já foi usado em orçamentos — desative-o em vez de excluir, pra não perder o histórico.",
      );
    }
    await this.prisma.procedure.delete({ where: { id } });
  }

  async addMaterial(clinicId: string, procedureId: string, dto: CreateProcedureMaterialDto) {
    await this.assertExists(clinicId, procedureId);
    const inventoryItem = await this.prisma.inventoryItem.findFirst({
      where: { id: dto.inventoryItemId, clinicId },
    });
    if (!inventoryItem) {
      throw new NotFoundException("Item de estoque não encontrado.");
    }
    return this.prisma.procedureMaterial.upsert({
      where: { procedureId_inventoryItemId: { procedureId, inventoryItemId: dto.inventoryItemId } },
      update: { quantityUsed: dto.quantityUsed },
      create: { procedureId, inventoryItemId: dto.inventoryItemId, quantityUsed: dto.quantityUsed },
      include: { inventoryItem: true },
    });
  }

  async updateMaterial(clinicId: string, procedureId: string, materialId: string, dto: UpdateProcedureMaterialDto) {
    await this.assertMaterialExists(clinicId, procedureId, materialId);
    return this.prisma.procedureMaterial.update({
      where: { id: materialId },
      data: { quantityUsed: dto.quantityUsed },
      include: { inventoryItem: true },
    });
  }

  async removeMaterial(clinicId: string, procedureId: string, materialId: string) {
    await this.assertMaterialExists(clinicId, procedureId, materialId);
    await this.prisma.procedureMaterial.delete({ where: { id: materialId } });
  }

  private async assertExists(clinicId: string, id: string) {
    const procedure = await this.prisma.procedure.findFirst({ where: { id, clinicId } });
    if (!procedure) {
      throw new NotFoundException("Serviço não encontrado.");
    }
    return procedure;
  }

  private async assertMaterialExists(clinicId: string, procedureId: string, materialId: string) {
    const material = await this.prisma.procedureMaterial.findFirst({
      where: { id: materialId, procedureId, procedure: { clinicId } },
    });
    if (!material) {
      throw new NotFoundException("Material não encontrado neste serviço.");
    }
    return material;
  }
}
