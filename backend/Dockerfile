# Multi-stage build for Go backend
FROM golang:1.24-alpine AS builder

# Set working directory
WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/main.go

# Final stage
FROM alpine:latest

# Install ca-certificates for HTTPS calls and chromium for PDF generation
RUN apk --no-cache add \
    ca-certificates \
    tzdata \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ttf-freefont

# Set timezone
RUN cp /usr/share/zoneinfo/UTC /etc/localtime

# Set environment variables for chromedp
ENV CHROME_BIN=/usr/bin/chromium-browser
ENV CHROME_PATH=/usr/bin/chromium-browser

WORKDIR /root/

# Copy the binary from builder stage
COPY --from=builder /app/main .

# Copy resources directory for seeding
COPY --from=builder /app/resources ./resources

# Copy static files if they exist
RUN mkdir -p ./static ./config

# Expose port
EXPOSE 8080

# Command to run
CMD ["./main"]