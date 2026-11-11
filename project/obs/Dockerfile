FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json ./
COPY src ./src

ENV NODE_ENV=production \
  OBS_HOST=0.0.0.0 \
  OBS_PORT=8090 \
  OBS_AUTO_REMEDIATE=1

EXPOSE 8090

HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=6 \
  CMD node -e "fetch('http://127.0.0.1:8090/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npm", "start"]
