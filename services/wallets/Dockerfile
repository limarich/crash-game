FROM oven/bun:1-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY package.json ./
RUN bun install

COPY . .

EXPOSE 4002

CMD ["sh", "-c", "bunx prisma migrate deploy && bun run src/main.ts"]
