#!/usr/bin/env bash
# exit on error
set -o errexit

echo "Installing system dependencies (ffmpeg, texlive)..."
apt-get update && apt-get install -y ffmpeg texlive-latex-extra

echo "Installing Python dependencies..."
pip install -r requirements.txt