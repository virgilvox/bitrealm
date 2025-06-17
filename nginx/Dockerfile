# Stage 1: Build the client application
FROM node:20.13.1-bookworm-slim AS client-builder
WORKDIR /app
COPY package*.json ./
# Use npm ci for faster, more reliable builds in CI/CD environments
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Build the Nginx image
FROM nginx:alpine

# Copy the built client from the builder stage
COPY --from=client-builder /app/dist /usr/share/nginx/html

# Copy our custom nginx configuration
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Remove the default nginx configuration
RUN rm /etc/nginx/conf.d/default.conf

# Create the uploads directory
RUN mkdir -p /usr/share/nginx/html/uploads && \
    chmod 755 /usr/share/nginx/html/uploads

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"] 