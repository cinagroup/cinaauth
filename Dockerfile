# Auth Framework Production Deployment
FROM rust:1.88-slim as builder

# Install system dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Cargo files first for better caching
COPY Cargo.toml Cargo.lock ./
COPY examples ./examples
COPY benches ./benches

# Create dummy source files to cache dependencies
RUN mkdir -p src/bin && \
    echo "pub fn docker_cache_marker() {}" > src/lib.rs && \
    echo "fn main() {}" > src/bin/admin.rs

# Build dependencies
RUN cargo build --release --features admin-binary --bin auth-framework-admin && \
    rm -rf src target/release/deps/auth_framework*

# Copy source code
COPY src ./src

# Build the actual application
RUN cargo build --release --features admin-binary --bin auth-framework-admin

# Runtime image
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libpq5 \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN groupadd -r auth && useradd -r -g auth auth

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/target/release/auth-framework-admin /usr/local/bin/
COPY --from=builder /app/src/migrations /app/migrations

# Create directories and set permissions
RUN mkdir -p /app/config /app/logs && \
    chown -R auth:auth /app

USER auth

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD auth-framework-admin system health || exit 1

# Default command
CMD ["auth-framework-admin", "system", "status"]

# Labels
LABEL maintainer="Auth Framework Team"
LABEL version="1.0.0"
LABEL description="Production-ready authentication and authorization framework"
