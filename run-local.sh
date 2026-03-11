#!/usr/bin/env bash
set -euo pipefail

# SRS Rereading App bootstrap + run script
# Usage: ./run-local.sh

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is not installed or not in PATH."
  exit 1
fi

echo "[1/3] Installing dependencies..."
npm install

echo "[2/3] Building app for sanity check..."
npm run build

echo "[3/3] Starting dev server..."
npm run dev
