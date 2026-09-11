import { IsArray, IsOptional, IsString } from "class-validator";

/**
 * `overlayData` é um array de traçados (cada traçado é um array de pontos
 * {x,y} em coordenadas relativas 0–1 da imagem) desenhados no canvas do
 * faceograma. Validado só como array — a estrutura interna é definida pelo
 * componente de desenho no front (ver FaceogramCanvas.tsx).
 */
export class CreateFacialPlanningDto {
  @IsString()
  patientId!: string;

  @IsString()
  documentId!: string;

  @IsArray()
  overlayData!: unknown[];

  @IsOptional()
  @IsString()
  notes?: string;
}
