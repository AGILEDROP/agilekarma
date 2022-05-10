#!/usr/bin/env bash

if [[ ! -e ./.certs ]]; then
  mkdir ./.certs
fi

sudo bash ./genlocalcrt.sh ./.certs

if [[ -z "$(docker network ls | fgrep -i proxy)" ]]; then
  docker network create proxy
fi

docker-compose up -d
