FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the React app
RUN npm run build

# Install a simple server to serve the built files
RUN npm install -g serve

# Serve the built app on port 3000
EXPOSE 3000

# Start serving the built React app
CMD ["serve", "-s", "dist", "-l", "3000"]