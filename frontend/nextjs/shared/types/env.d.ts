/** 환경변수를 자동완성 */
export declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_API_URL: string
      JSON_SERVER_API_URL: string
      NEXT_PUBLIC_JSON_SERVER_API_URL: string
    }
  }
}
