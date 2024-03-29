#!/usr/bin/env bash
set -e

rm -rf dist/win-unpacked dist/win-unpacked.zip
npm run build:win
zip -r dist/win-unpacked.zip dist/win-unpacked