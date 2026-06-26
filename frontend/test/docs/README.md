# 공통

## 설치 및 구성

### Next.js

```bash
pnpm create next-app@latest 프로젝트이름

vscode ➜ ~/test_project/frontend/test (features/ai) $ npx create-next-app@latest nobase
Need to install the following packages:
create-next-app@16.2.9
Ok to proceed? (y) y
? Would you like to use the recommended Next.js defaults? › - Use arrow-keys. Return to submit.
❯   Yes, use recommended defaults - TypeScript, ESLint, No React Compiler, Tailwind CSS, No src/ directory, App Router, AGENTS.md
```

### Prettier

```bash
pnpm i -D prettier eslint-config-prettier eslint-plugin-prettier prettier-plugin-tailwindcss
```

```ts
/* eslint.config.mjs */
// ...
import prettierRecommended from 'eslint-config-prettier'
import tanstackQuery from '@tanstack/eslint-plugin-query'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettierRecommended,
  tanstackQuery.configs['flat/recommended']
  // ...
])
```

```ts
/* .prettierrc */
{
  "semi": false,
  "singleQuote": true,
  "singleAttributePerLine": true,
  "bracketSameLine": true,
  "endOfLine": "lf",
  "trailingComma": "none",
  "arrowParens": "avoid",
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

---

## 로드맵

기본적인 REST API 기반의 CRUD 게시판 작성

| 폴더 명   | 목적        | Model   | Plugin                           | 기술 스택 |
| --------- | ----------- | ------- | -------------------------------- | --------- |
| harness   | 개인 하네스 | `Codex` | ❌                               | ❌ → ✅   |
| nobase    | CRUD 게시판 | `Codex` | ❌                               | ❌ → ✅   |
| bkit      | CRUD 게시판 | `Codex` | `bkit`                           | ❌ → ✅   |
| framework | CRUD 게시판 | `Codex` | `bkit` `superpowers` `gstack`    | ❌ → ✅   |
| token     | CRUD 게시판 | `Codex` | framework + `caveman` `ponytail` | ❌ → ✅   |

1. 만들어진 프로젝트의 구성 및 설명이 작성된 요약본, token 량 등을 정리한 문서를 md 파일로 최종 제공하여 비교
2. 기술 스택이 없는 상태의 1번과 2번을 각각 비교
3. 폴더의 단계별로 진행해가며, 이전 단계와 어떤 점이 차이 혹은 발전했는지 비교

> 어느 정도 수준으로 만들어지는지 확인

---

## 예정

1. harness 공부 및 개인 harness 생성
2. hand-off 공부 및 적용
3. skills 공부 및 어떻게 적용됐는지
4. sub agent 공부 및 어떻게 적용됐는지
