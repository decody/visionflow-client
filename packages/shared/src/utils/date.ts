export const getPostDateTime = (value?: string) => {
  if (!value) return 0

  const directTime = new Date(value).getTime()

  if (!Number.isNaN(directTime)) {
    return directTime
  }

  const dateParts = value.match(/\d+/g)

  if (!dateParts?.length) {
    return 0
  }

  const [year, month = '1', day = '1', hour = '0', minute = '0', second = '0'] = dateParts
  const parsedDate = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  )

  return parsedDate.getTime()
}

export const sortPostsByLatest = <T extends { createdAt?: string; id?: string }>(posts: T[]) =>
  [...posts].sort((a, b) => {
    const dateDiff = getPostDateTime(b.createdAt) - getPostDateTime(a.createdAt)

    if (dateDiff !== 0) {
      return dateDiff
    }

    return String(b.id ?? '').localeCompare(String(a.id ?? ''))
  })

export const formatPostDate = (value?: string) => {
  const dateTime = getPostDateTime(value)

  if (!dateTime) {
    return value ?? ''
  }

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateTime))
}
