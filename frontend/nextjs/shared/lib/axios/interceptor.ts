import type {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig
} from 'axios'

const apiConfig = (config: InternalAxiosRequestConfig) => {
  // config.headers['Content-Type'] = 'application/json'
  config.headers.set('Content-Type', 'application/json')

  /** TODO: */
  // headers: { Authorization: 'SECRET' }   // 챗GPT: API KEY 숨김 용도??

  // config.timeout = 10000
  // config.withCredentials = true
  return config
}

export const apiInstance = (api: AxiosInstance) => {
  api.interceptors.request.use(apiConfig)

  // Client 환경에서만 실행
  /* api.interceptors.request.use(config => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken')

      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }

    return config
  }) */

  // 공통 에러 처리
  api.interceptors.response.use(
    response => response,
    // async error => {
    (error: AxiosError) => {
      console.error(error)

      if (error.response?.status === 401) {
        console.error('인증 만료')
      }

      return Promise.reject(error)
    }
  )
  return api
}

/*
accessInstance.interceptors.request.use(
  config => {
    if (!config.headers.Authorization) {
      config.headers = {
        ...config.headers,
        Authorization: `JWT ${localStorage.getItem('token')}`
      }
    }

    return config
  },
  error => {}
)
*/
