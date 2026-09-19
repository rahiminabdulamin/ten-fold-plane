#!/bin/bash

# Plane Project Setup Script
# This script prepares the local development environment by setting up all necessary .env files
# https://github.com/makeplane/plane

# Set colors for output messages
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Print header
echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${BLUE}                   Plane - Project Management Tool                    ${NC}"
echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}Setting up your development environment...${NC}\n"

# Function to handle file copying with error checking
copy_env_file() {
    local source=$1
    local destination=$2

    if [ ! -f "$source" ]; then
        echo -e "${RED}Error: Source file $source does not exist.${NC}"
        return 1
    fi

    if [ -f "$destination" ]; then
        echo -e "${BLUE}•${NC} Preserved existing $destination"
        return 0
    fi

    cp "$source" "$destination"

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} Copied $destination"
    else
        echo -e "${RED}✗${NC} Failed to copy $destination"
        return 1
    fi
}

env_value() {
    local file=$1
    local key=$2
    local line value
    line=$(grep "^${key}=" "$file" | tail -1) || true
    value=${line#*=}
    value=$(printf '%s' "$value" | sed 's/^[[:space:]]*//')

    case "$value" in
        \"*) value=${value#\"}; printf '%s\n' "${value%%\"*}" ;;
        \'*) value=${value#\'}; printf '%s\n' "${value%%\'*}" ;;
        *) printf '%s' "${value%%#*}" | sed 's/[[:space:]]*$//' ;;
    esac
}

set_env_value() {
    local file=$1
    local key=$2
    local value=$3
    local escaped_value

    if [ "$(env_value "$file" "$key")" = "$value" ]; then
        return 0
    fi

    escaped_value=$(printf '%s' "$value" | sed 's/[\\&|]/\\&/g') || return 1

    if grep -q "^${key}=" "$file"; then
        sed -i.bak "s|^${key}=.*|${key}=\"${escaped_value}\"|" "$file" && rm -f "${file}.bak"
    else
        echo "${key}=\"${value}\"" >> "$file"
    fi
}

# Export character encoding settings for macOS compatibility
export LC_ALL=C
export LC_CTYPE=C
echo -e "${YELLOW}Setting up environment files...${NC}"

# Copy all environment example files
services=("" "web" "api" "space" "admin" "live")
success=true

for service in "${services[@]}"; do
    if [ "$service" == "" ]; then
        # Handle root .env file
        prefix="./"
    else
        # Handle service .env files in apps folder
        prefix="./apps/$service/"
    fi

    copy_env_file "${prefix}.env.example" "${prefix}.env" || success=false
done

# Generate SECRET_KEY for Django
if [ -f "./apps/api/.env" ]; then
    existing_secret_key=$(env_value "./apps/api/.env" "SECRET_KEY")
    if [ -n "$existing_secret_key" ]; then
        echo -e "\n${BLUE}•${NC} Preserved existing Django SECRET_KEY"
    else
        echo -e "\n${YELLOW}Generating Django SECRET_KEY...${NC}"
        SECRET_KEY=$(tr -dc 'a-z0-9' < /dev/urandom | head -c50)

        if [ -z "$SECRET_KEY" ]; then
            echo -e "${RED}Error: Failed to generate SECRET_KEY.${NC}"
            echo -e "${RED}Ensure 'tr' and 'head' commands are available on your system.${NC}"
            success=false
        else
            if set_env_value "./apps/api/.env" "SECRET_KEY" "$SECRET_KEY"; then
                echo -e "${GREEN}✓${NC} Added SECRET_KEY to apps/api/.env"
            else
                echo -e "${RED}Error: Failed to write SECRET_KEY to apps/api/.env.${NC}"
                success=false
            fi
        fi
    fi
else
    echo -e "${RED}✗${NC} apps/api/.env not found. SECRET_KEY not added."
    success=false
fi

# Copilot identity tokens must be signed and verified with the same secret.
if [ -f "./.env" ] && [ -f "./apps/api/.env" ]; then
    echo -e "\n${YELLOW}Configuring Copilot identity token secret...${NC}"
    root_copilot_secret=$(env_value "./.env" "COPILOT_IDENTITY_TOKEN_SECRET")
    api_copilot_secret=$(env_value "./apps/api/.env" "COPILOT_IDENTITY_TOKEN_SECRET")

    if [ -n "$root_copilot_secret" ] && [ -n "$api_copilot_secret" ] && [ "$root_copilot_secret" != "$api_copilot_secret" ]; then
        echo -e "${RED}Error: COPILOT_IDENTITY_TOKEN_SECRET differs between .env and apps/api/.env.${NC}"
        success=false
    else
        copilot_secret=${root_copilot_secret:-$api_copilot_secret}
        if [ -z "$copilot_secret" ]; then
            copilot_secret=$(tr -dc 'a-zA-Z0-9' < /dev/urandom | head -c64)
        fi

        if [ -z "$copilot_secret" ]; then
            echo -e "${RED}Error: Failed to generate COPILOT_IDENTITY_TOKEN_SECRET.${NC}"
            success=false
        else
            if set_env_value "./.env" "COPILOT_IDENTITY_TOKEN_SECRET" "$copilot_secret" &&
                set_env_value "./apps/api/.env" "COPILOT_IDENTITY_TOKEN_SECRET" "$copilot_secret"; then
                echo -e "${GREEN}✓${NC} Configured the shared Copilot identity token secret"
            else
                echo -e "${RED}Error: Failed to write COPILOT_IDENTITY_TOKEN_SECRET.${NC}"
                success=false
            fi
        fi
    fi
else
    echo -e "${RED}✗${NC} .env or apps/api/.env not found. Copilot identity token secret not configured."
    success=false
fi

# Activate pnpm (version set in package.json)
corepack enable pnpm || success=false
# Install Node dependencies
pnpm install || success=false

# Summary
echo -e "\n${YELLOW}Setup status:${NC}"
if [ "$success" = true ]; then
    echo -e "${GREEN}✓${NC} Environment setup completed successfully!\n"
    echo -e "${BOLD}Next steps:${NC}"
    echo -e "1. Review the .env files in each folder if needed"
    echo -e "2. Start the services with: ${BOLD}docker compose -f docker-compose-local.yml up -d${NC}"
    echo -e "\n${GREEN}Happy coding! 🚀${NC}"
else
    echo -e "${RED}✗${NC} Some issues occurred during setup. Please check the errors above.\n"
    echo -e "For help, visit: ${BLUE}https://github.com/makeplane/plane${NC}"
    exit 1
fi
