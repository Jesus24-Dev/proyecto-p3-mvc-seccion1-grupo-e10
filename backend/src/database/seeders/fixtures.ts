import {
  package_status,
  roles,
  transfer_status,
} from "../../generated/prisma/enums";

export const userSeedData = [
  {
    email: "admin@drlogistics.local",
    password: "Admin123*",
    role: roles.ADMIN,
  },
  {
    email: "user@drlogistics.local",
    password: "User123*",
    role: roles.USER,
  },
  {
    email: "distributor@drlogistics.local",
    password: "Distributor123*",
    role: roles.DISTRIBUTOR,
  },
] as const;

export const agencySeedData = [
  {
    name: "Caracas Central",
    location: "Caracas, Distrito Capital",
    is_active: true,
    userEmail: "admin@drlogistics.local",
  },
  {
    name: "Valencia Centro",
    location: "Valencia, Carabobo",
    is_active: true,
    userEmail: "distributor@drlogistics.local",
  },
  {
    name: "Maracaibo Norte",
    location: "Maracaibo, Zulia",
    is_active: true,
    userEmail: "user@drlogistics.local",
  },
] as const;

export const userInformationSeedData = [
  {
    userEmail: "admin@drlogistics.local",
    first_name: "Pedro",
    last_name: "Admin",
    address: "Altamira, Caracas",
    birthday: new Date("1990-05-18T00:00:00.000Z"),
  },
  {
    userEmail: "user@drlogistics.local",
    first_name: "Maria",
    last_name: "Cliente",
    address: "Naguanagua, Valencia",
    birthday: new Date("1995-09-02T00:00:00.000Z"),
  },
  {
    userEmail: "distributor@drlogistics.local",
    first_name: "Luis",
    last_name: "Distribuidor",
    address: "La Lago, Maracaibo",
    birthday: new Date("1988-11-11T00:00:00.000Z"),
  },
] as const;

export const orderSeedData = [
  {
    userEmail: "user@drlogistics.local",
    originAgencyName: "Caracas Central",
    destinationAgencyName: "Valencia Centro",
    date_arrived: new Date("2026-04-15T14:00:00.000Z"),
    date_received: new Date("2026-04-16T18:30:00.000Z"),
    description: "Caja de repuestos para Valencia",
    amount: 150,
    status: transfer_status.PROCESSING,
  },
  {
    userEmail: "admin@drlogistics.local",
    originAgencyName: "Valencia Centro",
    destinationAgencyName: "Maracaibo Norte",
    date_arrived: new Date("2026-04-20T09:15:00.000Z"),
    date_received: new Date("2026-04-21T13:45:00.000Z"),
    description: "Documentos mercantiles a Maracaibo",
    amount: 320.5,
    status: transfer_status.COMPLETED,
  },
] as const;

export const packageSeedData = [
  {
    tracking_code: "DRL-2026-SEED0001",
    description: "Caja mediana con repuestos de moto",
    weight_kg: 8.4,
    status: package_status.IN_TRANSIT,
    contactUserEmail: "user@drlogistics.local",
    orderDescription: "Caja de repuestos para Valencia",
  },
  {
    tracking_code: "DRL-2026-SEED0002",
    description: "Sobre con documentos mercantiles",
    weight_kg: 0.3,
    status: package_status.DELIVERED,
    contactUserEmail: "admin@drlogistics.local",
    orderDescription: "Documentos mercantiles a Maracaibo",
  },
  {
    tracking_code: "DRL-2026-SEED0003",
    description: "Electrodoméstico pequeño (licuadora)",
    weight_kg: 3.1,
    status: package_status.RECEIVED,
    contactUserEmail: "distributor@drlogistics.local",
    orderDescription: null,
  },
] as const;
