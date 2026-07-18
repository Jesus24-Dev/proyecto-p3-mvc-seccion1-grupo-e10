// Traducción de un paso "esperar" a milisegundos reales.
//
// En modo demo (por defecto en este proyecto) las esperas se comprimen a
// segundos para poder VER un flujo completarse en vivo; con
// AUTOMATIONS_DEMO_SPEED=false se usan las duraciones reales.

export function isDemoSpeed(): boolean {
  return (process.env.AUTOMATIONS_DEMO_SPEED ?? "true").toLowerCase() !== "false";
}

const REAL_MS: Record<string, number> = {
  minutes: 60_000,
  hours: 3_600_000,
  days: 86_400_000,
};

// Compresión demo: minutos→1s, horas→3s, días→5s por unidad.
const DEMO_MS: Record<string, number> = {
  minutes: 1_000,
  hours: 3_000,
  days: 5_000,
};

export function resolveWaitMs(
  amount: number | undefined,
  unit: string | undefined,
): number {
  const count = Math.max(1, Number(amount) || 1);
  const key = unit ?? "days";
  if (isDemoSpeed()) {
    return count * (DEMO_MS[key] ?? 5_000);
  }
  return count * (REAL_MS[key] ?? 86_400_000);
}
