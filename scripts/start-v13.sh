#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/webpro/my-app"
npm install
npm run db:generate
npm run db:push
npm test
npm start
