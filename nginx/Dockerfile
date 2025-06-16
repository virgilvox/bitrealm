FROM nginx:alpine

# Create the uploads directory
RUN mkdir -p /usr/share/nginx/html/uploads && \
    chmod 755 /usr/share/nginx/html/uploads

# Copy the nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create a simple index.html if it doesn't exist
RUN echo '<h1>Bitrealm</h1>' > /usr/share/nginx/html/index.html

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"] 