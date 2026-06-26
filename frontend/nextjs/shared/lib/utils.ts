import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import qs from 'qs'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** timeout 유틸 */
export const delay = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms))

/** Object({}) 형태의 param 을 queryString 으로 전환 */
export const toQueryString = <T extends object>(params: T) => {
  return qs.stringify(removeEmptyQueryParams(params), {
    // skipNulls: true,   // null, undefined 만 제거하고 '' 는 제거되지 않음
    addQueryPrefix: true,
    arrayFormat: 'repeat'
  })
}

const removeEmptyQueryParams = <T extends object>(params: T) => {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => {
      return (
        value !== '' && value !== 0 && value !== null && value !== undefined
      )
    })
  )
}

/** 일부 인자만 Partial<?> 적용 */
type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

/** 일부 인자만 Required 적용 */
type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>

/** 숫자에 콤마 삽입 */
export const formatPrice = (price: number) => {
  return price.toLocaleString('ko-KR')
}
