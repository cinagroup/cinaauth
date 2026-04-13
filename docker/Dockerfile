# Build stage
FROM --platform=$TARGETPLATFORM rust:1.88-alpine AS builder

ARG TARGETPLATFORM
ARG FEATURES=api-server,postgres-storage

# Install build dependencies
RUN apk add --no-cache \
    musl-dev \
    postgresql-dev \
    pkgconfig \
    git

# Resolve the Rust target for the current Buildx target platform.
RUN case "$TARGETPLATFORM" in \
    "linux/amd64") echo "x86_64-unknown-linux-musl" > /target.txt ;; \
    "linux/arm64") echo "aarch64-unknown-linux-musl" > /target.txt ;; \
    *) echo "Unsupported platform: $TARGETPLATFORM" && exit 1 ;; \
    esac

RUN TARGET=$(cat /target.txt) && \
    rustup target add $TARGET

WORKDIR /app

# Cache dependencies
COPY Cargo.toml Cargo.lock ./
COPY benches ./benches
COPY examples ./examples
RUN mkdir -p src/bin && \
    echo "pub fn docker_cache_marker() {}" > src/lib.rs && \
    echo "fn main() {}" > src/bin/server.rs && \
    echo "fn main() {}" > src/bin/admin.rs && \
    echo "fn main() {}" > src/bin/test_oauth2.rs
RUN TARGET=$(cat /target.txt) && \
    cargo build --release --target $TARGET --features $FEATURES --bin auth-framework
RUN rm -rf src examples benches

# Build application
COPY . .
RUN TARGET=$(cat /target.txt) && \
    cargo build --release --target $TARGET --features $FEATURES --bin auth-framework && \
    cp target/$TARGET/release/auth-framework /auth-framework

# Runtime stage  
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

# Copy binary
COPY --from=builder /auth-framework /usr/local/bin/auth-framework

# Create directories and set permissions
RUN mkdir -p /app/config /app/logs && \
    chown -R appuser:appgroup /app

USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

CMD ["auth-framework"]