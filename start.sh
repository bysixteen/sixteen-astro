#!/bin/bash

# Check if build directory exists
if [ ! -d "dist" ]; then
    echo "Build directory not found. Building Strapi..."
    NODE_OPTIONS='--max-old-space-size=4096' npx strapi build
fi

# Start Strapi
echo "Starting Strapi..."
NODE_OPTIONS='--max-old-space-size=4096' npx strapi start 