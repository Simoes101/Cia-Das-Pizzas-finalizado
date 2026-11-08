FROM node:20-alpine

ENV NODE_ENV=production \
    DATA_DIR=/data \
    PORT=3000

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --chown=node:node . .
RUN mkdir -p /data && chown node:node /data

USER node

EXPOSE 3000

CMD ["npm", "start"]
