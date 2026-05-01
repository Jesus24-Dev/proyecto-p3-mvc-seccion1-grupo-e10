import type { Request, Response, NextFunction } from 'express';
import { ZodObject, ZodError } from 'zod';

export const validate = (schema: ZodObject<any>) => 
  (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({ body: req.body, query: req.query, params: req.params });
      next();
    } catch (e) {
      if (e instanceof ZodError) {
        return res.status(400).json({
          status: "error",
          errors: e.issues.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }

      return res.status(500).json({
        status: "error",
        message: "Internal server error"
      });
    }
  };