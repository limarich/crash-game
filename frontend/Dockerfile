FROM oven/bun:1-alpine
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile
COPY . .

ARG VITE_API_URL=http://localhost:8000
ARG VITE_WS_URL=http://localhost:4001
ARG VITE_KEYCLOAK_URL=http://localhost:8080
ARG VITE_KEYCLOAK_REALM=crash-game
ARG VITE_KEYCLOAK_CLIENT_ID=crash-game-client

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_KEYCLOAK_URL=$VITE_KEYCLOAK_URL
ENV VITE_KEYCLOAK_REALM=$VITE_KEYCLOAK_REALM
ENV VITE_KEYCLOAK_CLIENT_ID=$VITE_KEYCLOAK_CLIENT_ID

RUN bun run build
EXPOSE 3000
CMD ["bunx", "vite", "preview", "--port", "3000", "--host"]
