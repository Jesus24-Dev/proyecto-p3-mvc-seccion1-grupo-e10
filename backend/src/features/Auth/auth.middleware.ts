import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { roles } from "../../generated/prisma/client.js";


type AuthTokenPayload = {
  sub: string;
  email: string;
  role: roles;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

function getBearerToken(request: Request) {
  const authorizationHeader = request.headers.authorization;

  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.slice("Bearer ".length).trim();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ status: "error", message: "Autenticación requerida" });

  const secret = process.env.JWT_SECRET?.trim();
  try {
    const payload = jwt.verify(token, secret!) as AuthTokenPayload;
    req.user = payload; // Inyectamos el payload para su uso posterior
    return next();
  } catch {
    return res.status(401).json({ status: "error", message: "Token inválido o expirado" });
  }
}

export function requireRoles(allowedRoles: roles[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;
    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        status: "error",
        message: "No tienes permisos para acceder a este recurso",
      });
    }
    next();
  };
}
