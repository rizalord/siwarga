# Development image for the SIWarga API (Laravel).
# Source code is bind-mounted by docker-compose.yml, so PHP being an
# interpreted language means code changes are reflected on the next
# request without rebuilding the image.

FROM php:8.3-cli

RUN apt-get update && apt-get install -y --no-install-recommends \
        git \
        unzip \
        default-mysql-client \
        libzip-dev \
        libpng-dev \
        libonig-dev \
        libxml2-dev \
    && docker-php-ext-install pdo_mysql mbstring zip exif pcntl bcmath gd \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Warm up vendor/ at build time so the named volume declared in
# docker-compose.yml starts populated even before the bind mount kicks in.
COPY composer.json composer.lock ./
RUN composer install --no-scripts --no-interaction --prefer-dist

COPY . .

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["entrypoint.sh"]
# `php artisan serve` forks its actual HTTP worker via Symfony Process,
# which does not reliably forward env vars injected by `docker compose`
# (e.g. DB_HOST) to the child — it ends up re-reading .env instead. Run
# the built-in server script directly so it inherits the container env.
CMD ["sh", "-c", "cd public && exec php -S 0.0.0.0:8000 ../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php"]
