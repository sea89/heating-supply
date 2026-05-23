FROM node:20-alpine AS build
WORKDIR /app
COPY client/package.json ./
RUN npm install
COPY client/ .
RUN npm run build

FROM node:20-alpine
COPY --from=build /app/dist /app/dist
COPY --from=build /app/server-proxy.js /app/server-proxy.js
EXPOSE 80
CMD ["node", "/app/server-proxy.js"]
