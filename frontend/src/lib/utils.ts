import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Estilo destacado para las acciones de IA ("Generar con IA"): degradado con
 * el color del tema activo (--primary) y texto blanco, muy visible.
 */
export const AI_BUTTON_CLASS =
  "border-0 bg-[linear-gradient(135deg,var(--primary),color-mix(in_oklch,var(--primary),#ffffff_38%))] text-white shadow-md shadow-primary/30 transition hover:brightness-110"

