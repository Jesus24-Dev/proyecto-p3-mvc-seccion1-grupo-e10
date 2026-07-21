-- Nuevo nivel de permisos máximo. Se agrega en su propia migración porque
-- PostgreSQL exige confirmar el valor del enum antes de poder usarlo.
ALTER TYPE "roles" ADD VALUE IF NOT EXISTS 'SUPERADMIN';
