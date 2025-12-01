# Use Node for dev
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and lockfile
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy all source files
COPY . .

# Expose React dev server port
EXPOSE 3000

# Start React dev server
CMD ["npm", "start"]
