import { cn } from "@/lib/utils";
import type { PackageEvent } from "@/types";

// Caja geográfica (aprox. Venezuela) usada para proyectar lat/long al lienzo.
const LON_MIN = -73.5;
const LON_MAX = -59.5;
const LAT_MIN = 0.5;
const LAT_MAX = 12.6;

// Lienzo SVG con la misma proporción que la caja (14° lon × 12.1° lat).
const W = 280;
const H = 242;

function project(lon: number, lat: number): { x: number; y: number } {
  const x = ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * W;
  const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * H;
  return { x, y };
}

// Contorno aproximado de Venezuela (lon, lat), trazado a grandes rasgos.
const VENEZUELA_BORDER: Array<[number, number]> = [
  [-71.3, 12.2],
  [-70.2, 11.6],
  [-68.3, 11.2],
  [-67.0, 10.6],
  [-64.5, 10.6],
  [-61.9, 10.7],
  [-60.0, 9.8],
  [-60.0, 8.5],
  [-61.4, 5.9],
  [-61.0, 4.5],
  [-63.4, 3.9],
  [-64.5, 1.5],
  [-66.3, 0.7],
  [-67.8, 1.3],
  [-67.4, 6.2],
  [-70.7, 7.0],
  [-72.5, 9.0],
  [-72.9, 11.0],
];

type MapPoint = {
  id: string;
  name: string;
  x: number;
  y: number;
};

/**
 * Mapa esquemático (SVG, sin librerías ni tiles externos) del recorrido:
 * silueta de Venezuela + marcadores de cada agencia visitada, unidos por la
 * ruta; el último punto (ubicación actual) se resalta. Se oculta si ningún
 * evento tiene coordenadas.
 */
export function RouteMap({ events }: { events: PackageEvent[] }) {
  // Puntos ordenados con coordenadas, colapsando agencias consecutivas iguales.
  const points: MapPoint[] = [];
  for (const event of events) {
    const agency = event.agency;
    if (
      !agency ||
      agency.latitude == null ||
      agency.longitude == null
    ) {
      continue;
    }
    const previous = points[points.length - 1];
    if (previous && previous.id === agency.id) {
      continue;
    }
    const { x, y } = project(agency.longitude, agency.latitude);
    points.push({ id: agency.id, name: agency.name, x, y });
  }

  if (points.length === 0) {
    return null;
  }

  const borderPath =
    VENEZUELA_BORDER.map(([lon, lat], index) => {
      const { x, y } = project(lon, lat);
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(" ") + " Z";

  const routePath = points
    .map((p, index) => `${index === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const lastIndex = points.length - 1;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label="Mapa del recorrido del paquete"
    >
      {/* Silueta del país. */}
      <path
        d={borderPath}
        className="fill-muted stroke-border"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />

      {/* Ruta entre agencias visitadas. */}
      {points.length > 1 && (
        <path
          d={routePath}
          className="stroke-primary"
          fill="none"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="1 6"
        />
      )}

      {/* Marcadores. */}
      {points.map((point, index) => {
        const isCurrent = index === lastIndex;
        return (
          <g key={`${point.id}-${index}`}>
            {isCurrent && (
              <circle
                cx={point.x}
                cy={point.y}
                r={9}
                className="fill-primary/20"
              />
            )}
            <circle
              cx={point.x}
              cy={point.y}
              r={isCurrent ? 5 : 4}
              className={cn(
                isCurrent ? "fill-primary" : "fill-background stroke-primary",
              )}
              strokeWidth={2}
            />
            <text
              x={point.x}
              y={point.y - 9}
              textAnchor="middle"
              className="fill-foreground text-[10px] font-medium"
            >
              {point.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
