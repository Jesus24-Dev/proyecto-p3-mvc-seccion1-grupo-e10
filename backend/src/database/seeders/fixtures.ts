import {
  agency_role,
  package_status,
  roles,
  transfer_status,
} from "../../generated/prisma/enums";

export const userSeedData = [
  {
    // Cuenta principal del demo: máximo nivel de permisos (papelera y borrado
    // definitivo de contactos, además de todo lo de un administrador).
    email: "admin@drlogistics.local",
    password: "Admin123*",
    role: roles.SUPERADMIN,
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
  {
    // Demo: administrador de AGENCIA. Ve y opera todas las subcuentas y puede
    // cambiar entre "Todas las agencias" (agregado) y cualquier subcuenta.
    email: "agencia@drlogistics.local",
    password: "Agencia123*",
    role: roles.ADMIN,
  },
  {
    // Demo: administrador de SEDE. Solo ve los datos de las agencias donde es
    // miembro (abajo se le asigna Valencia Centro). Alcance por ubicación.
    email: "sede@drlogistics.local",
    password: "Sede123*",
    role: roles.DISTRIBUTOR,
  },
] as const;

export const agencySeedData = [
  {
    name: "Caracas Central",
    location: "Caracas, Distrito Capital",
    is_active: true,
    userEmail: "admin@drlogistics.local",
    latitude: 10.4806,
    longitude: -66.9036,
  },
  {
    name: "Valencia Centro",
    location: "Valencia, Carabobo",
    is_active: true,
    userEmail: "distributor@drlogistics.local",
    latitude: 10.162,
    longitude: -68.0077,
  },
  {
    name: "Maracaibo Norte",
    location: "Maracaibo, Zulia",
    is_active: true,
    userEmail: "user@drlogistics.local",
    latitude: 10.6545,
    longitude: -71.6403,
  },
] as const;

// Catálogo de etiquetas por agencia (nombre de la agencia -> etiquetas).
export const tagSeedData = [
  { agencyName: "Caracas Central", name: "bienvenida", color: "emerald" },
  { agencyName: "Caracas Central", name: "vip", color: "violet" },
  { agencyName: "Caracas Central", name: "moroso", color: "red" },
  { agencyName: "Valencia Centro", name: "bienvenida", color: "emerald" },
  { agencyName: "Valencia Centro", name: "frecuente", color: "blue" },
  { agencyName: "Maracaibo Norte", name: "bienvenida", color: "emerald" },
  { agencyName: "Maracaibo Norte", name: "mayorista", color: "amber" },
] as const;

// Dominios de envío por agencia (subcuenta).
export const emailDomainSeedData = [
  {
    agencyName: "Caracas Central",
    domain: "correo.drlogistics.com",
    status: "VERIFIED",
  },
  {
    agencyName: "Valencia Centro",
    domain: "valencia.drlogistics.com",
    status: "PENDING",
  },
] as const;

// Plantillas de correo por agencia (subcuenta).
export const emailTemplateSeedData = [
  {
    agencyName: "Caracas Central",
    name: "Bienvenida",
    subject: "¡Bienvenido a Dr Logistics, {{nombre}}!",
    body: "Hola {{nombre}},\n\nGracias por confiar en Dr Logistics. Desde ahora podrás rastrear tus paquetes con tu código de seguimiento.\n\nUn saludo,\nEl equipo de Dr Logistics",
  },
  {
    agencyName: "Caracas Central",
    name: "Paquete entregado",
    subject: "Tu paquete {{tracking}} fue entregado",
    body: "Hola {{nombre}},\n\nTe confirmamos que tu paquete {{tracking}} fue entregado con éxito. ¡Gracias por elegirnos!\n\nDr Logistics",
  },
] as const;

export const userInformationSeedData = [
  {
    userEmail: "admin@drlogistics.local",
    first_name: "Pedro",
    last_name: "Admin",
    document_id: "V-14205698",
    phone: "+58 412 555 0180",
    address: "Altamira, Caracas",
    birthday: new Date("1990-05-18T00:00:00.000Z"),
    agencyName: "Caracas Central",
  },
  {
    userEmail: "user@drlogistics.local",
    first_name: "Maria",
    last_name: "Cliente",
    document_id: "V-20894571",
    phone: "+58 414 555 3391",
    address: "Naguanagua, Valencia",
    birthday: new Date("1995-09-02T00:00:00.000Z"),
    // Bajo Valencia Centro: visible para el administrador de sede (demo).
    agencyName: "Valencia Centro",
  },
  {
    userEmail: "distributor@drlogistics.local",
    first_name: "Luis",
    last_name: "Distribuidor",
    document_id: "J-31005472-8",
    phone: "+58 261 555 7742",
    address: "La Lago, Maracaibo",
    birthday: new Date("1988-11-11T00:00:00.000Z"),
    agencyName: "Maracaibo Norte",
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

export const extraOrderSeedData = [
  {
    userEmail: "user@drlogistics.local",
    originAgencyName: "Caracas Central",
    destinationAgencyName: "Maracaibo Norte",
    date_arrived: new Date("2026-02-12T14:00:00.000Z"),
    date_received: new Date("2026-02-10T09:00:00.000Z"),
    description: "Ropa y calzado para Maracaibo",
    amount: 85,
    status: transfer_status.COMPLETED,
  },
  {
    userEmail: "distributor@drlogistics.local",
    originAgencyName: "Valencia Centro",
    destinationAgencyName: "Caracas Central",
    date_arrived: new Date("2026-03-05T14:00:00.000Z"),
    date_received: new Date("2026-03-03T10:30:00.000Z"),
    description: "Repuestos electrónicos a Caracas",
    amount: 210.75,
    status: transfer_status.COMPLETED,
  },
  {
    userEmail: "user@drlogistics.local",
    originAgencyName: "Maracaibo Norte",
    destinationAgencyName: "Valencia Centro",
    date_arrived: new Date("2026-03-28T14:00:00.000Z"),
    date_received: new Date("2026-03-26T11:00:00.000Z"),
    description: "Medicinas refrigeradas",
    amount: 145.2,
    status: transfer_status.COMPLETED,
  },
  {
    userEmail: "admin@drlogistics.local",
    originAgencyName: "Caracas Central",
    destinationAgencyName: "Valencia Centro",
    date_arrived: new Date("2026-05-14T14:00:00.000Z"),
    date_received: new Date("2026-05-12T08:45:00.000Z"),
    description: "Material de oficina corporativo",
    amount: 96.4,
    status: transfer_status.COMPLETED,
  },
  {
    userEmail: "distributor@drlogistics.local",
    originAgencyName: "Valencia Centro",
    destinationAgencyName: "Maracaibo Norte",
    date_arrived: new Date("2026-06-09T14:00:00.000Z"),
    date_received: new Date("2026-06-07T13:20:00.000Z"),
    description: "Herramientas industriales",
    amount: 430,
    status: transfer_status.READY_FOR_PICKUP,
  },
  {
    userEmail: "user@drlogistics.local",
    originAgencyName: "Caracas Central",
    destinationAgencyName: "Maracaibo Norte",
    date_arrived: new Date("2026-07-08T14:00:00.000Z"),
    date_received: new Date("2026-07-06T15:10:00.000Z"),
    description: "Juguetes y artículos del hogar",
    amount: 120.9,
    status: transfer_status.PENDING_PAYMENT,
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
  {
    tracking_code: "DRL-2026-SEED0004",
    description: "Bulto de ropa y calzado",
    weight_kg: 12.5,
    status: package_status.DELIVERED,
    contactUserEmail: "user@drlogistics.local",
    orderDescription: "Ropa y calzado para Maracaibo",
    created_at: new Date("2026-02-10T10:00:00.000Z"),
  },
  {
    tracking_code: "DRL-2026-SEED0005",
    description: "Caja de repuestos electrónicos",
    weight_kg: 6.2,
    status: package_status.DELIVERED,
    contactUserEmail: "distributor@drlogistics.local",
    orderDescription: "Repuestos electrónicos a Caracas",
    created_at: new Date("2026-03-03T11:00:00.000Z"),
  },
  {
    tracking_code: "DRL-2026-SEED0006",
    description: "Cava con medicinas refrigeradas",
    weight_kg: 4.8,
    status: package_status.DELIVERED,
    contactUserEmail: "user@drlogistics.local",
    orderDescription: "Medicinas refrigeradas",
    created_at: new Date("2026-03-26T12:00:00.000Z"),
  },
  {
    tracking_code: "DRL-2026-SEED0007",
    description: "Resmas y material de oficina",
    weight_kg: 9.9,
    status: package_status.DELIVERED,
    contactUserEmail: "admin@drlogistics.local",
    orderDescription: "Material de oficina corporativo",
    created_at: new Date("2026-05-12T09:30:00.000Z"),
  },
  {
    tracking_code: "DRL-2026-SEED0008",
    description: "Taladros y herramientas",
    weight_kg: 15.3,
    status: package_status.IN_WAREHOUSE,
    contactUserEmail: "distributor@drlogistics.local",
    orderDescription: "Herramientas industriales",
    created_at: new Date("2026-06-07T14:00:00.000Z"),
  },
  {
    tracking_code: "DRL-2026-SEED0009",
    description: "Caja de juguetes surtidos",
    weight_kg: 7.7,
    status: package_status.OUT_FOR_DELIVERY,
    contactUserEmail: "user@drlogistics.local",
    orderDescription: "Juguetes y artículos del hogar",
    created_at: new Date("2026-07-06T16:00:00.000Z"),
  },
] as const;

export const membershipSeedData = [
  { agencyName: "Caracas Central", userEmail: "admin@drlogistics.local", role: agency_role.OWNER },
  { agencyName: "Caracas Central", userEmail: "distributor@drlogistics.local", role: agency_role.MANAGER },
  { agencyName: "Valencia Centro", userEmail: "distributor@drlogistics.local", role: agency_role.OWNER },
  { agencyName: "Valencia Centro", userEmail: "user@drlogistics.local", role: agency_role.VIEWER },
  { agencyName: "Maracaibo Norte", userEmail: "user@drlogistics.local", role: agency_role.OWNER },
  // El administrador de sede (demo) solo es miembro de Valencia Centro.
  { agencyName: "Valencia Centro", userEmail: "sede@drlogistics.local", role: agency_role.MANAGER },
] as const;

export const automationSeedData = [
  {
    name: "Bienvenida a nuevos contactos",
    description:
      "Cuando se registra un contacto, espera un día, le da la bienvenida por WhatsApp y lo etiqueta.",
    is_active: true,
    definition: {
      nodes: [
        { id: "n1", type: "step", position: { x: 320, y: 40 }, data: { kind: "trigger", trigger: "contact_created" } },
        { id: "n2", type: "step", position: { x: 320, y: 200 }, data: { kind: "wait", amount: 1, unit: "days" } },
        { id: "n3", type: "step", position: { x: 320, y: 360 }, data: { kind: "send_whatsapp", message: "¡Hola! Bienvenido a Dr Logistics. Guarda este chat para rastrear tus paquetes." } },
        { id: "n4", type: "step", position: { x: 320, y: 520 }, data: { kind: "add_tag", tag: "bienvenida" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
      ],
    },
  },
] as const;
