const dateFormat = new Intl.DateTimeFormat('ko-KR', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Seoul',
})

export function formatPostDate(createdAt: string): string {
  return dateFormat.format(new Date(createdAt))
}
