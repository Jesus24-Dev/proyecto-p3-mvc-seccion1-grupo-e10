import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  CheckCircle2,
  MessageCircle,
  Search,
  Send,
} from "lucide-react";
import { contactsApi, usersApi } from "@/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageData } from "@/hooks/usePageData";
import { cn } from "@/lib/utils";
import type { UserInformation } from "@/types";

type MessageStatus = "enviado" | "entregado" | "leído";

type ChatMessage = {
  id: string;
  direction: "in" | "out";
  text: string;
  /** Hora de reloj, ej. "10:24". */
  time: string;
  day: "Ayer" | "Hoy";
  /** Solo aplica a mensajes salientes. */
  status?: MessageStatus;
};

type FixtureMessage = Omit<ChatMessage, "id">;

/**
 * Historial simulado: tres guiones de conversación courier que se asignan
 * de forma determinista a cada contacto real según su posición (índice % 3).
 */
const SCRIPTS: FixtureMessage[][] = [
  // Guion 0: seguimiento de paquete.
  [
    {
      direction: "in",
      text: "Hola, buenas tardes. ¿Me pueden dar el estatus de mi paquete con código DOM-4821?",
      time: "17:32",
      day: "Ayer",
    },
    {
      direction: "out",
      text: "¡Hola! Claro, con gusto. Su paquete llegó anoche al centro de distribución de Valencia.",
      time: "17:40",
      day: "Ayer",
      status: "leído",
    },
    {
      direction: "in",
      text: "Perfecto, ¿y cuándo llega a la agencia?",
      time: "09:15",
      day: "Hoy",
    },
    {
      direction: "out",
      text: "Sale en la ruta de hoy. Debería estar disponible para retiro después de las 2:00 pm.",
      time: "09:18",
      day: "Hoy",
      status: "leído",
    },
    {
      direction: "in",
      text: "Excelente, muchas gracias por la atención.",
      time: "10:24",
      day: "Hoy",
    },
  ],
  // Guion 1: aviso de entrega y retiro en agencia.
  [
    {
      direction: "out",
      text: "Buenos días, le informamos que su paquete fue despachado desde Caracas y llega mañana a la agencia Barquisimeto Centro.",
      time: "08:05",
      day: "Ayer",
      status: "leído",
    },
    {
      direction: "in",
      text: "Gracias por el aviso. ¿Necesito llevar algún documento para retirarlo?",
      time: "08:31",
      day: "Ayer",
    },
    {
      direction: "out",
      text: "Solo su cédula y el código de rastreo que le enviamos por este chat.",
      time: "08:34",
      day: "Ayer",
      status: "leído",
    },
    {
      direction: "in",
      text: "Listo, paso mañana temprano entonces. ¡Gracias!",
      time: "11:02",
      day: "Hoy",
    },
  ],
  // Guion 2: coordinación de retiro a domicilio.
  [
    {
      direction: "in",
      text: "Hola, quiero enviar dos cajas a Maracaibo. ¿Hacen retiro a domicilio?",
      time: "08:47",
      day: "Hoy",
    },
    {
      direction: "out",
      text: "¡Hola! Sí, tenemos retiro a domicilio. ¿Me confirma la dirección y el peso aproximado?",
      time: "08:52",
      day: "Hoy",
      status: "leído",
    },
    {
      direction: "in",
      text: "Av. Bolívar, Res. El Parque, torre B. Son unos 12 kg entre las dos cajas.",
      time: "08:58",
      day: "Hoy",
    },
    {
      direction: "out",
      text: "Perfecto, agendamos el retiro para hoy entre 1:00 pm y 3:00 pm. El motorizado le escribe al llegar.",
      time: "09:03",
      day: "Hoy",
      status: "entregado",
    },
  ],
];

const AUTO_REPLIES = [
  "Recibido, gracias por la información. (simulación de sincronización)",
  "Perfecto, cualquier cosa le aviso por aquí. (simulación de sincronización)",
  "Listo, muchas gracias por coordinar. (simulación de sincronización)",
];

function fullName(contact: UserInformation) {
  return `${contact.first_name} ${contact.last_name}`;
}

function initials(contact: UserInformation) {
  return `${contact.first_name.charAt(0)}${contact.last_name.charAt(0)}`.toUpperCase();
}

function nowTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes(),
  ).padStart(2, "0")}`;
}

/** Cantidad de no leídos simulada, determinista por posición del contacto. */
function baseUnread(index: number) {
  const cycle = index % 4;
  return cycle === 1 ? 2 : cycle === 3 ? 1 : 0;
}

function fixtureFor(index: number): ChatMessage[] {
  return SCRIPTS[index % SCRIPTS.length].map((message, position) => ({
    ...message,
    id: `fixture-${position}`,
  }));
}

function StatusTicks({ status }: { status: MessageStatus }) {
  if (status === "enviado") {
    return (
      <Check className="size-3.5 text-muted-foreground" aria-hidden="true" />
    );
  }

  return (
    <CheckCheck
      className={cn(
        "size-3.5",
        status === "leído" ? "text-sky-500" : "text-muted-foreground",
      )}
      aria-hidden="true"
    />
  );
}

export function ConversationsPage() {
  const { data, isLoading, error } = usePageData(() =>
    Promise.all([contactsApi.list(), usersApi.list()]),
  );
  const [contacts, users] = data ?? [[], []];

  const [search, setSearch] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    null,
  );
  const [draft, setDraft] = useState("");
  /** Mensajes agregados localmente (envíos y respuestas simuladas), por contacto. */
  const [localMessages, setLocalMessages] = useState<
    Record<string, ChatMessage[]>
  >({});
  /** Contactos cuya conversación ya se abrió (limpia el contador de no leídos). */
  const [readContactIds, setReadContactIds] = useState<Set<string>>(
    () => new Set(),
  );

  const timersRef = useRef<number[]>([]);
  const nextIdRef = useRef(0);
  const threadRef = useRef<HTMLDivElement | null>(null);

  useEffect(
    () => () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
    },
    [],
  );

  const userById = useMemo(
    () => new Map(users.map((user) => [user.id, user])),
    [users],
  );

  const contactIndexById = useMemo(
    () => new Map(contacts.map((contact, index) => [contact.id, index])),
    [contacts],
  );

  const messagesFor = useMemo(
    () => (contactId: string) => {
      const index = contactIndexById.get(contactId) ?? 0;
      return [...fixtureFor(index), ...(localMessages[contactId] ?? [])];
    },
    [contactIndexById, localMessages],
  );

  const filteredContacts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return contacts;
    }

    return contacts.filter((contact) =>
      fullName(contact).toLowerCase().includes(query),
    );
  }, [contacts, search]);

  const selectedContact =
    contacts.find((contact) => contact.id === selectedContactId) ?? null;
  const threadMessages = selectedContact ? messagesFor(selectedContact.id) : [];

  useEffect(() => {
    const thread = threadRef.current;
    if (thread) {
      thread.scrollTop = thread.scrollHeight;
    }
  }, [threadMessages.length, selectedContactId]);

  function openConversation(contactId: string) {
    setSelectedContactId(contactId);
    setDraft("");
    setReadContactIds((current) => {
      const next = new Set(current);
      next.add(contactId);
      return next;
    });
  }

  function appendMessage(contactId: string, message: ChatMessage) {
    setLocalMessages((current) => ({
      ...current,
      [contactId]: [...(current[contactId] ?? []), message],
    }));
  }

  function updateStatus(
    contactId: string,
    messageId: string,
    status: MessageStatus,
  ) {
    setLocalMessages((current) => ({
      ...current,
      [contactId]: (current[contactId] ?? []).map((message) =>
        message.id === messageId ? { ...message, status } : message,
      ),
    }));
  }

  function schedule(callback: () => void, delay: number) {
    timersRef.current.push(window.setTimeout(callback, delay));
  }

  function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const text = draft.trim();
    if (!text || !selectedContact) {
      return;
    }

    const contactId = selectedContact.id;
    const scriptIndex =
      (contactIndexById.get(contactId) ?? 0) % SCRIPTS.length;
    const messageId = `local-${nextIdRef.current++}`;

    appendMessage(contactId, {
      id: messageId,
      direction: "out",
      text,
      time: nowTime(),
      day: "Hoy",
      status: "enviado",
    });
    setDraft("");

    schedule(() => updateStatus(contactId, messageId, "entregado"), 800);
    schedule(() => updateStatus(contactId, messageId, "leído"), 2000);
    schedule(() => {
      appendMessage(contactId, {
        id: `local-${nextIdRef.current++}`,
        direction: "in",
        text: AUTO_REPLIES[scriptIndex],
        time: nowTime(),
        day: "Hoy",
      });
    }, 3000);
  }

  return (
    <>
      <PageHeader
        title="Conversaciones"
        description="Los chats de WhatsApp de tus contactos, sincronizados con el panel para dar seguimiento a envíos sin salir de aquí."
      />

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="h-[calc(100vh-16rem)] min-h-[480px] overflow-hidden p-0">
        {isLoading ? (
          <div className="grid h-full grid-cols-1 grid-rows-[minmax(0,1fr)] md:grid-cols-[20rem_1fr]">
            <div className="grid content-start gap-4 overflow-hidden border-r p-4">
              <Skeleton className="h-8 w-full" />
              {[0, 1, 2, 3, 4].map((row) => (
                <div key={row} className="flex items-center gap-3">
                  <Skeleton className="size-10 shrink-0 rounded-full" />
                  <div className="grid w-full gap-1.5">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden items-center justify-center md:flex">
              <Skeleton className="h-5 w-56" />
            </div>
          </div>
        ) : contacts.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="Aún no hay conversaciones"
            hint="Cuando registres contactos, sus chats de WhatsApp aparecerán aquí sincronizados automáticamente."
          />
        ) : (
          <div className="grid h-full grid-cols-1 grid-rows-[minmax(0,1fr)] md:grid-cols-[20rem_1fr]">
            {/* Lista de chats */}
            <div
              className={cn(
                "min-h-0 flex-col md:flex md:border-r",
                selectedContact ? "hidden" : "flex",
              )}
            >
              <div className="border-b p-3">
                <div className="relative">
                  <Search
                    className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar conversación"
                    aria-label="Buscar conversación"
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {filteredContacts.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">
                    Ninguna conversación coincide con la búsqueda.
                  </p>
                ) : (
                  <ul>
                    {filteredContacts.map((contact) => {
                      const index = contactIndexById.get(contact.id) ?? 0;
                      const messages = messagesFor(contact.id);
                      const last = messages[messages.length - 1];
                      const unread = readContactIds.has(contact.id)
                        ? 0
                        : baseUnread(index);
                      const isSelected = contact.id === selectedContactId;

                      return (
                        <li key={contact.id}>
                          <button
                            type="button"
                            onClick={() => openConversation(contact.id)}
                            className={cn(
                              "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors outline-none hover:bg-muted/60 focus-visible:bg-muted",
                              isSelected && "bg-muted",
                            )}
                          >
                            <span
                              aria-hidden="true"
                              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary"
                            >
                              {initials(contact)}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-baseline justify-between gap-2">
                                <span className="truncate text-sm font-medium">
                                  {fullName(contact)}
                                </span>
                                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                                  {last.day === "Ayer" ? "Ayer" : last.time}
                                </span>
                              </span>
                              <span className="flex items-center justify-between gap-2">
                                <span className="truncate text-xs text-muted-foreground">
                                  {last.direction === "out" ? "Tú: " : ""}
                                  {last.text}
                                </span>
                                {unread > 0 && (
                                  <Badge
                                    className="shrink-0 rounded-full bg-emerald-600 text-white tabular-nums"
                                    aria-label={`${unread} mensajes sin leer`}
                                  >
                                    {unread}
                                  </Badge>
                                )}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            {/* Hilo de conversación */}
            <div
              className={cn(
                "min-h-0 flex-col md:flex",
                selectedContact ? "flex" : "hidden",
              )}
            >
              {selectedContact ? (
                <>
                  <div className="flex items-center gap-3 border-b px-4 py-3">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="md:hidden"
                      aria-label="Volver a la lista de conversaciones"
                      onClick={() => setSelectedContactId(null)}
                    >
                      <ArrowLeft aria-hidden="true" />
                    </Button>
                    <span
                      aria-hidden="true"
                      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary"
                    >
                      {initials(selectedContact)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {fullName(selectedContact)}
                      </p>
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span
                          aria-hidden="true"
                          className="size-1.5 rounded-full bg-emerald-500"
                        />
                        {(contactIndexById.get(selectedContact.id) ?? 0) % 2 ===
                        0
                          ? "WhatsApp · En línea"
                          : "WhatsApp · Sincronizado"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-4 py-1.5">
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CheckCircle2
                        className="size-3.5 text-emerald-600"
                        aria-hidden="true"
                      />
                      Conectado a WhatsApp Business
                    </p>
                    <p className="hidden truncate text-xs text-muted-foreground sm:block">
                      {userById.get(selectedContact.user_id)?.email ?? ""}
                    </p>
                  </div>

                  <div
                    ref={threadRef}
                    aria-live="polite"
                    className="min-h-0 flex-1 overflow-y-auto bg-muted/30 px-4 py-3"
                  >
                    <div className="grid gap-2">
                      {threadMessages.map((message, position) => {
                        const previous = threadMessages[position - 1];
                        const showDayChip =
                          !previous || previous.day !== message.day;

                        return (
                          <div key={message.id} className="grid gap-2">
                            {showDayChip && (
                              <div className="my-1 flex justify-center">
                                <span className="rounded-full border bg-background px-2.5 py-0.5 text-xs text-muted-foreground">
                                  {message.day}
                                </span>
                              </div>
                            )}
                            <div
                              className={cn(
                                "flex",
                                message.direction === "out"
                                  ? "justify-end"
                                  : "justify-start",
                              )}
                            >
                              <div
                                className={cn(
                                  "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                                  message.direction === "out"
                                    ? "rounded-br-sm bg-emerald-100 text-emerald-950"
                                    : "rounded-bl-sm border bg-background",
                                )}
                              >
                                <p className="whitespace-pre-line">
                                  {message.text}
                                </p>
                                <span
                                  className={cn(
                                    "mt-0.5 flex items-center justify-end gap-1 text-[0.6875rem] tabular-nums",
                                    message.direction === "out"
                                      ? "text-emerald-950/60"
                                      : "text-muted-foreground",
                                  )}
                                >
                                  {message.time}
                                  {message.direction === "out" &&
                                    message.status && (
                                      <StatusTicks status={message.status} />
                                    )}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <form
                    onSubmit={handleSend}
                    className="flex items-center gap-2 border-t px-3 py-2.5"
                  >
                    <Input
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder="Escribe un mensaje"
                      aria-label="Escribe un mensaje"
                      autoComplete="off"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      className="shrink-0 rounded-full"
                      aria-label="Enviar mensaje"
                      disabled={!draft.trim()}
                    >
                      <Send aria-hidden="true" />
                    </Button>
                  </form>
                </>
              ) : (
                <div className="hidden h-full flex-col items-center justify-center gap-2 px-6 text-center md:flex">
                  <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <MessageCircle className="size-5" aria-hidden="true" />
                  </span>
                  <p className="font-medium">Selecciona una conversación</p>
                  <p className="max-w-sm text-sm text-balance text-muted-foreground">
                    Elige un contacto de la lista para ver su historial de
                    WhatsApp sincronizado.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
