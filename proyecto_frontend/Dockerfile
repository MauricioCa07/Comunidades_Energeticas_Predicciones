FROM node:20-alpine

WORKDIR /app

COPY . .

RUN rm -rf node_modules/

RUN npm install 

RUN pwd 

RUN chmod 777 node_modules/.bin/vite
EXPOSE 5173

CMD [ "npm", "run", "dev"]