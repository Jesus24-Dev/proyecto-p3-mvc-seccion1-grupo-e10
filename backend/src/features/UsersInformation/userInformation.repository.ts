import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import {prisma} from "../../database/prisma";
import type { CreateUserInformationBody } from "./userInformation.schema.js";
import type { UsersInformationEntity } from "./userInformation.types.js";
import type { AgencyScope } from "../Auth/agencyScope.js";

export class UserInformationRepository{
    async findAll(scope?: AgencyScope): Promise<UsersInformationEntity[]>{
        // Excluye los contactos enviados a la papelera (soft-delete) y acota por
        // agencia (alcance por sede / subcuenta activa).
        return await prisma.users_information.findMany({
            where: {
                deleted_at: null,
                ...(scope && !scope.all ? { agency_id: { in: scope.ids } } : {}),
            },
            select: {id: true, user_id: true, first_name: true, last_name: true, document_id: true, phone: true, address: true, birthday: true, created_at: true, tags: true, deleted_at: true, agency_id: true, agency: {select: {id: true, name: true}}}
        });
    }

    // Contactos en la papelera (soft-delete). Incluye deleted_at para mostrar
    // cuándo se enviaron y un conteo de lo que se eliminaría al vaciar.
    async findTrashed(): Promise<(UsersInformationEntity & { _count: { packages: number; transactions: number } })[]>{
        return await prisma.users_information.findMany({
            where: { deleted_at: { not: null } },
            orderBy: { deleted_at: "desc" },
            select: {
                id: true, user_id: true, first_name: true, last_name: true,
                document_id: true, phone: true, address: true, birthday: true,
                created_at: true, tags: true, deleted_at: true,
                _count: { select: { packages: true, transactions: true } },
            },
        });
    }

    async findById(id: string): Promise<UsersInformationEntity | null>{
        return await prisma.users_information.findUnique({
            where: {id: id},
            select: {id: true, user_id: true, first_name: true, last_name: true, document_id: true, phone: true, address: true, birthday: true, created_at: true, tags: true, deleted_at: true, agency_id: true, agency: {select: {id: true, name: true}}}
        });
    }

    async findByUserId(userId: string): Promise<UsersInformationEntity | null>{
        return await prisma.users_information.findUnique({
            where: {user_id: userId},
            select: {id: true, user_id: true, first_name: true, last_name: true, document_id: true, phone: true, address: true, birthday: true, created_at: true, tags: true, deleted_at: true, agency_id: true, agency: {select: {id: true, name: true}}}
        });
    }
    
    async create(body: CreateUserInformationBody): Promise<UsersInformationEntity | undefined>{
        return  await prisma.users_information.create({
            data: {
                user_id: body.user_id!,
                first_name: body.first_name,
                last_name: body.last_name,
                document_id: body.document_id ?? "",
                phone: body.phone ?? "",
                address: body.address,
                birthday: new Date(body.birthday),
                agency_id: body.agency_id ?? null,
            }
        });
    }

    // Crea un "contacto suelto": un contacto sin cuenta de login previa.
    // Genera una cuenta de respaldo (rol USER, contraseña aleatoria) para
    // satisfacer la relación 1‑a‑1 con `users`, y la ficha en una transacción.
    async createStandalone(body: CreateUserInformationBody): Promise<UsersInformationEntity>{
        const requestedEmail = (body.email ?? "").trim().toLowerCase();
        const email = requestedEmail || `contacto_${Date.now()}@drlogistics.local`;
        const password = await bcrypt.hash(randomUUID(), 10);
        return await prisma.$transaction(async (tx) => {
            const user = await tx.users.create({
                data: {
                    email,
                    password,
                    role: "USER",
                    email_verified: false,
                },
                select: { id: true },
            });
            return await tx.users_information.create({
                data: {
                    user_id: user.id,
                    first_name: body.first_name,
                    last_name: body.last_name,
                    document_id: body.document_id ?? "",
                    phone: body.phone ?? "",
                    address: body.address,
                    birthday: new Date(body.birthday),
                    agency_id: body.agency_id ?? null,
                },
            });
        });
    }
    
    async update(id: string, body: Omit<CreateUserInformationBody, "id" | "user_id">): Promise<UsersInformationEntity>{
        return await prisma.users_information.update({
            where: {id: id},
            data: {
                first_name: body.first_name,
                last_name: body.last_name,
                document_id: body.document_id ?? "",
                phone: body.phone ?? "",
                address: body.address,
                birthday: new Date(body.birthday)
            }
        });
    }

    async updateUsingUserId(user_id: string, body: Omit<CreateUserInformationBody, "id" | "user_id">): Promise<UsersInformationEntity>{
        return await prisma.users_information.update({
            where: {user_id: user_id},
            data: {
                first_name: body.first_name,
                last_name: body.last_name,
                document_id: body.document_id ?? "",
                phone: body.phone ?? "",
                address: body.address,
                birthday: new Date(body.birthday)
            }
        });
    }
    
    // Agrega una etiqueta al contacto (sin duplicar). Devuelve la lista nueva.
    async addTag(id: string, tag: string): Promise<string[]>{
        const contact = await prisma.users_information.findUnique({
            where: {id: id},
            select: {tags: true},
        });
        if (!contact) {
            throw new Error("El contacto solicitado no existe.");
        }
        if (contact.tags.includes(tag)) {
            return contact.tags;
        }
        const updated = await prisma.users_information.update({
            where: {id: id},
            data: {tags: {set: [...contact.tags, tag]}},
            select: {tags: true},
        });
        return updated.tags;
    }

    // Quita una etiqueta del contacto. Devuelve la lista nueva.
    async removeTag(id: string, tag: string): Promise<string[]>{
        const contact = await prisma.users_information.findUnique({
            where: {id: id},
            select: {tags: true},
        });
        if (!contact) {
            throw new Error("El contacto solicitado no existe.");
        }
        const updated = await prisma.users_information.update({
            where: {id: id},
            data: {tags: {set: contact.tags.filter((item) => item !== tag)}},
            select: {tags: true},
        });
        return updated.tags;
    }

    async delete(id: string): Promise<void>{
        await prisma.users_information.delete({
            where: {id: id}
        })
    }

    // Envía un contacto a la papelera (soft-delete) junto con sus paquetes y
    // pagos, para que desaparezcan de los listados sin perder el historial.
    async trashUsingUserId(user_id: string): Promise<void>{
        const info = await prisma.users_information.findUnique({
            where: { user_id: user_id },
            select: { id: true, deleted_at: true },
        });
        if (!info) {
            throw new Error("CONTACT_NOT_FOUND");
        }
        if (info.deleted_at) {
            // Ya estaba en la papelera; nada que hacer.
            return;
        }
        const now = new Date();
        await prisma.$transaction([
            prisma.users_information.update({ where: { id: info.id }, data: { deleted_at: now } }),
            prisma.packages.updateMany({ where: { contact_id: info.id, deleted_at: null }, data: { deleted_at: now } }),
            prisma.transactions.updateMany({ where: { contact_id: info.id, deleted_at: null }, data: { deleted_at: now } }),
        ]);
    }

    // Restaura un contacto de la papelera y vuelve a mostrar sus paquetes y
    // pagos ocultados en el mismo momento (mismo deleted_at).
    async restoreUsingUserId(user_id: string): Promise<void>{
        const info = await prisma.users_information.findUnique({
            where: { user_id: user_id },
            select: { id: true, deleted_at: true },
        });
        if (!info) {
            throw new Error("CONTACT_NOT_FOUND");
        }
        if (!info.deleted_at) {
            return;
        }
        const trashedAt = info.deleted_at;
        await prisma.$transaction([
            prisma.users_information.update({ where: { id: info.id }, data: { deleted_at: null } }),
            prisma.packages.updateMany({ where: { contact_id: info.id, deleted_at: trashedAt }, data: { deleted_at: null } }),
            prisma.transactions.updateMany({ where: { contact_id: info.id, deleted_at: trashedAt }, data: { deleted_at: null } }),
        ]);
    }

    async deleteUsingUserId(user_id: string): Promise<void>{
        const info = await prisma.users_information.findUnique({
            where: { user_id: user_id },
            select: { id: true },
        });
        if (!info) {
            // El servicio lo traduce a "no existe" (404).
            throw new Error("CONTACT_NOT_FOUND");
        }
        await prisma.$transaction(async (tx) => {
            // Borra los registros que dependen del contacto para que la
            // eliminación no falle por llaves foráneas (era el bug: el error
            // se tragaba y el contacto quedaba sin borrar).
            await tx.transactions.deleteMany({ where: { contact_id: info.id } });
            await tx.packages.deleteMany({ where: { contact_id: info.id } });
            // client_notes: onDelete Cascade · automation_runs: onDelete SetNull.
            await tx.users_information.delete({ where: { id: info.id } });

            // Limpia la cuenta de respaldo si es un contacto sin login real
            // (rol USER, sin envíos ni agencias propias). Nunca borra cuentas
            // con datos operativos (p. ej. el admin).
            const user = await tx.users.findUnique({
                where: { id: user_id },
                select: {
                    role: true,
                    _count: {
                        select: { orders_by_user: true, agencies_by_user: true },
                    },
                },
            });
            if (
                user &&
                user.role === "USER" &&
                user._count.orders_by_user === 0 &&
                user._count.agencies_by_user === 0
            ) {
                // agency_members: onDelete Cascade.
                await tx.users.delete({ where: { id: user_id } });
            }
        });
    }
}