#!/usr/bin/env bash
# exit on error
set -o errexit

echo "Installing system dependencies (ffmpeg, texlive, pango, cairo)..."
apt-get update && apt-get install -y ffmpeg texlive-latex-extra pkg-config libcairo2-dev libpango1.0-dev

echo "Installing Python dependencies..."
pip install -r requirements.txt