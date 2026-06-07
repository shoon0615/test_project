#!/usr/bin/env bash

# DevContainer Arguments
localWorkspaceFolder=$1
containerWorkspaceFolder=$2
localWorkspaceFolderBasename=$3
containerWorkspaceFolderBasename=$4

ENV_FILE=".devcontainer/.env"

# 이미 .env 가 있으면 건드리지 않음
if [ -f "$ENV_FILE" ]; then
  echo "$ENV_FILE already exists. skip."
  exit 0
fi

# .env가 없을 때만 생성
cat > "$ENV_FILE" <<EOL

# Original DevContainer Arguments
localWorkspaceFolder=$localWorkspaceFolder
containerWorkspaceFolder=$containerWorkspaceFolder
localWorkspaceFolderBasename=$localWorkspaceFolderBasename
containerWorkspaceFolderBasename=$containerWorkspaceFolderBasename
EOL
