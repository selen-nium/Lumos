FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all source code
COPY . .

# App runs on port 3001
EXPOSE 5001

# Start the app
CMD ["npm", "start"]