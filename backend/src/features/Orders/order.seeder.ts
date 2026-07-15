import { prisma } from "../../database/prisma";
import {
  extraOrderSeedData,
  orderSeedData,
} from "../../database/seeders/fixtures.js";

export async function seedOrders() {
  const allOrderSeedData = [...orderSeedData, ...extraOrderSeedData];
  const userEmails = [
    ...new Set(allOrderSeedData.map((order) => order.userEmail)),
  ];
  const agencyNames = [
    ...new Set(
      allOrderSeedData.flatMap((order) => [
        order.originAgencyName,
        order.destinationAgencyName,
      ]),
    ),
  ];

  const [users, agencies] = await Promise.all([
    prisma.users.findMany({
      where: {
        email: {
          in: userEmails,
        },
      },
      select: {
        id: true,
        email: true,
      },
    }),
    prisma.agencies.findMany({
      where: {
        name: {
          in: agencyNames,
        },
      },
      select: {
        id: true,
        name: true,
      },
    }),
  ]);

  const userByEmail = new Map(users.map((user) => [user.email, user.id]));
  const agencyByName = new Map(
    agencies.map((agency) => [agency.name, agency.id]),
  );
  const seededOrders = [];

  for (const order of allOrderSeedData) {
    const userId = userByEmail.get(order.userEmail);
    const originAgencyId = agencyByName.get(order.originAgencyName);
    const destinationAgencyId = agencyByName.get(order.destinationAgencyName);

    if (!userId) {
      throw new Error(
        `Cannot seed order ${order.description}: missing user ${order.userEmail}.`,
      );
    }

    if (!originAgencyId || !destinationAgencyId) {
      throw new Error(
        `Cannot seed order ${order.description}: missing origin or destination agency.`,
      );
    }

    const existingOrder = await prisma.orders.findFirst({
      where: {
        user_id: userId,
        origin_agency_id: originAgencyId,
        destination_agency_id: destinationAgencyId,
        description: order.description,
      },
      select: {
        id: true,
      },
    });

    const seededOrder = existingOrder
      ? await prisma.orders.update({
          where: {
            id: existingOrder.id,
          },
          data: {
            date_arrived: order.date_arrived,
            date_received: order.date_received,
            amount: order.amount,
            status: order.status,
          },
          select: {
            id: true,
            user_id: true,
            origin_agency_id: true,
            destination_agency_id: true,
            date_arrived: true,
            date_received: true,
            description: true,
            amount: true,
            status: true,
          },
        })
      : await prisma.orders.create({
          data: {
            user_id: userId,
            origin_agency_id: originAgencyId,
            destination_agency_id: destinationAgencyId,
            date_arrived: order.date_arrived,
            date_received: order.date_received,
            description: order.description,
            amount: order.amount,
            status: order.status,
          },
          select: {
            id: true,
            user_id: true,
            origin_agency_id: true,
            destination_agency_id: true,
            date_arrived: true,
            date_received: true,
            description: true,
            amount: true,
            status: true,
          },
        });

    seededOrders.push(seededOrder);
  }

  return seededOrders;
}
