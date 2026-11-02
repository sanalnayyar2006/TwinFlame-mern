export const OFFLINE_MESSAGE = "Couldn't reach TwinFlame. Check your connection and try again."

// The shared api client returns the parsed body for every status, so each service
// checks the response shape and turns anything else into an Error with the server's message
export const request = async <T>(call: () => Promise<unknown>, isValid: (data: unknown) => boolean): Promise<T> => {
  let data: unknown
  try {
    data = await call()
  } catch {
    throw new Error(OFFLINE_MESSAGE)
  }
  if (isValid(data)) return data as T
  const message = data && typeof data === 'object' && 'message' in data ? String(data.message) : ''
  throw new Error(message || OFFLINE_MESSAGE)
}

export const hasKeys = (...keys: string[]) => (data: unknown) =>
  !!data && typeof data === 'object' && keys.every(k => k in data)
