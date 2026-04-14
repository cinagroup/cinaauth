# Runtime image for release publishing. The workflow places the prebuilt musl
# server binary at .release-binary/auth-framework inside this Docker context.
FROM alpine:3.19

# Install runtime dependencies
RUN apk add --no-cache \
    ca-certificates \
    libgcc \
    postgresql-client \
    curl

# Create app user
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

WORKDIR /app

# Copy binary
COPY .release-binary/auth-framework /usr/local/bin/auth-framework

# Create directories and set permissions
RUN chmod +x /usr/local/bin/auth-framework && \
    mkdir -p /app/config /app/logs && \
    chown -R appuser:appgroup /app

USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

CMD ["auth-framework"]