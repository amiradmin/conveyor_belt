# مرحله build
FROM node:20 AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build

# مرحله run
FROM node:20
WORKDIR /app
COPY --from=build /app ./
EXPOSE 4173
CMD ["npm", "run", "dev", "--", "--host"]
