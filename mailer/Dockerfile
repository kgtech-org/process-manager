# Simple PHP mailer service running Apache
FROM php:8.2-apache

# Install required PHP extensions
RUN apt-get update && apt-get install -y \
    libzip-dev git unzip && \
    docker-php-ext-install zip && \
    a2enmod rewrite && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/html

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Copy app files and install deps
COPY composer.json composer.lock* ./
RUN composer install --no-dev --prefer-dist --no-interaction --no-progress

COPY . .

# Apache config: allow .htaccess overrides
RUN echo "<Directory /var/www/html>\n    AllowOverride All\n    Require all granted\n</Directory>" > /etc/apache2/conf-available/mailer.conf && \
    a2enconf mailer

ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf && \
    sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

EXPOSE 80

# Defaults for health
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD curl -fsS http://localhost/health || exit 1


