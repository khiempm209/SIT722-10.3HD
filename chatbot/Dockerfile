FROM node:22-alpine

WORKDIR /app
COPY . /app

RUN npm init -y && npm install express mongoose @google/genai --save

EXPOSE 3030
CMD ["npm", "start"]