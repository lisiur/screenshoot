FROM lisiur/puppeteer:debian
RUN mkdir -p /app/screenshoot
COPY . /app/screenshoot/
EXPOSE 3000
WORKDIR /app/screenshoot
RUN npm i --production --registry=https://registry.npm.taobao.org 
CMD ["node", "dist/app.js"]
