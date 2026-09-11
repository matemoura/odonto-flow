import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@odontoflow/db";
import { PrismaService } from "../../database/prisma.service";
import { CreateFacialPlanningDto } from "./dto/create-facial-planning.dto";

const PLANNING_INCLUDE = {
  document: { select: { id: true, storageKey: true, fileName: true, mimeType: true } },
};

@Injectable()
export class FaceogramService {
  constructor(private readonly prisma: PrismaService) {}

  listForPatient(clinicId: string, patientId: string) {
    return this.prisma.facialPlanning.findMany({
      where: { clinicId, patientId },
      include: PLANNING_INCLUDE,
      orderBy: { version: "desc" },
    });
  }

  async getOne(clinicId: string, id: string) {
    const planning = await this.prisma.facialPlanning.findFirst({
      where: { id, clinicId },
      include: PLANNING_INCLUDE,
    });
    if (!planning) {
      throw new NotFoundException("Faceograma não encontrado.");
    }
    return planning;
  }

  async create(clinicId: string, userId: string, dto: CreateFacialPlanningDto) {
    const document = await this.prisma.document.findFirst({
      where: { id: dto.documentId, clinicId, patientId: dto.patientId },
    });
    if (!document) {
      throw new NotFoundException("Foto não encontrada para este paciente.");
    }

    const lastVersion = await this.prisma.facialPlanning.findFirst({
      where: { clinicId, patientId: dto.patientId },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    return this.prisma.facialPlanning.create({
      data: {
        clinicId,
        patientId: dto.patientId,
        documentId: dto.documentId,
        version: (lastVersion?.version ?? 0) + 1,
        overlayData: dto.overlayData as Prisma.InputJsonValue,
        notes: dto.notes,
        createdBy: userId,
      },
      include: PLANNING_INCLUDE,
    });
  }
}
