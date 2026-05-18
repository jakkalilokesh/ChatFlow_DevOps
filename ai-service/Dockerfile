FROM node:20-alpine
WORKDIR /app
COPY package.json .
RUN npm install --production
COPY . .
EXPOSE 3006
HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3006/health || exit 1
CMD ["node", "src/app.js"]
