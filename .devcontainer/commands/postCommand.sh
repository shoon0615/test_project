#!/usr/bin/env bash
# Claude Code and Codex CLI are baked into the image via .devcontainer/Dockerfile (not installed here).

echo "Changing owner of paths that mounted by named volumes"
sudo chown -R $USER:$USER $VOLUME_PATHS_TO_CHANGE_OWNER

# Python 패키지 제거 (agents SDK는 Node.js용이므로 불필요)
# pip install pyhwp six uv

# apt 패키지 제거 (사용 안 함)
# sudo apt install -y iputils-ping libreoffice poppler-utils

echo "Install global npm packages"
npm install -g npm@latest

# NestJS CLI 설치
echo "Installing NestJS CLI..."
npm install -g @nestjs/cli@11.0.7

# 설치 검증
echo "Verifying NestJS CLI installation..."
nest --version || {
    echo "ERROR: NestJS CLI installation failed!"
    exit 1
}

echo "Setup completed successfully!"