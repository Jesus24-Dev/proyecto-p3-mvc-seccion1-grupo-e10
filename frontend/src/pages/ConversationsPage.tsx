import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Camera,
  Check,
  CheckCheck,
  CheckCircle2,
  MessageCircle,
  MessagesSquare,
  Search,
  Send,
  SquarePen,
  type LucideIcon,
} from "lucide-react";
import { agenciesApi, contactsApi, membershipsApi, usersApi } from "@/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveAgency } from "@/context/AgencyContext";
import { usePageData } from "@/hooks/usePageData";
import { cn } from "@/lib/utils";
import type { UserInformation } from "@/types";

type ChannelId = "whatsapp" | "instagram" | "messenger";

type Channel = {
  id: ChannelId;
  label: string;
  connected: string;
  icon: LucideIcon;
  /** Punto/acento del canal. */
  dot: string;
  /** Color del icono. */
  iconClass: string;
  /** Estilo de la burbuja saliente. */
  outBubble: string;
  outMeta: string;
};

// Canales de conversación (solo UI por ahora; sin backend real).
const CHANNELS: Record<ChannelId, Channel> = {
  whatsapp: {
    id: "whatsapp",
    label: "WhatsApp",
    connected: "Conectado a WhatsApp Business",
    icon: MessageCircle,
    dot: "bg-emerald-500",
    iconClass: "text-emerald-600",
    outBubble:
      "rounded-br-sm bg-emerald-100 text-emerald-950 dark:bg-emerald-500/20 dark:text-emerald-50",
    outMeta: "text-emerald-950/60 dark:text-emerald-100/60",
  },
  instagram: {
    id: "instagram",
    label: "Instagram",
    connected: "Conectado a Instagram Direct",
    icon: Camera,
    dot: "bg-fuchsia-500",
    iconClass: "text-fuchsia-600",
    outBubble:
      "rounded-br-sm bg-fuchsia-100 text-fuchsia-950 dark:bg-fuchsia-500/20 dark:text-fuchsia-50",
    outMeta: "text-fuchsia-950/60 dark:text-fuchsia-100/60",
  },
  messenger: {
    id: "messenger",
    label: "Messenger",
    connected: "Conectado a Facebook Messenger",
    icon: MessagesSquare,
    dot: "bg-blue-500",
    iconClass: "text-blue-600",
    outBubble:
      "rounded-br-sm bg-blue-100 text-blue-950 dark:bg-blue-500/20 dark:text-blue-50",
    outMeta: "text-blue-950/60 dark:text-blue-100/60",
  },
};

const CHANNEL_ORDER: ChannelId[] = ["whatsapp", "instagram", "messenger"];

/** Canal por defecto (determinista) de un contacto por su posición. */
function defaultChannelIdFor(index: number): ChannelId {
  // WhatsApp domina (mitad); el resto se reparte IG/Messenger.
  const cycle = index % 4;
  return cycle === 1 ? "instagram" : cycle === 3 ? "messenger" : "whatsapp";
}

// Una conversación es (contacto × canal): clave compuesta "contactId::canal".
function convoKey(contactId: string, channel: ChannelId): string {
  return `${contactId}::${channel}`;
}
function parseConvoKey(key: string): { contactId: string; channel: ChannelId } {
  const [contactId, channel] = key.split("::");
  return { contactId, channel: channel as ChannelId };
}

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
    Promise.all([
      contactsApi.list(),
      usersApi.list(),
      membershipsApi.list(),
      agenciesApi.list(),
    ]),
  );
  const [contacts, users, memberships, agencies] = data ?? [[], [], [], []];

  const { activeAgencyId } = useActiveAgency();
  const [agencyFilter, setAgencyFilter] = useState<string>(
    () => activeAgencyId ?? "all",
  );
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  /** Conversación activa: clave compuesta "contactId::canal". */
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  /** Conversaciones iniciadas por el usuario (además de las de canal por defecto). */
  const [startedConvos, setStartedConvos] = useState<string[]>([]);
  const [newConvoOpen, setNewConvoOpen] = useState(false);
  const [newConvoContact, setNewConvoContact] = useState("");
  const [newConvoChannel, setNewConvoChannel] = useState<ChannelId>("whatsapp");
  const [draft, setDraft] = useState("");
  /** Mensajes locales por conversación (clave compuesta). */
  const [localMessages, setLocalMessages] = useState<
    Record<string, ChatMessage[]>
  >({});
  /** Conversaciones ya abiertas (limpia el contador de no leídos). */
  const [readKeys, setReadKeys] = useState<Set<string>>(() => new Set());

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
  const contactById = useMemo(
    () => new Map(contacts.map((contact) => [contact.id, contact])),
    [contacts],
  );

  const defaultChannelId = (contactId: string): ChannelId =>
    defaultChannelIdFor(contactIndexById.get(contactId) ?? 0);

  // Lista de conversaciones (contacto × canal): la de canal por defecto de
  // cada contacto + las que el usuario haya iniciado en otros canales.
  const conversations = useMemo(() => {
    const keys = new Set<string>();
    contacts.forEach((contact, index) => {
      keys.add(convoKey(contact.id, defaultChannelIdFor(index)));
    });
    for (const key of startedConvos) {
      keys.add(key);
    }
    return [...keys]
      .map((key) => {
        const { contactId, channel } = parseConvoKey(key);
        const contact = contactById.get(contactId);
        return contact ? { key, contact, channel } : null;
      })
      .filter((c): c is { key: string; contact: UserInformation; channel: ChannelId } =>
        Boolean(c),
      );
  }, [contacts, contactById, contactIndexById, startedConvos]);

  /** Primera membresía de cada usuario: user_id → agency_id. */
  const agencyIdByUserId = useMemo(() => {
    const map = new Map<string, string>();

    for (const membership of memberships) {
      if (!map.has(membership.user_id)) {
        map.set(membership.user_id, membership.agency_id);
      }
    }

    return map;
  }, [memberships]);

  const agencyNameById = useMemo(
    () => new Map(agencies.map((agency) => [agency.id, agency.name])),
    [agencies],
  );

  const agencyFilterItems = useMemo(
    () => [
      { value: "all", label: "Todas las agencias" },
      ...agencies.map((agency) => ({ value: agency.id, label: agency.name })),
    ],
    [agencies],
  );

  /** Valor efectivo del filtro: cae a "todas" si la agencia guardada ya no existe. */
  const agencyFilterValue =
    agencyFilter === "all" || agencyNameById.has(agencyFilter)
      ? agencyFilter
      : "all";

  function agencyLabelFor(contact: UserInformation) {
    const agencyId = agencyIdByUserId.get(contact.user_id);
    return (agencyId && agencyNameById.get(agencyId)) || "Sin agencia";
  }

  const messagesFor = useMemo(
    () => (key: string) => {
      const { contactId, channel } = parseConvoKey(key);
      const index = contactIndexById.get(contactId) ?? 0;
      // Los mensajes de ejemplo solo pertenecen al canal por defecto; los otros
      // canales empiezan vacíos (conversación nueva por ese proveedor).
      const base =
        channel === defaultChannelIdFor(index) ? fixtureFor(index) : [];
      return [...base, ...(localMessages[key] ?? [])];
    },
    [contactIndexById, localMessages],
  );

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();

    return conversations.filter(({ contact, channel }) => {
      if (
        agencyFilterValue !== "all" &&
        agencyIdByUserId.get(contact.user_id) !== agencyFilterValue
      ) {
        return false;
      }
      if (channelFilter !== "all" && channel !== channelFilter) {
        return false;
      }
      return !query || fullName(contact).toLowerCase().includes(query);
    });
  }, [
    conversations,
    search,
    agencyFilterValue,
    agencyIdByUserId,
    channelFilter,
  ]);

  const selected = selectedKey ? parseConvoKey(selectedKey) : null;
  const selectedContact = selected
    ? contactById.get(selected.contactId) ?? null
    : null;
  const selectedChannel = selected
    ? CHANNELS[selected.channel]
    : CHANNELS.whatsapp;
  const threadMessages =
    selectedKey && selectedContact ? messagesFor(selectedKey) : [];

  useEffect(() => {
    const thread = threadRef.current;
    if (thread) {
      thread.scrollTop = thread.scrollHeight;
    }
  }, [threadMessages.length, selectedKey]);

  function openConversation(key: string) {
    setSelectedKey(key);
    setDraft("");
    setReadKeys((current) => new Set(current).add(key));
  }

  function openNewConversation() {
    setNewConvoContact(contacts[0]?.id ?? "");
    setNewConvoChannel("whatsapp");
    setNewConvoOpen(true);
  }

  function startConversation() {
    if (!newConvoContact) {
      return;
    }
    const key = convoKey(newConvoContact, newConvoChannel);
    if (newConvoChannel !== defaultChannelId(newConvoContact)) {
      setStartedConvos((current) =>
        current.includes(key) ? current : [...current, key],
      );
    }
    // Asegura que la conversación sea visible al abrirla.
    setChannelFilter("all");
    setSearch("");
    openConversation(key);
    setNewConvoOpen(false);
  }

  function appendMessage(key: string, message: ChatMessage) {
    setLocalMessages((current) => ({
      ...current,
      [key]: [...(current[key] ?? []), message],
    }));
  }

  function updateStatus(key: string, messageId: string, status: MessageStatus) {
    setLocalMessages((current) => ({
      ...current,
      [key]: (current[key] ?? []).map((message) =>
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
    if (!text || !selectedContact || !selectedKey) {
      return;
    }

    const scriptIndex =
      (contactIndexById.get(selectedContact.id) ?? 0) % SCRIPTS.length;
    const messageId = `local-${nextIdRef.current++}`;
    const key = selectedKey;

    appendMessage(key, {
      id: messageId,
      direction: "out",
      text,
      time: nowTime(),
      day: "Hoy",
      status: "enviado",
    });
    setDraft("");

    schedule(() => updateStatus(key, messageId, "entregado"), 800);
    schedule(() => updateStatus(key, messageId, "leído"), 2000);
    schedule(() => {
      appendMessage(key, {
        id: `local-${nextIdRef.current++}`,
        direction: "in",
        text: AUTO_REPLIES[scriptIndex],
        time: nowTime(),
        day: "Hoy",
      });
    }, 3000);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="Conversaciones"
        description="Chats de WhatsApp, Instagram y Messenger de tus contactos, sincronizados en un solo lugar para dar seguimiento a envíos."
      >
        <Button onClick={openNewConversation} disabled={contacts.length === 0}>
          <SquarePen data-icon="inline-start" aria-hidden="true" />
          Nueva conversación
        </Button>
      </PageHeader>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="min-h-[480px] flex-1 overflow-hidden p-0">
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
              <div className="grid gap-2 border-b p-3">
                <Select
                  items={agencyFilterItems}
                  value={agencyFilterValue}
                  onValueChange={(value) => setAgencyFilter(value as string)}
                >
                  <SelectTrigger
                    className="w-full"
                    aria-label="Filtrar conversaciones por agencia"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {agencyFilterItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  items={[
                    { value: "all", label: "Todos los canales" },
                    ...CHANNEL_ORDER.map((id) => ({
                      value: id,
                      label: CHANNELS[id].label,
                    })),
                  ]}
                  value={channelFilter}
                  onValueChange={(value) => setChannelFilter(value as string)}
                >
                  <SelectTrigger
                    className="w-full"
                    aria-label="Filtrar por canal"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los canales</SelectItem>
                    {CHANNEL_ORDER.map((id) => {
                      const ChannelIcon = CHANNELS[id].icon;
                      return (
                        <SelectItem key={id} value={id}>
                          <span className="flex items-center gap-2">
                            <ChannelIcon
                              className={cn("size-4", CHANNELS[id].iconClass)}
                              aria-hidden="true"
                            />
                            {CHANNELS[id].label}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
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
                {filteredConversations.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">
                    Ninguna conversación coincide con la búsqueda ni los filtros.
                  </p>
                ) : (
                  <ul>
                    {filteredConversations.map(({ key, contact, channel }) => {
                      const index = contactIndexById.get(contact.id) ?? 0;
                      const messages = messagesFor(key);
                      const last = messages[messages.length - 1];
                      const isDefault = channel === defaultChannelIdFor(index);
                      const unread =
                        readKeys.has(key) || !isDefault
                          ? 0
                          : baseUnread(index);
                      const isSelected = key === selectedKey;
                      const chan = CHANNELS[channel];
                      const ChannelIcon = chan.icon;

                      return (
                        <li key={key}>
                          <button
                            type="button"
                            onClick={() => openConversation(key)}
                            className={cn(
                              "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors outline-none hover:bg-muted/60 focus-visible:bg-muted",
                              isSelected && "bg-muted",
                            )}
                          >
                            <span className="relative shrink-0">
                              <span
                                aria-hidden="true"
                                className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary"
                              >
                                {initials(contact)}
                              </span>
                              <span
                                aria-hidden="true"
                                title={chan.label}
                                className="absolute -right-0.5 -bottom-0.5 flex size-4 items-center justify-center rounded-full border-2 border-background bg-background"
                              >
                                <ChannelIcon
                                  className={cn("size-3", chan.iconClass)}
                                />
                              </span>
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-baseline justify-between gap-2">
                                <span className="truncate text-sm font-medium">
                                  {fullName(contact)}
                                </span>
                                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                                  {last
                                    ? last.day === "Ayer"
                                      ? "Ayer"
                                      : last.time
                                    : ""}
                                </span>
                              </span>
                              <span className="mt-0.5 flex items-center gap-1.5">
                                <Badge
                                  variant="secondary"
                                  className="h-4 max-w-full px-1.5 text-xs font-normal text-muted-foreground"
                                >
                                  <span className="truncate">
                                    {agencyLabelFor(contact)}
                                  </span>
                                </Badge>
                                <span
                                  className={cn(
                                    "text-[0.6875rem] font-medium",
                                    chan.iconClass,
                                  )}
                                >
                                  {chan.label}
                                </span>
                              </span>
                              <span className="flex items-center justify-between gap-2">
                                <span className="truncate text-xs text-muted-foreground">
                                  {last
                                    ? `${last.direction === "out" ? "Tú: " : ""}${last.text}`
                                    : "Conversación nueva"}
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
                      onClick={() => setSelectedKey(null)}
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
                          className={cn(
                            "size-1.5 rounded-full",
                            selectedChannel.dot,
                          )}
                        />
                        {selectedChannel.label} ·{" "}
                        {(contactIndexById.get(selectedContact.id) ?? 0) % 2 === 0
                          ? "En línea"
                          : "Sincronizado"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-4 py-1.5">
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CheckCircle2
                        className={cn("size-3.5", selectedChannel.iconClass)}
                        aria-hidden="true"
                      />
                      {selectedChannel.connected}
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
                                    ? selectedChannel.outBubble
                                    : "rounded-bl-sm border bg-background",
                                )}
                              >
                                <p className="whitespace-pre-line">
                                  {message.text}
                                </p>
                                <span
                                  className={cn(
                                    "mt-0.5 flex items-center justify-end gap-1 text-xs tabular-nums",
                                    message.direction === "out"
                                      ? selectedChannel.outMeta
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

      <Dialog open={newConvoOpen} onOpenChange={setNewConvoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva conversación</DialogTitle>
            <DialogDescription>
              Elige el contacto y el canal por el que quieres escribirle.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="new-convo-contact">Contacto</Label>
            <Select
              items={contacts.map((contact) => ({
                value: contact.id,
                label: fullName(contact),
              }))}
              value={newConvoContact}
              onValueChange={(value) => setNewConvoContact(value as string)}
            >
              <SelectTrigger id="new-convo-contact" className="w-full">
                <SelectValue placeholder="Elige un contacto" />
              </SelectTrigger>
              <SelectContent>
                {contacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {fullName(contact)}
                    <span className="ms-1 text-muted-foreground">
                      · {agencyLabelFor(contact)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Canal</Label>
            <div className="flex flex-wrap gap-2">
              {CHANNEL_ORDER.map((id) => {
                const ChannelIcon = CHANNELS[id].icon;
                const active = newConvoChannel === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setNewConvoChannel(id)}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      active
                        ? "border-ring bg-muted font-medium"
                        : "hover:bg-muted/60",
                    )}
                  >
                    <ChannelIcon
                      className={cn("size-4", CHANNELS[id].iconClass)}
                      aria-hidden="true"
                    />
                    {CHANNELS[id].label}
                  </button>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setNewConvoOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={startConversation}
              disabled={!newConvoContact}
            >
              <SquarePen data-icon="inline-start" aria-hidden="true" />
              Iniciar conversación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
