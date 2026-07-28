# Development image for the SIWarga SPA (React + Vite).
# Source code is bind-mounted by docker-compose.yml; the Vite dev server
# watches the filesystem and hot-reloads the browser on change.

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
