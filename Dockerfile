FROM node:15.12

COPY ./package.json .
RUN npm install

EXPOSE 8000
EXPOSE 8080

COPY ./entrypoint.sh .

CMD ["entrypoint.sh"]