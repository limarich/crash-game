FROM oven/bun:1-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY package.json ./
RUN bun install

COPY . .

EXPOSE 4001

CMD ["sh", "-c", "bunx prisma generate && bunx prisma migrate deploy && bun run src/main.ts"]
