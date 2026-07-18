import { AutomationRepository } from "../automation.repository.js";
import { AutomationRunRepository } from "../automation.run.repository.js";
import { AutomationEngine } from "./engine.js";

// Instancias singleton del motor y sus repositorios, compartidas por las
// rutas, el scheduler y los disparadores de dominio.
export const automationRepo = new AutomationRepository();
export const runRepo = new AutomationRunRepository();
export const engine = new AutomationEngine(runRepo, automationRepo);
