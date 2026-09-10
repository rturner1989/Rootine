import { z } from 'zod'
import { NetworkError } from '../errors/NetworkError'
import { NotFoundError } from '../errors/NotFoundError'
import { RateLimitError } from '../errors/RateLimitError'
import { ServerError } from '../errors/ServerError'
import { UnauthorizedError } from '../errors/UnauthorizedError'
import { ValidationError } from '../errors/ValidationError'

// Rails sends snake_case attribute keys; React form state is camelCase.
function snakeToCamel(snake: string): string {
  return snake.replace(/_([a-z])/g, (_, char) => char.toUpperCase())
}

function isFieldKeyedErrorsObject(errors: unknown): errors is Record<string, unknown> {
  return errors !== null && typeof errors === 'object' && !Array.isArray(errors) && Object.keys(errors).length > 0
}

let accessToken: string | null = null

export function setAccessToken(newAccessToken: string | null): void {
  accessToken = newAccessToken
}

export function getAccessToken(): string | null {
  return accessToken
}

let isRefreshing = false
let refreshQueue: Array<{ resolve: (token: string) => void; reject: (error: unknown) => void }> = []

function processRefreshQueue(error: unknown, token: string | null): void {
  for (const { resolve, reject } of refreshQueue) {
    if (error) {
      reject(error)
    } else if (token !== null) {
      resolve(token)
    }
  }
  refreshQueue = []
}

async function refreshAccessToken(): Promise<string> {
  if (isRefreshing) {
    return new Promise<string>((resolve, reject) => {
      refreshQueue.push({ resolve, reject })
    })
  }

  isRefreshing = true

  try {
    const response = await fetch('/api/v1/token', {
      method: 'POST',
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error('Refresh failed')
    }

    const data = await response.json()
    setAccessToken(data.access_token)
    processRefreshQueue(null, data.access_token)
    return data.access_token
  } catch (error) {
    setAccessToken(null)
    processRefreshQueue(error, null)
    throw error
  } finally {
    isRefreshing = false
  }
}

// Error classes attach `status`/`body` after construction (their JS
// constructors don't declare the fields), so callers that read
// `err.status` / `err.body` need the cast bridged in one place.
function withHttpMeta<ErrorType extends Error>(
  error: ErrorType,
  status: number,
  body: unknown,
): ErrorType & { status: number; body: unknown } {
  const errorWithMeta = error as ErrorType & { status: number; body: unknown }
  errorWithMeta.status = status
  errorWithMeta.body = body
  return errorWithMeta
}

export async function request<Schema extends z.ZodType>(
  path: string,
  schema: Schema,
  options: RequestInit = {},
): Promise<z.infer<Schema>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }

  // A 401 on an unauthenticated request (login/register) is a real failure —
  // don't try to refresh when there was no session to begin with.
  const hadAccessToken = accessToken !== null
  if (hadAccessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  // Browser sets its own multipart boundary — let it.
  if (options.body instanceof FormData) {
    delete headers['Content-Type']
  }

  let response: Response
  try {
    response = await fetch(path, {
      ...options,
      headers,
      credentials: 'include',
    })
  } catch {
    throw new NetworkError()
  }

  // Retry once with a refreshed token. If refresh fails, fall through to the
  // original 401 so Rails' message ("Invalid email or password") surfaces
  // instead of a generic "Session expired".
  if (response.status === 401 && hadAccessToken) {
    try {
      const newToken = await refreshAccessToken()
      headers.Authorization = `Bearer ${newToken}`
      response = await fetch(path, { ...options, headers, credentials: 'include' })
    } catch {
      // Intentionally empty — original 401 response is handled below.
    }
  }

  if (!response.ok) {
    const body: Record<string, unknown> = await response.json().catch(() => ({}))
    const serverMessage = body.error as string | undefined

    if (response.status === 422 && isFieldKeyedErrorsObject(body.errors)) {
      const fields: Record<string, string> = {}
      for (const [snakeField, messages] of Object.entries(body.errors)) {
        const camelField = snakeToCamel(snakeField)
        fields[camelField] = Array.isArray(messages) ? messages[0] : String(messages)
      }
      throw withHttpMeta(new ValidationError(fields), response.status, body)
    }

    if (response.status === 401) throw new UnauthorizedError(serverMessage)
    if (response.status === 404) throw new NotFoundError(serverMessage)
    if (response.status === 429) throw new RateLimitError(serverMessage)
    if (response.status >= 500) throw new ServerError(serverMessage, response.status)

    throw withHttpMeta(new Error(serverMessage || `Request failed: ${response.status}`), response.status, body)
  }

  // Deletes have no body — calling .parse() on undefined would throw.
  // Callers that hit this path pass z.void().
  if (response.status === 204) {
    return undefined as z.infer<Schema>
  }

  const data = await response.json()
  return schema.parse(data)
}

export function apiGet(path: string): Promise<unknown> {
  return request(path, z.unknown(), { method: 'GET' })
}

export function apiPost(path: string, body: unknown): Promise<unknown> {
  if (body instanceof FormData) {
    return request(path, z.unknown(), { method: 'POST', body })
  }
  return request(path, z.unknown(), { method: 'POST', body: JSON.stringify(body) })
}

export function apiPatch(path: string, body: unknown): Promise<unknown> {
  // FormData sets its own multipart boundary — stringifying it would
  // send the literal "[object FormData]".
  if (body instanceof FormData) {
    return request(path, z.unknown(), { method: 'PATCH', body })
  }
  return request(path, z.unknown(), { method: 'PATCH', body: JSON.stringify(body) })
}

// Body is optional — most deletes identify the record by URL. Account
// deletion re-authenticates with the current password, which has to
// travel in the body: a query string would land it in server logs and
// browser history.
export function apiDelete(path: string, body?: unknown): Promise<unknown> {
  if (body === undefined) return request(path, z.unknown(), { method: 'DELETE' })

  return request(path, z.unknown(), { method: 'DELETE', body: JSON.stringify(body) })
}
