import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/** Exige um Bearer token válido; popula req.user (ver JwtStrategy). */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}
