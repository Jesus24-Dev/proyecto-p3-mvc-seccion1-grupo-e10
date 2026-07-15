FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# El cliente de Prisma se genera en el arranque (ver docker-compose.yml),
# cuando DATABASE_URL ya está disponible en el entorno.

EXPOSE 3000

CMD ["npm", "run", "dev"]
