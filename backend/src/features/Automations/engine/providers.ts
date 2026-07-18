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

// Proveedor por defecto: no hay integraciones reales cableadas, así que
// rechaza el envío de forma honesta.
class UnconfiguredProvider implements MessageProvider {
  async send({ channel }: { channel: Channel }): Promise<{ detail: string }> {
    throw new NoProviderError(channel);
  }
}

let provider: MessageProvider = new UnconfiguredProvider();

export function getMessageProvider(): MessageProvider {
  return provider;
}

// Punto de extensión para conectar un proveedor real más adelante.
export function setMessageProvider(next: MessageProvider): void {
  provider = next;
}
