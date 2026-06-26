import { handlers } from '@/shared/lib/auth'

/**
 * 모든 하위 경로의 동적 일치(Catch all API routes)로 라우트를 제공
 * 기본 구성에서 반환하는 handlers 객체로 라우트의 GET과 POST 함수를 매핑합니다.
 */
export const { GET, POST } = handlers
// export const runtime = 'edge' // Optional!
