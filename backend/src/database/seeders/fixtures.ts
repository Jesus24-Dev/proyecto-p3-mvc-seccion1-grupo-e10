import { roles, transfer_status } from "../../generated/prisma/enums";

export const userSeedData = [
  {
    email: "admin@drlogistics.local",
    password: "Admin123*",
    role: roles.ADMIN,
  },
  {
    email: "user@drlogistics.local",
    password: "User123*",
    role: roles.CUSTOMER,
  },
  {
    email: "distributor@drlogistics.local",
    password: "Distributor123*",
    role: roles.EMPLOYEE,
  },
] as const;

export const agencySeedData = [
  {
    name: "Caracas Central",
    location: "Caracas, VE",
    phone: "+58 212-555-1234",
    is_active: true,
    email: "caracas@drlogistics.local",
    userEmail: "admin@drlogistics.local",
  },
  {
    name: "Miami Hub",
    location: "Miami, US",
    phone: "+1 305-555-1234",
    is_active: true,
    email: "miami@drlogistics.local",
    userEmail: "distributor@drlogistics.local",
  },
  {
    name: "Bogota Norte",
    location: "Bogota, CO",
    phone: "+57 1-555-1234",
    is_active: true,
    email: "bogota@drlogistics.local",
    userEmail: "user@drlogistics.local",
  },
] as const;

export const userInformationSeedData = [
  {
    userEmail: "admin@drlogistics.local",
    document_id: "V-12345678",
    first_name: "Pedro",
    last_name: "Admin",
    address: "Altamira, Caracas",
    birthday: new Date("1990-05-18T00:00:00.000Z"),
    phone: "+58 412-555-6789",
  },
  {
    userEmail: "user@drlogistics.local",
    document_id: "V-87654321",
    first_name: "Maria",
    last_name: "Cliente",
    address: "Doral, Miami",
    birthday: new Date("1995-09-02T00:00:00.000Z"),
    phone: "+1 305-555-1234",
  },
  {
    userEmail: "distributor@drlogistics.local",
    document_id: "V-98765432",
    first_name: "Luis",
    last_name: "Distribuidor",
    address: "Chapinero, Bogota",
    birthday: new Date("1988-11-11T00:00:00.000Z"),
    phone: "+57 1-555-1234",
  },
] as const;

export const orderSeedData = [
  {
    userEmail: "user@drlogistics.local",
    originAgencyName: "Caracas Central",
    destinationAgencyName: "Miami Hub",
    package_received_at: new Date("2026-04-15T14:00:00.000Z"),
    package_delivered_at: new Date("2026-04-16T18:30:00.000Z"),
    description: "Transferencia familiar a Miami",
    amount: 150,
    status: transfer_status.PROCESSING,
  },
  {
    userEmail: "admin@drlogistics.local",
    originAgencyName: "Miami Hub",
    destinationAgencyName: "Bogota Norte",
    package_received_at: new Date("2026-04-20T09:15:00.000Z"),
    package_delivered_at: new Date("2026-04-21T13:45:00.000Z"),
    description: "Pago operativo Bogota",
    amount: 320.5,
    status: transfer_status.COMPLETED,
  },
] as const;
