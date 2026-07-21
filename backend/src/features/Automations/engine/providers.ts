// Proveedores de mensajería para los pasos "enviar WhatsApp / Instagram /
// Messenger / email". Se intenta el envío real; sin un proveedor configurado
// se lanza NoProviderError y el motor lo registra como error sin cortar el
// flujo. La interfaz permite conectar un proveedor real (SMTP, WhatsApp API)
// sin tocar el motor.

export class NoProviderError extends Error {
  constructor(channel: string) {
    super(`Canal "${channel}" sin proveedor configurado.`);
    this.name = "NoProviderError";
  }
}

export type Channel =
  | "send_whatsapp"
  | "send_instagram"
  | "send_messenger"
  | "send_email";

export interface MessageProvider {
  send(input: {
    channel: Channel;
    to: string;
    subject?: string;
    message: string;
  }): Promise<{ detail: string }>;
}

// Proveedor por defecto: el correo se envía con Resend (mailer). Los canales
// de mensajería (WhatsApp/Instagram/Messenger) no tienen integración real, así
// que se rechazan de forma honesta.
class DefaultProvider implements MessageProvider {
  async send({
    channel,
    to,
    subject,
    message,
  }: {
    channel: Channel;
    to: string;
    subject?: string;
    message: string;
  }): Promise<{ detail: string }> {
    if (channel !== "send_email") {
      throw new NoProviderError(channel);
    }
    if (!to.trim()) {
      throw new Error("El contacto no tiene un correo para enviarle el email.");
    }
    const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#111;">${message
      .split("\n")
      .map((line) => `<p style="margin:0 0 12px;">${line}</p>`)
      .join("")}</div>`;
    const result = await sendEmail({
      to,
      subject: subject?.trim() || "Mensaje de Dr Logistics",
      html,
    });
    if (!result.sent) {
      throw new Error("Resend rechazó el envío del correo.");
    }
    return {
      detail: result.simulated
        ? `Email simulado a ${to} (define RESEND_API_KEY para enviar)`
        : `Email enviado a ${to} vía Resend`,
    };
  }
}

let provider: MessageProvider = new DefaultProvider();

export function getMessageProvider(): MessageProvider {
  return provider;
}

// Punto de extensión para conectar un proveedor real más adelante.
export function setMessageProvider(next: MessageProvider): void {
  provider = next;
}
