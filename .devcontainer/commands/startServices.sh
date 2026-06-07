#!/usr/bin/env bash
set -e  # 중간에 하나라도 실패 시, 즉시 스크립트 종료(디버깅)

docker compose --profile db up -d
docker compose --profile search up -d
docker compose --profile message up -d
docker compose --profile cypress up -d