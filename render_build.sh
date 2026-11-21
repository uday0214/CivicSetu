#!/usr/bin/env bash
# ==============================================================================
# CivicSetu: Render.com Python Environment Build Script
# ==============================================================================
set -e

echo "=== 1. Installing Python Dependencies ==="
pip install --no-cache-dir -r requirements.txt

echo "=== 2. Building React/Vite Frontend ==="
cd frontend
npm install
npm run build
cd ..

echo "=== 3. Setting up storage directories ==="
mkdir -p backend/uploads backend/data

echo "=== Build Complete! ==="
