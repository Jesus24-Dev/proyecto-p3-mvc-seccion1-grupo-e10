import { engine, runRepo } from "./instance.js";

// "Cron" del motor: cada ~1.5 s despierta las ejecuciones cuya espera venció
// y las avanza. Sin dependencias externas; un tick basta y es fácil de ver
// en una demo.

const TICK_MS = 1_500;
let timer: NodeJS.Timeout | null = null;
let running = false; // evita solapar ticks si uno tarda más de lo normal

export function startScheduler(): void {
  if (timer) {
    return;
  }
  timer = setInterval(async () => {
    if (running) {
      return;
    }
    running = true;
    try {
      const due = await runRepo.findDueWaiting(new Date());
      for (const run of due) {
        await engine.advance(run.id);
      }
    } catch (error) {
      console.error("[automations] tick del scheduler falló", error);
    } finally {
      running = false;
    }
  }, TICK_MS);
  console.log("[automations] scheduler iniciado");
}

export function stopScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
