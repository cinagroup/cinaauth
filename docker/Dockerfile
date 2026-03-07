# Build stage
FROM --platform=$BUILDPLATFORM rust:1.83-alpine AS builder

ARG TARGETPLATFORM
ARG BUILDPLATFORM
ARG FEATURES=admin-binary,api-server,postgres-storage

# Install build dependencies
RUN apk add --no-cache \
    musl-dev \
    postgresql-dev \
    openssl-dev \
    pkgconfig \
    git

# Set up cross-compilation
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
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN TARGET=$(cat /target.txt) && \
    cargo build --release --target $TARGET --features $FEATURES
RUN rm -rf src

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
    libssl3 \
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