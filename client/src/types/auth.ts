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

// PasswordResetsController#create/#update — shared response shape: a
// confirmation message, no record to hydrate. #create always responds 202
// regardless of whether the email matched (account-enumeration guard);
// #update responds 200 on a successful reset. Structurally identical to
// user.ts's passwordUpdateResponseSchema, but that one names
// Profile::PasswordsController#update specifically — this is the
// unauthenticated password-reset flow, not the signed-in profile one.
export const passwordResetResponseSchema = z.object({
  message: z.string(),
})

export type PasswordResetResponse = z.infer<typeof passwordResetResponseSchema>
