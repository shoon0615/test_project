import { DefaultOptions, QueryClient } from '@tanstack/react-query'

/**
 * react-query 설정
 * @param throwOnError 쿼리 실패 시, 오류 여부
 * @param refetchOnWindowFocus 브라우저 focus 마다 데이터 갱신 여부(default: true)
 * @param retry 쿼리 실패 시, 재시도 횟수(default: 3)
 * @param staleTime 만료 시간(default: 0)
 */
export const queryConfig = {
  queries: {
    // throwOnError: true,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 1000 * 60
  },
  mutations: {
    retry: false,
    networkMode: 'always'
  }
} satisfies DefaultOptions

export const makeQueryClient = () => {
  return new QueryClient({
    defaultOptions: queryConfig
  })
}
