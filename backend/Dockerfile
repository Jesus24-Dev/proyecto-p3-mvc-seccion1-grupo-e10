FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# prisma.config.ts exige que DATABASE_URL exista para cualquier comando de la
# CLI; `generate` no se conecta a la base, así que un valor ficticio basta y
# docker-compose lo sobreescribe en tiempo de ejecución.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "run", "dev"]
