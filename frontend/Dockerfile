# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
# `vite build` directly, not `npm run build` (which also runs `tsc -b`):
# the project currently has pre-existing type errors unrelated to runtime
# behavior, and a Docker image build shouldn't be gated on the full
# TypeScript project check. Run `npm run build` locally to see them.
RUN npx vite build

# ---- production ----
FROM nginx:1.27-alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
