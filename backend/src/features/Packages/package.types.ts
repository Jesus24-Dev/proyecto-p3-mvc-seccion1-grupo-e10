import type {
  packages as PrismaPackage,
  package_status as PackageStatus,
} from "../../generated/prisma/client";

export type PackageEntity = PrismaPackage;

export interface PackageResponse {
  id: string;
  tracking_code: string;
  description: string;
  weight_kg: number;
  dimensions: string;
  status: PackageStatus;
  created_at: Date;
  contact_id: string;
  order_id: string | null;
}

/** Agencia (ubicación) resumida para un checkpoint del recorrido. */
export interface TrackingAgency {
  id: string;
  name: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
}

/** Un movimiento del paquete en el historial. */
export interface PackageEventResponse {
  id: string;
  status: PackageStatus;
  note: string;
  created_at: Date;
  agency: TrackingAgency | null;
}

/** Rastreo completo (admin): paquete + contacto + recorrido. */
export interface TrackingResponse extends PackageResponse {
  contact: { id: string; first_name: string; last_name: string } | null;
  events: PackageEventResponse[];
}

/** Rastreo público: sin datos personales del contacto. */
export interface PublicTrackingResponse {
  tracking_code: string;
  description: string;
  weight_kg: number;
  status: PackageStatus;
  created_at: Date;
  events: PackageEventResponse[];
}
