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

/**
 * Roles con acceso al panel de personal:
 *  - SUPERADMIN / ADMIN: administrador de agencia (ve todas las subcuentas).
 *  - DISTRIBUTOR: administrador de sede (acotado a sus agencias; ver agencyScope).
 */
function isStaffRole(role: roles): boolean {
  return (
    role === roles.ADMIN ||
    role === roles.SUPERADMIN ||
    role === roles.DISTRIBUTOR
  );
}

function getBearerToken(request: Request) {
  const authorizationHeader = request.headers.authorization;

  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.slice("Bearer ".length).trim();
}

/** Verifica el token y adjunta el usuario, sin exigir rol ADMIN. */
export function requireAuth(
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

/**
 * Variante de `requireAdmin` para SSE: EventSource no puede enviar cabeceras,
 * así que el token viaja en `?token=`. Verifica y exige rol ADMIN igual.
 */
export function requireAdminQueryToken(
  request: Request,
  response: Response<ErrorResponse>,
  next: NextFunction,
) {
  const token =
    typeof request.query.token === "string" ? request.query.token.trim() : "";

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
    if (!isStaffRole(payload.role)) {
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

    if (!isStaffRole(payload.role)) {
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

/**
 * Exige el máximo nivel de permisos (SUPERADMIN). Se usa en operaciones
 * destructivas como enviar contactos a la papelera o eliminarlos con todo su
 * historial. Debe encadenarse DESPUÉS de `requireAdmin` en la ruta.
 */
export function requireSuperAdmin(
  request: Request,
  response: Response<ErrorResponse>,
  next: NextFunction,
) {
  const authUser = getAuthUser(request);
  if (!authUser) {
    return response.status(401).json({
      status: "error",
      message: "Necesitas iniciar sesión para acceder a este recurso.",
    });
  }
  if (authUser.role !== roles.SUPERADMIN) {
    return response.status(403).json({
      status: "error",
      message:
        "Solo un superadministrador puede enviar a la papelera o eliminar contactos.",
    });
  }
  return next();
}
