import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { roles } from "../../generated/prisma/client.js";
import type { ErrorResponse } from "../../shared/error.responses.types.js";

type AuthTokenPayload = {
  sub: string;
  email: string;
  role: roles;
};

/** Usuario autenticado que el middleware adjunta a la petición. */
export type AuthUser = { id: string; email: string; role: roles };

/** Lee el usuario autenticado adjuntado por `requireAdmin`. */
export function getAuthUser(request: Request): AuthUser | null {
  return (request as Request & { authUser?: AuthUser }).authUser ?? null;
}

function getBearerToken(request: Request) {
  const authorizationHeader = request.headers.authorization;

  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.slice("Bearer ".length).trim();
}

export function requireAdmin(
  request: Request,
  response: Response<ErrorResponse>,
  next: NextFunction,
) {
  const token = getBearerToken(request);

  if (!token) {
    return response.status(401).json({
      status: "error",
      message: "Necesitas iniciar sesión para acceder a este recurso.",
    });
  }

  const secret = process.env.JWT_SECRET?.trim();

  if (!secret) {
    return response.status(500).json({
      status: "error",
      message: "El servidor no está configurado correctamente.",
    });
  }

  try {
    const payload = jwt.verify(token, secret) as AuthTokenPayload;

    if (payload.role !== roles.ADMIN) {
      return response.status(403).json({
        status: "error",
        message: "Necesitas una cuenta ADMIN para realizar esta acción.",
      });
    }

    (request as Request & { authUser?: AuthUser }).authUser = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };

    return next();
  } catch {
    return response.status(401).json({
      status: "error",
      message: "Tu sesión expiró o no es válida. Inicia sesión de nuevo.",
    });
  }
}
