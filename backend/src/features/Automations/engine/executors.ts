import type { AutomationRunRepository } from "../automation.run.repository.js";
import { interpolate } from "./context.js";
import { getMessageProvider, NoProviderError, type Channel } from "./providers.js";
import { notify } from "../../Notifications/notification.helper.js";
import type { EngineContext, ExecResult, StepData } from "./types.js";

// Nombre de la variable de contexto que refleja un campo del contacto.
const CONTACT_FIELD_VAR: Record<string, string> = {
  phone: "telefono",
  first_name: "nombre",
  last_name: "apellido",
};

// Etiqueta legible del disparador, para el registro.
const TRIGGER_LABELS: Record<string, string> = {
  contact_created: "Contacto creado",
  tag_added: "Etiqueta agregada",
  package_delivered: "Paquete entregado",
  order_completed: "Envío completado",
  webhook_received: "Webhook recibido",
  manual: "Disparo manual",
};

// Resultado del contacto contra el campo/operador de una condición.
function evaluateCondition(data: StepData, ctx: EngineContext): boolean {
  const { field, operator, value } = data;
  const target = (value ?? "").trim();

  if (field === "tag") {
    switch (operator) {
      case "equals":
        return ctx.tags.includes(target);
      case "not_equals":
        return !ctx.tags.includes(target);
      case "contains":
        return ctx.tags.some((tag) => tag.includes(target));
      case "exists":
        return ctx.tags.length > 0;
      default:
        return false;
    }
  }

  const scalar =
    field === "agency"
      ? ctx.agency
      : field === "package_status"
        ? ctx.packageStatus
        : field === "order_status"
          ? ctx.orderStatus
          : "";

  switch (operator) {
    case "equals":
      return scalar === target;
    case "not_equals":
      return scalar !== target;
    case "contains":
      return scalar.includes(target);
    case "exists":
      return scalar.trim().length > 0;
    default:
      return false;
  }
}

// Valor escalar del contacto para el campo de un switch.
function scalarFor(data: StepData, ctx: EngineContext): string {
  switch (data.field) {
    case "agency":
      return ctx.agency;
    case "package_status":
      return ctx.packageStatus;
    case "order_status":
      return ctx.orderStatus;
    default:
      return "";
  }
}

// Ejecuta un nodo (excepto "wait", que gestiona el motor) y devuelve el
// resultado + la salida por la que continúa el flujo.
export async function executeNode(
  data: StepData,
  ctx: EngineContext,
  repo: AutomationRunRepository,
): Promise<ExecResult> {
  switch (data.kind) {
    case "trigger": {
      const label = TRIGGER_LABELS[data.trigger ?? ""] ?? "Disparador";
      return {
        result: "INFO",
        detail: `Inscrito por: ${label}`,
        branchId: "out",
      };
    }

    case "add_tag": {
      const tag = (data.tag ?? "").trim();
      if (!tag) {
        return { result: "ERROR", detail: "Etiqueta vacía.", branchId: "out" };
      }
      if (!ctx.contactId) {
        return {
          result: "ERROR",
          detail: "Sin contacto al que aplicar la etiqueta.",
          branchId: "out",
        };
      }
      const changed = await repo.appendTag(ctx.contactId, tag);
      // Mantén el contexto al día para pasos posteriores del mismo flujo.
      if (changed && !ctx.tags.includes(tag)) {
        ctx.tags.push(tag);
      }
      return {
        result: "OK",
        detail: changed
          ? `Etiqueta #${tag} aplicada`
          : `El contacto ya tenía #${tag}`,
        branchId: "out",
      };
    }

    case "remove_tag": {
      const tag = (data.tag ?? "").trim();
      if (!tag) {
        return { result: "ERROR", detail: "Etiqueta vacía.", branchId: "out" };
      }
      if (!ctx.contactId) {
        return {
          result: "ERROR",
          detail: "Sin contacto al que quitar la etiqueta.",
          branchId: "out",
        };
      }
      const removed = await repo.removeTag(ctx.contactId, tag);
      if (removed) {
        ctx.tags = ctx.tags.filter((item) => item !== tag);
      }
      return {
        result: "OK",
        detail: removed
          ? `Etiqueta #${tag} quitada`
          : `El contacto no tenía #${tag}`,
        branchId: "out",
      };
    }

    case "update_contact": {
      const field = (data.field ?? "").trim();
      const value = interpolate(data.value ?? "", ctx);
      if (!ctx.contactId) {
        return {
          result: "ERROR",
          detail: "Sin contacto que actualizar.",
          branchId: "out",
        };
      }
      try {
        await repo.updateContactField(ctx.contactId, field, value);
        const varName = CONTACT_FIELD_VAR[field];
        if (varName) {
          ctx.vars[varName] = value;
        }
        return { result: "OK", detail: `Campo "${field}" actualizado`, branchId: "out" };
      } catch (error) {
        return {
          result: "ERROR",
          detail: error instanceof Error ? error.message : "No se pudo actualizar.",
          branchId: "out",
        };
      }
    }

    case "notify_team": {
      const message = interpolate(data.message ?? "", ctx);
      if (!message.trim()) {
        return { result: "ERROR", detail: "Aviso vacío.", branchId: "out" };
      }
      await notify({
        kind: "GENERAL",
        title: "Aviso de automatización",
        body: `${ctx.contactName}: ${message}`,
      });
      return { result: "OK", detail: "Equipo notificado", branchId: "out" };
    }

    case "create_note": {
      const body = interpolate(data.body ?? "", ctx);
      if (!body.trim()) {
        return { result: "ERROR", detail: "Nota vacía.", branchId: "out" };
      }
      if (!ctx.contactId) {
        return {
          result: "ERROR",
          detail: "Sin contacto al que agregar la nota.",
          branchId: "out",
        };
      }
      await repo.createContactNote(ctx.contactId, data.note_kind ?? "NOTE", body);
      return { result: "OK", detail: "Nota creada en la ficha", branchId: "out" };
    }

    case "send_whatsapp":
    case "send_instagram":
    case "send_messenger":
    case "send_email": {
      const channel = data.kind as Channel;
      const to =
        channel === "send_email" ? ctx.vars.email : ctx.vars.telefono;
      const message = interpolate(
        (channel === "send_email" ? data.body : data.message) ?? "",
        ctx,
      );
      try {
        const { detail } = await getMessageProvider().send({
          channel,
          to: to || "",
          message,
          ...(channel === "send_email"
            ? { subject: interpolate(data.subject ?? "", ctx) }
            : {}),
        });
        return { result: "OK", detail, branchId: "out" };
      } catch (error) {
        if (error instanceof NoProviderError) {
          return {
            result: "ERROR",
            detail: error.message,
            branchId: "out",
          };
        }
        return {
          result: "ERROR",
          detail:
            error instanceof Error ? error.message : "No se pudo enviar.",
          branchId: "out",
        };
      }
    }

    case "send_webhook": {
      const url = (data.url ?? "").trim();
      const method = data.method ?? "POST";
      if (!url) {
        return { result: "ERROR", detail: "URL vacía.", branchId: "out" };
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8_000);
      try {
        const init: RequestInit = { method, signal: controller.signal };
        if (method === "POST") {
          init.headers = { "Content-Type": "application/json" };
          init.body = JSON.stringify({ contact: ctx.vars, tags: ctx.tags });
        }
        const response = await fetch(url, init);
        if (response.ok) {
          return {
            result: "OK",
            detail: `${method} ${new URL(url).host} → ${response.status}`,
            branchId: "out",
          };
        }
        return {
          result: "ERROR",
          detail: `${method} ${new URL(url).host} → ${response.status}`,
          branchId: "out",
        };
      } catch (error) {
        const reason =
          error instanceof Error && error.name === "AbortError"
            ? "tiempo de espera agotado"
            : error instanceof Error
              ? error.message
              : "error de red";
        return {
          result: "ERROR",
          detail: `Webhook falló: ${reason}`,
          branchId: "out",
        };
      } finally {
        clearTimeout(timeout);
      }
    }

    case "condition": {
      const pass = evaluateCondition(data, ctx);
      return {
        result: "INFO",
        detail: pass ? "Condición cumplida → Sí" : "Condición no cumplida → No",
        branchId: pass ? "true" : "false",
      };
    }

    case "switch": {
      const scalar = scalarFor(data, ctx);
      const cases = (data.cases ?? []).filter((item) => item.trim().length > 0);
      const matched =
        data.field === "tag"
          ? cases.find((item) => ctx.tags.includes(item))
          : cases.find((item) => item === scalar);
      if (matched) {
        return {
          result: "INFO",
          detail: `Coincide con "${matched}"`,
          branchId: `case:${matched}`,
        };
      }
      return { result: "INFO", detail: "Sin coincidencia → Otro", branchId: "default" };
    }

    default:
      return { result: "INFO", detail: "Paso omitido.", branchId: "out" };
  }
}
