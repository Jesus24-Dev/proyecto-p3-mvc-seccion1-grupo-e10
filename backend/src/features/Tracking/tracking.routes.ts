import { Router } from "express";
import type { Request, Response } from "express";
import {
  PackageService,
  PackageServiceError,
} from "../Packages/package.service.js";
import { PackageRepository } from "../Packages/package.repository.js";
import type { PublicTrackingResponse } from "../Packages/package.types.js";
import type { ErrorResponse } from "../../shared/error.responses.types.js";

// Router PÚBLICO de rastreo: cualquiera puede consultar el recorrido de un
// paquete con su código, sin token de administrador. La respuesta es una
// versión recortada (sin datos personales del contacto).
const router = Router();

const service = new PackageService(new PackageRepository());

router.get(
  "/:code",
  async (
    req: Request<{ code: string }>,
    res: Response<PublicTrackingResponse | ErrorResponse>,
  ) => {
    try {
      const tracking = await service.getPublicTracking(req.params.code);
      return res.status(200).json(tracking);
    } catch (error) {
      if (error instanceof PackageServiceError) {
        return res
          .status(error.statusCode)
          .json({ status: "error", message: error.message });
      }
      return res
        .status(500)
        .json({ status: "error", message: "No se pudo obtener el rastreo." });
    }
  },
);

export const TrackingRoutes = router;
