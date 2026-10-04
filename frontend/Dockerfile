# syntax=docker/dockerfile:1.7

# Build stage: compile the Vite app with the API base URL baked in.
FROM node:20-alpine AS build
WORKDIR /app

# VITE_* env vars are read at build time; pass via --build-arg or compose's
# build.args block. Default points at the dockerised backend on localhost.
ARG VITE_API_BASE_URL=http://localhost:8080/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Run stage: nginx serves the static bundle with SPA fallback.
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# The nginx image renders /etc/nginx/templates/*.template with envsubst on start.
# BACKEND_ORIGIN is where link-preview bots are proxied for Open Graph pages.
ENV BACKEND_ORIGIN=http://localhost:8080
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
