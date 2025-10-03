FROM node:22-alpine

WORKDIR /app
COPY . /app

RUN npm init -y && npm install express mongoose morgan cors socket.io cookie-parser bcrypt jsonwebtoken escape-string-regexp --save

EXPOSE 3020
CMD ["npm", "start"]