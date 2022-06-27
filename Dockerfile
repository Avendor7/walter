FROM node:18

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY . .

#remove any local env during build process
RUN rm .env

#copy in the production env
#difference being this one doesn't have an env set
COPY .env.production.local .env

CMD [ "node", "src/index.js" ]