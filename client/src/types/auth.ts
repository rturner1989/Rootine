import { z } from 'zod'
import { userSchema } from './user'

// AuthController#issue_tokens — shared response shape for session create
// (login) and registration create.
export const authResponseSchema = z.object({
  access_token: z.string(),
  user: userSchema,
})

export type AuthResponse = z.infer<typeof authResponseSchema>

// TokensController#create — refresh-token exchange.
export const tokenResponseSchema = z.object({
  access_token: z.string(),
})

export type TokenResponse = z.infer<typeof tokenResponseSchema>
