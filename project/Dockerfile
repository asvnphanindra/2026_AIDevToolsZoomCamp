# Work Planner local stack: Vite app + Firebase Auth/Firestore emulators.
FROM eclipse-temurin:21-jre-jammy AS jre

FROM node:20-bookworm

COPY --from=jre /opt/java/openjdk /opt/java/openjdk
ENV JAVA_HOME=/opt/java/openjdk \
  PATH="/opt/java/openjdk/bin:${PATH}"

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/* \
  && java -version

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV NODE_ENV=development \
  VITE_USE_EMULATORS=true \
  VITE_FIREBASE_API_KEY=demo-api-key \
  VITE_FIREBASE_AUTH_DOMAIN=work-planner-demo.firebaseapp.com \
  VITE_FIREBASE_PROJECT_ID=work-planner-demo \
  VITE_FIREBASE_STORAGE_BUCKET=work-planner-demo.appspot.com \
  VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000 \
  VITE_FIREBASE_APP_ID=1:000000000000:web:demo \
  VITE_FIREBASE_AUTH_EMULATOR_URL=http://127.0.0.1:9099 \
  VITE_FIRESTORE_EMULATOR_HOST=127.0.0.1 \
  VITE_FIRESTORE_EMULATOR_PORT=8080 \
  VITE_OBS_URL=http://127.0.0.1:8090

EXPOSE 5173 4000 9099 8080 9150

HEALTHCHECK --interval=10s --timeout=5s --start-period=90s --retries=12 \
  CMD curl -fsS http://127.0.0.1:5173/ >/dev/null && curl -fsS http://127.0.0.1:9099/ >/dev/null || exit 1

CMD ["node", "scripts/docker-start.mjs"]
