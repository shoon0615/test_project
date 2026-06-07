# Dev workspace image: same family as previous compose `image` (devcontainers/base:bullseye).
# Claude Code + Codex CLI are baked here so installs are cached in image layers.
#
# Note: devcontainer.json "features" (Node, Python, Java, etc.) are applied by the Dev
# Containers tooling on top of this image. After the first Rebuild, confirm tools from
# features still appear in PATH; if not, adjust FROM/features per containers.dev docs.

FROM mcr.microsoft.com/devcontainers/base:bullseye

USER root

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    jq \
    xz-utils \
    && rm -rf /var/lib/apt/lists/*

# Node.js binary (needed at *image build* time for `npm install -g @openai/codex`).
# Dev Containers may also install Node via features; this layer avoids ordering issues.
ARG NODE_VERSION=22.14.0
RUN set -eux; \
    arch="$(dpkg --print-architecture)"; \
    case "$arch" in \
      amd64) node_arch="x64" ;; \
      arm64) node_arch="arm64" ;; \
      *) echo "unsupported dpkg arch: $arch" >&2; exit 1 ;; \
    esac; \
    curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${node_arch}.tar.xz" -o /tmp/node.tar.xz; \
    tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1; \
    rm /tmp/node.tar.xz; \
    node --version; \
    npm --version

RUN npm install -g @openai/codex \
    && codex --version

USER vscode
WORKDIR /home/vscode

ENV PATH="/home/vscode/.local/bin:/usr/local/bin:${PATH}"

# Native installer (non-interactive; uses downloads.claude.ai)
RUN curl -fsSL https://claude.ai/install.sh | bash \
    && claude --version
