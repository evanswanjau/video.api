#!/bin/bash

set -e

echo "Starting deployment to dev..."

command -v git >/dev/null 2>&1 || { echo >&2 "git is required but it's not installed. Aborting."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo >&2 "npm is required but it's not installed. Aborting."; exit 1; }
command -v pm2 >/dev/null 2>&1 || { echo >&2 "pm2 is required but it's not installed. Aborting."; exit 1; }

cd ../ && mv dev.api dev.api.old && 
echo "Moved old dev.api ✅" && 

git clone -b develop git@github.com:evanswanjau/video.api.git dev.api && 
echo "Cloned new dev.api ✅" &&

cp dev.api.old/.env dev.api/.env &&
echo "Copied .env ✅" &&

rm -rf dev.api.old &&
echo "Removed old dev.api ✅" &&

cd dev.api && npm i &&
echo "Installed dependencies ✅" &&

npm run build &&
echo "Building project completed ✅" &&

pm2 restart dev.api &&
echo "Deployed to dev 🚀"