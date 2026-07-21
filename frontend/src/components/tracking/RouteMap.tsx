import { useEffect, useMemo } from "react";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { PackageEvent } from "@/types";

// Acento de marca para la ruta y los marcadores (independiente del tema).
const ROUTE_COLOR = "#7c5cff";

type MapPoint = {
  id: string;
  name: string;
  position: [number, number];
};

// Ajusta el encuadre a los puntos del recorrido cuando cambian.
function FitToPoints({ points }: { points: MapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 1) {
      map.setView(points[0].position, 11);
    } else if (points.length > 1) {
      map.fitBounds(
        points.map((p) => p.position),
        { padding: [48, 48] },
      );
    }
    // Recalcula el tamaño por si el contenedor cambió (p. ej. al montar).
    map.invalidateSize();
  }, [map, points]);
  return null;
}

/**
 * Mapa real (Leaflet + OpenStreetMap) del recorrido: un marcador por agencia
 * visitada, unidos por la ruta; el último punto (ubicación actual) se resalta.
 * Se oculta si ningún evento tiene coordenadas.
 */
export function RouteMap({ events }: { events: PackageEvent[] }) {
  // Puntos ordenados con coordenadas, colapsando agencias consecutivas iguales.
  const points = useMemo<MapPoint[]>(() => {
    const result: MapPoint[] = [];
    for (const event of events) {
      const agency = event.agency;
      if (!agency || agency.latitude == null || agency.longitude == null) {
        continue;
      }
      const previous = result[result.length - 1];
      if (previous && previous.id === agency.id) {
        continue;
      }
      result.push({
        id: agency.id,
        name: agency.name,
        position: [agency.latitude, agency.longitude],
      });
    }
    return result;
  }, [events]);

  if (points.length === 0) {
    return null;
  }

  const line: LatLngExpression[] = points.map((p) => p.position);
  const lastIndex = points.length - 1;

  return (
    <div className="relative z-0 h-72 overflow-hidden rounded-lg border dark:[&_.leaflet-tile-pane]:[filter:invert(1)_hue-rotate(180deg)_brightness(0.95)_contrast(0.9)]">
      <MapContainer
        center={points[0].position}
        zoom={9}
        scrollWheelZoom={false}
        className="size-full"
        aria-label="Mapa del recorrido del paquete"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.length > 1 && (
          <Polyline
            positions={line}
            pathOptions={{
              color: ROUTE_COLOR,
              weight: 3,
              opacity: 0.9,
              dashArray: "6 8",
            }}
          />
        )}
        {points.map((point, index) => {
          const isCurrent = index === lastIndex;
          return (
            <CircleMarker
              key={`${point.id}-${index}`}
              center={point.position}
              radius={isCurrent ? 9 : 6}
              pathOptions={{
                color: ROUTE_COLOR,
                weight: 2,
                fillColor: isCurrent ? ROUTE_COLOR : "#ffffff",
                fillOpacity: 1,
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} permanent>
                {point.name}
                {isCurrent ? " · actual" : ""}
              </Tooltip>
            </CircleMarker>
          );
        })}
        <FitToPoints points={points} />
      </MapContainer>
    </div>
  );
}
