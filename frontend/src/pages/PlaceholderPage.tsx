import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Marcador temporal mientras se construye cada módulo. */
export function PlaceholderPage({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Este módulo está en construcción y estará disponible en breve.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
