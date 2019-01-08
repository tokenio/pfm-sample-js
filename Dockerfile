FROM node:10

# non-root user 'node' is defined by the base image
ENV HOME=/home/node

# copy package.json and package-lock.json
COPY package*.json $HOME/pfm-sample-js/

WORKDIR $HOME/pfm-sample-js
RUN npm install

# copy full project code into '$HOME/pfm-sample-js'
COPY . .

CMD ["node", "server.js"]
