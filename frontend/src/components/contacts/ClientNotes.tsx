import { useState, type FormEvent } from "react";
import { MessageSquarePlus, Trash2 } from "lucide-react";
import { clientNotesApi } from "@/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutationHandler, usePageData } from "@/hooks/usePageData";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { NoteKind } from "@/types";

const KIND_META: Record<
  NoteKind,
  { label: string; className: string }
> = {
  NOTE: { label: "Nota", className: "bg-muted text-muted-foreground" },
  OBSERVATION: {
    label: "Observación",
    className: "bg-info text-info-foreground",
  },
  INCIDENT: {
    label: "Incidencia",
    className: "bg-warning text-warning-foreground",
  },
};

const KIND_OPTIONS: NoteKind[] = ["NOTE", "OBSERVATION", "INCIDENT"];

export function ClientNotes({ contactId }: { contactId: string }) {
  const { data, isLoading, reload } = usePageData(() =>
    clientNotesApi.list(contactId),
  );
  const notes = data ?? [];
  const runMutation = useMutationHandler();

  const [kind, setKind] = useState<NoteKind>("NOTE");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    setSaving(true);
    setError(null);
    const failure = await runMutation(async () => {
      await clientNotesApi.create({ contact_id: contactId, kind, body: body.trim() });
    });
    setSaving(false);
    if (failure) {
      setError(failure);
      return;
    }
    setBody("");
    setKind("NOTE");
    void reload();
  }

  async function remove(id: string) {
    await runMutation(() => clientNotesApi.remove(id));
    void reload();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notas e incidencias</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <form onSubmit={handleSubmit} className="grid gap-2">
          <div className="flex items-center gap-2">
            <Select
              items={KIND_OPTIONS.map((k) => ({
                value: k,
                label: KIND_META[k].label,
              }))}
              value={kind}
              onValueChange={(value) => setKind(value as NoteKind)}
            >
              <SelectTrigger size="sm" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KIND_OPTIONS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {KIND_META[k].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <textarea
            value={body}
            rows={2}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Escribe una nota interna, observación o incidencia…"
            className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button
            type="submit"
            size="sm"
            className="justify-self-start"
            disabled={saving || !body.trim()}
          >
            <MessageSquarePlus data-icon="inline-start" aria-hidden="true" />
            {saving ? "Guardando…" : "Agregar"}
          </Button>
        </form>

        {isLoading ? (
          <div className="grid gap-2">
            <Skeleton className="h-12 rounded-lg" />
            <Skeleton className="h-12 rounded-lg" />
          </div>
        ) : notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin notas registradas para este cliente.
          </p>
        ) : (
          <ul className="grid gap-2">
            {notes.map((note) => {
              const meta = KIND_META[note.kind];
              return (
                <li
                  key={note.id}
                  className="group grid gap-1 rounded-lg border p-3"
                >
                  <div className="flex items-center gap-2">
                    <Badge className={cn("shrink-0", meta.className)}>
                      {meta.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(note.created_at)}
                      {note.author_email ? ` · ${note.author_email}` : ""}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="ms-auto text-destructive opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Eliminar nota"
                      onClick={() => void remove(note.id)}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{note.body}</p>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
