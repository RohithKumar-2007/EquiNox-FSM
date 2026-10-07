FROM node:22 AS build

WORKDIR /usr/src/app

COPY package*.json ./

RUN --mount=type=cache,target=/root/.npm npm config set fetch-retry-maxtimeout 60000 \
    && npm config set fetch-retry-mintimeout 1000 \
    && npm config set fetch-timeout 60000 \
    && npm ci --legacy-peer-deps
COPY . .

RUN GENERATE_SOURCEMAP=false DISABLE_ESLINT_PLUGIN=true DISABLE_TYPECHECK=true NODE_OPTIONS="--max_old_space_size=2048" npm run build

FROM nginx:1.27.0-alpine
COPY --from=build /usr/src/app/build /usr/share/nginx/html
COPY --from=build /usr/src/app/.env.example /usr/share/nginx/html/.env
COPY --from=build /usr/src/app/nginx-custom.conf /etc/nginx/conf.d/default.conf

RUN apk add --no-cache nodejs npm \
    && npm install -g runtime-env-cra \
    && npm cache clean --force

WORKDIR /usr/share/nginx/html
EXPOSE 3000

CMD ["/bin/sh", "-c", "runtime-env-cra && nginx -g 'daemon off;'"]
