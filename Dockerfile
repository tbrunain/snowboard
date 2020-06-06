FROM node:lts-alpine as build-stage

WORKDIR /app

ARG VUE_APP_SNWBRD_BOOTSTRAP_HOST
ARG VUE_APP_SNWBRD_BOOTSTRAP_PROTOCOL
ARG VUE_APP_SNWBRD_BOOTSTRAP_CHAIN_ID
ARG VUE_APP_SNWBRD_BOOTSTRAP_PORT
ARG VUE_APP_SNWBRD_BOOTSTRAP_NETWORK_ID

# 'LOCAL' NODE RELATED CONFIG

ARG VUE_APP_SNWBRD_NODE_HOST
ARG VUE_APP_SNWBRD_NODE_PROTOCOL
ARG VUE_APP_SNWBRD_NODE_CHAIN_ID
ARG VUE_APP_SNWBRD_NODE_PORT
ARG VUE_APP_SNWBRD_NODE_NETWORK_ID

ENV VUE_APP_SNWBRD_BOOTSTRAP_HOST  $VUE_APP_SNWBRD_BOOTSTRAP_HOST
ENV VUE_APP_SNWBRD_BOOTSTRAP_PROTOCOL  $VUE_APP_SNWBRD_BOOTSTRAP_PROTOCOL
ENV VUE_APP_SNWBRD_BOOTSTRAP_CHAIN_ID  $VUE_APP_SNWBRD_BOOTSTRAP_CHAIN_ID
ENV VUE_APP_SNWBRD_BOOTSTRAP_PORT  $VUE_APP_SNWBRD_BOOTSTRAP_PORT
ENV VUE_APP_SNWBRD_BOOTSTRAP_NETWORK_ID $VUE_APP_SNWBRD_BOOTSTRAP_NETWORK_ID

ENV VUE_APP_SNWBRD_NODE_HOST $VUE_APP_SNWBRD_NODE_HOST
ENV VUE_APP_SNWBRD_NODE_PROTOCOL $VUE_APP_SNWBRD_NODE_PROTOCOL
ENV VUE_APP_SNWBRD_NODE_CHAIN_ID $VUE_APP_SNWBRD_NODE_CHAIN_ID
ENV VUE_APP_SNWBRD_NODE_PORT $VUE_APP_SNWBRD_NODE_PORT
ENV VUE_APP_SNWBRD_NODE_NETWORK_ID $VUE_APP_SNWBRD_NODE_NETWORK_ID


COPY package.json yarn.lock ./

RUN yarn

COPY . .

RUN yarn build

FROM nginx:stable-alpine as production-stage

COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY env2js.sh ./
RUN ["chmod", "+x", "./env2js.sh"]

EXPOSE 80
CMD sh -c './env2js.sh > /usr/share/nginx/html/config.js && nginx -g "daemon off;"'
