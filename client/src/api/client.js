import { NetworkError } from '../errors/NetworkError'
import { NotFoundError } from '../errors/NotFoundError'
import { RateLimitError } from '../errors/RateLimitError'
import { ServerError } from '../errors/ServerError'
import { UnauthorizedError } from '../errors/UnauthorizedError'
import { ValidationError } from '../errors/ValidationError'

// Rails sends snake_case attribute keys; React form state is camelCase.
function snakeToCamel(snake) {
  return snake.replace(/_([a-z])/g, (_, char) => char.toUpperCase())
}

function isFieldKeyedErrorsObject(errors) {
  return errors !== null && typeof errors === 'object' && !Array.isArray(errors) && Object.keys(errors).length > 0
}

let accessToken = null

export function setAccessToken(newAccessToken) {
  accessToken = newAccessToken
}

export function getAccessToken() {
  return accessToken
}

let isRefreshing = false
let refreshQueue = []

function processRefreshQueue(error, token) {
  for (const { resolve, reject } of refreshQueue) {
    if (error) {
      reject(error)
    } else {
      resolve(token)
    }
  }
  refreshQueue = []
}

async function refreshAccessToken() {
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
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

export async function apiFetch(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
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

  let response
  try {
    response = await fetch(url, {
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
      response = await fetch(url, { ...options, headers, credentials: 'include' })
    } catch {
      // Intentionally empty — original 401 response is handled below.
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const serverMessage = body.error

    if (response.status === 422 && isFieldKeyedErrorsObject(body.errors)) {
      const fields = {}
      for (const [snakeField, messages] of Object.entries(body.errors)) {
        const camelField = snakeToCamel(snakeField)
        fields[camelField] = Array.isArray(messages) ? messages[0] : String(messages)
      }
      const validationError = new ValidationError(fields)
      validationError.status = response.status
      validationError.body = body
      throw validationError
    }

    if (response.status === 401) throw new UnauthorizedError(serverMessage)
    if (response.status === 404) throw new NotFoundError(serverMessage)
    if (response.status === 429) throw new RateLimitError(serverMessage)
    if (response.status >= 500) throw new ServerError(serverMessage, response.status)

    const error = new Error(serverMessage || `Request failed: ${response.status}`)
    error.status = response.status
    error.body = body
    throw error
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

export function apiGet(url) {
  return apiFetch(url, { method: 'GET' })
}

export function apiPost(url, body) {
  if (body instanceof FormData) {
    return apiFetch(url, { method: 'POST', body })
  }
  return apiFetch(url, { method: 'POST', body: JSON.stringify(body) })
}

export function apiPatch(url, body) {
  return apiFetch(url, { method: 'PATCH', body: JSON.stringify(body) })
}

// Body is optional — most deletes identify the record by URL. Account
// deletion re-authenticates with the current password, which has to
// travel in the body: a query string would land it in server logs and
// browser history.
export function apiDelete(url, body) {
  if (body === undefined) return apiFetch(url, { method: 'DELETE' })

  return apiFetch(url, { method: 'DELETE', body: JSON.stringify(body) })
}
