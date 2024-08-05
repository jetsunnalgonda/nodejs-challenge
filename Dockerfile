# Use the official Node.js image as a base
FROM node:22-alpine

# Create and change to the app directory
WORKDIR /Users/jnalgonda/Documents/Developer/nodejs-challenge

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Copy the uploads directory
COPY uploads /app/uploads

# Copy the certificate and key files
COPY private.key /app/private.key
COPY certificate.crt /app/certificate.crt

# Copy the wait-for-it.sh script
COPY wait-for-it.sh .

# Expose the port the app runs on
EXPOSE 3010

# Define the command to run the app
CMD ["npm", "start"]
