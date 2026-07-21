import { engine } from "./instance.js";
import { fireTagAdded } from "./domainEvents.js";

// Encadena el disparador tag_added: cuando un paso "agregar etiqueta" aplica
// una etiqueta nueva, otros flujos que escuchan "tag_added" pueden inscribir
// al contacto. El guard de reinscripción del motor evita bucles.
engine.setTagAddedHook((contactId, tag) => {
  void fireTagAdded(contactId, tag).catch((error) => {
    console.error("[automations] encadenado tag_added falló", error);
  });
});

export { engine, runRepo, automationRepo } from "./instance.js";
export {
  fireContactCreated,
  fireTagAdded,
  firePackageDelivered,
  fireOrderCompleted,
  fireStageChanged,
  safeFire,
} from "./domainEvents.js";
export { startScheduler, stopScheduler } from "./scheduler.js";
export {
  subscribeAutomationUpdates,
  type AutomationUpdate,
} from "./events.js";
