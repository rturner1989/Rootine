# Auth and sessions

**Author:** Rob · **Date:** 2026-11-12 · **Status:** As-built
**Built in:** MVP spec 2026-04-03 §Authentication, commit `22d2679` (auth system), `ca4e32d` (password reset), TICKET-015, TICKET-023 (cable auth), PR #86 (rate limiting), commit `f2cc3c5` (password change), TICKET-043 (account delete)

> **Skimming, or checking whether this affects something else?** Read 1, 3 and 6.
> **Changing it?** Read 5, 7 and 9.

## 1. Outline

**What it does.** People register or log in with email and password. They stay signed in across reloads
for up to 30 days, and can reset a forgotten password by email. The same session authenticates the
API and the realtime connection.

**How it works.**

- Two tokens: a 15-minute access token held in memory, and a 30-day refresh token in an httpOnly cookie (§5.1).
- The client refreshes silently on a 401 and retries once. A reload restores the session from the cookie (§4.1, §4.2).
- Every authenticated query scopes through `current_user`, which is resolved from the access token (§5.4).
- Sign-in, registration and password reset are rate limited per IP and per email (§5.9).

## 2. Definitions

| Term | Meaning |
| ---- | ------- |
| Access token | An HS256 JWT `{ user_id, exp }` signed with `JWT_SECRET`. It's sent as `Authorization: Bearer`, and nothing on the server stores it. |
| Refresh token | A random 32-byte string in the `refresh_token` cookie. The `refresh_tokens` table stores only its SHA-256 digest, plus `expires_at` and `revoked_at`. |
| Reset token | The same shape, in `password_reset_tokens`. It lives 24 hours and is consumed (`used_at`) on success. |
| Session hint | `plantcare:session-hint` in localStorage. A non-sensitive flag that only decides whether to try restoring a session on load. |

## 3. What exists

- **Endpoints:** `POST /registration`, `POST /session`, `DELETE /session`, `POST /token`, `POST /password_resets`, `PATCH /password_resets/:token`, `PATCH /profile/password`, `DELETE /profile`. §7
- **Server:** `Authenticatable` (`api/app/controllers/concerns/authenticatable.rb`) resolves `current_user` and owns the cookie. `BaseController` adds `before_action :authenticate!`. `JwtToken`, `RefreshToken` and `PasswordResetToken` are models. §5
- **Realtime:** `ApplicationCable::Connection` authenticates with the refresh cookie. §5.7
- **Rate limits:** `api/config/initializers/rack_attack.rb`. §5.9
- **Client:** the token store and refresh queue (`client/src/api/client.ts`), `AuthContext` (login, register, logout, restore), and `ProtectedRoute`. §4

## 4. Front-end behaviour

### 4.1 Silent refresh

- **What:** A request that had an access token and gets a 401 refreshes once, then retries once. Refreshes that happen at the same time share one `POST /token`, and the rest wait in a queue. A 401 on a request that had no token (login, register) is treated as a real failure.
- **Why:** If the refresh fails, the original 401 surfaces, so a server message like "Invalid email or password" still reaches the form (`client.ts:104`, `client.ts:127`).

### 4.2 Restoring a session on load

- **What:** On mount, `AuthContext` calls `POST /token` only when the session hint is set. `ProtectedRoute` shows a spinner until that settles. It then sends signed-out users to `/login` and users who haven't finished onboarding to `/welcome`. There's no redirect back to the page the user was trying to reach.
- **Why:** The hint stops every anonymous page load producing a 401 (`AuthContext.tsx:45`). A failed restore, from the network or a schema drift, signs out only the local UI and leaves the cookie alone, so it never burns a working session (`AuthContext.tsx:146`).

### 4.3 Logout

- **What:** `DELETE /session`, then clear the token, the hint and the whole TanStack cache, then disconnect the cable. The profile is nulled before the cache is cleared.
- **Why:** A surviving cache leaked the previous user's data into the next sign-in (`c84831e`). Nulling first is what reaches the observer that's reading the user (`AuthContext.tsx:228`).

### 4.4 The profile comes with the tokens

- **What:** Login and register return `user` with stats, and the client seeds its single profile cache from that.
- **Why:** A user without stats left the Me page blank until the query refetched (`auth_controller.rb:11`).

## 5. Decisions and justifications

### 5.1 Short access token in memory, long refresh token in an httpOnly cookie

- **What:** The access token lives 15 minutes and is kept in a module variable, never in storage. The refresh token lives 30 days and is unreadable from JavaScript.
- **Why:** This is the project's security standard: refresh tokens in httpOnly cookies and never in localStorage, with short-lived access tokens that refresh automatically (global CLAUDE.md "Security"; MVP spec §Token Strategy).

### 5.2 Tokens are stored as digests

- **What:** The refresh and reset tables hold only SHA-256 digests. The raw value exists only in the cookie or the email, and `:token` is filtered from logs. Reading the database alone gives you no usable token (`ca4e32d`).

### 5.3 Cookie flags

- **What:** `httponly`, `path: '/api/v1'`, `same_site: :lax`, `secure` in production only, and a 30-day `expires` (`authenticatable.rb:20`).
- **Why:** The path keeps the token on API requests only (confirmed 2026-11-12). It's also why the cable is mounted at `/api/v1/cable` rather than `/cable` (§5.7). Lax is the Rails default, not a considered choice; Strict would also work for this same-origin app (confirmed 2026-11-12). `secure` is off outside production because dev runs over plain HTTP.

### 5.4 Stateless access tokens

- **What:** `current_user` decodes the JWT and loads the user by `user_id`. An invalid or expired token, or a deleted user, yields `nil`, and `authenticate!` returns 401 `{ error: 'Unauthorized' }`. Nothing revokes access tokens on the server: logout revokes only the refresh token, and an access token already issued lives out its 15 minutes.
- **Why:** The 15-minute lifetime is what bounds a leaked access token (§5.1).

### 5.5 Refresh issues an access token and nothing else

- **What:** `POST /token` checks that the refresh token is unrevoked and unexpired, then returns a new access token. It doesn't rotate or extend the refresh token. See §9.
- **Why:** Reason not recorded. Rotation with reuse detection is already on the pre-production list.

### 5.6 One login, many devices

- **What:** Each login creates its own refresh token row. Logout revokes only the current device's token. Deleting the account destroys every token (`has_many :refresh_tokens, dependent: :destroy`).

### 5.7 The realtime connection authenticates with the refresh cookie

- **What:** The cable connection looks up the refresh cookie and rejects it unless it's usable. This is why the cable lives at `/api/v1/cable`: the path-scoped cookie wouldn't reach `/cable` (`api/config/routes.rb:14`, TICKET-023).
- **Why:** Browsers can't send an `Authorization` header on a WebSocket upgrade, and putting the JWT in the URL would leak it into logs (confirmed 2026-11-12).
- In dev the cable needs three settings, each of which fails silently if missing; one of them is `disable_request_forgery_protection`. Production needs a real `allowed_request_origins` (see memory: ActionCable dev setup).

### 5.8 Password reset

- **What:** `POST /password_resets` always returns 202 with the same message. A match emails a single-use link to `/reset-password/:token` that's valid for 24 hours. `PATCH /password_resets/:token` returns 410 Gone once the token is expired or used.
- **Why:** The identical 202 keeps the endpoint from revealing which emails are registered (`password_resets_controller.rb:10`, `ca4e32d`).

### 5.9 Rate limits

| Throttle | Key | Limit |
| --- | --- | --- |
| `logins/email` | email in the body | 10 per 15 min |
| `logins/ip` | client IP | 30 per 15 min |
| `registrations/ip` | client IP | 10 per hour |
| `password_resets/ip` | client IP | 10 per hour |
| `password_resets/email` | email in the body | 3 per hour |

- **What:** A throttled request gets 429 with `Retry-After`. IP throttles key on the address `ActionDispatch::RemoteIp` resolved, not `req.ip`. Rack::Attack is on in production and off elsewhere unless `RACK_ATTACK_ENABLED` says otherwise.
- **Why:** Keying on both email and IP stops an attacker working one account and an attacker spraying many. The email limit stays loose enough to absorb ordinary mistyping (PR #86). `RemoteIp` makes `trusted_proxies` the one place to configure proxies (PR #86). It's off outside production because the Playwright suite registers about 29 users from one address per run (`da86231`).

### 5.10 Passwords and emails

- **What:** `has_secure_password` (bcrypt), with a minimum of 8 characters and a short list of common passwords rejected. Changing the password and deleting the account both require the current password. Email is downcased and stripped on save, matched the same way on lookup, and unique in the database.
- **Why:** Requiring the current password is the project's security standard (global CLAUDE.md "Security"). Lookups normalise because callers pass whatever the user typed (`user.rb:134`).

## 6. Impact on other areas

**Every authenticated endpoint**

- **Scoping:** every `BaseController` endpoint reads `current_user`, and data access goes through its associations. A change to how it resolves affects all of them.
- **Login streak:** the first authenticated request of each day (UTC) runs `mark_logged_in_today!` and the `user_logged_in` achievement checks *inline*. They run inline so the splash's `GET /achievements/unseen` sees the unlock immediately (`base_controller.rb:9`).

**Other surfaces**

- **Realtime:** the notification and achievement channels inherit cable auth (§5.7), and the cable disconnects on logout.
- **Onboarding:** `ProtectedRoute` gates on onboarding completion. `/welcome` opts out with `requireOnboarded={false}`.
- **Profile cache:** seeded from the auth payload (§4.4), and cleared on logout (§4.3).

**Background behaviour**

- **Mail:** reset emails go through `deliver_later` (Sidekiq). Production mail still points at `example.com`, which is a launch blocker on the pre-production list.

## 7. APIs

### 7.1 Sign-in and registration

#### `POST /api/v1/registration`

- **Request:** `user: { email, name, password, password_confirmation, onboarding_intent?, onboarding_step_reached? }`
- **Response:** 201 `{ access_token, user }`, with the refresh cookie set. `user` is the profile payload (`User#as_json(stats: true)`).
- **Errors:** 422 `{ errors: { field: [messages] } }`. 429 when throttled.

#### `POST /api/v1/session`

- **Request:** `session: { email, password }`
- **Response:** 200 `{ access_token, user }`, with the refresh cookie set.
- **Errors:** 401 `{ error: 'Invalid email or password' }`. The message is the same for an unknown email and a wrong password. 429 when throttled.

#### `DELETE /api/v1/session`

- **Response:** 204. It revokes the cookie's refresh token if there is one, and clears the cookie. A missing or unknown token still gets 204.

#### `POST /api/v1/token`

- **Access:** the refresh cookie alone. No access token is needed.
- **Response:** 200 `{ access_token }`.
- **Errors:** 401 `{ error: 'Invalid or expired refresh token' }`.

<details><summary>Example response</summary>

```json
{ "access_token": "eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo0MiwiZXhwIjoxNzk0NDgyMzAwfQ.sig" }
```

</details>

### 7.2 Passwords

#### `POST /api/v1/password_resets`

- **Request:** `password_reset: { email }`
- **Response:** 202 `{ message: "If an account exists for that email, we've sent you a reset link." }`, whether or not the email matches.
- **Errors:** 429 when throttled.
- **Side effects:** on a match, it creates a reset token and enqueues `PasswordResetMailer.reset_instructions`.

#### `PATCH /api/v1/password_resets/:token`

- **Request:** `password_reset: { password, password_confirmation }`
- **Response:** 200 `{ message }`, and the token is consumed.
- **Errors:** 410 `{ error }` when the token is expired or used. 422 `{ errors }` for password validation.

#### `PATCH /api/v1/profile/password`

- **Access:** authenticated.
- **Request:** `current_password`, plus `user: { password, password_confirmation }`.
- **Errors:** 422 `{ error: 'Current password is incorrect' }`. 422 `{ errors }` for validation.

### 7.3 Realtime

- **`/api/v1/cable`:** a WebSocket upgrade that authenticates with the refresh cookie and is rejected unless the token is usable. Channels stream per user.

## 8. Schema

| Table | Columns that matter | Constraints, indexes, notes |
| ----- | ------------------- | --------------------------- |
| `users` | `email`, `password_digest`, `last_login_on` | Unique index on `email`; email downcased on save |
| `refresh_tokens` | `token_digest`, `expires_at`, `revoked_at`, `user_id` | Unique `token_digest`; rows are never purged |
| `password_reset_tokens` | `token_digest`, `expires_at`, `used_at`, `user_id` | Unique `token_digest`; rows are never purged |

## 9. Known gaps

- **Resetting or changing the password doesn't end other sessions.** Neither flow revokes refresh tokens, so a stolen session survives the owner's reset for up to 30 days. That includes open cable connections. Reset should revoke all of them; change should revoke all but the current one (confirmed 2026-11-12) (`password_resets_controller.rb:30`, `profile/passwords_controller.rb:12`).
- **No rotation, no reuse detection, and a 30-day cliff.** Refresh tokens are never rotated, so a replayed token goes unnoticed, and a user active every day is still logged out on day 30. Rotating on refresh fixes both (confirmed 2026-11-12; pre-production list item 4).
- **Older reset links stay valid.** Requesting a new reset link, or using one, leaves earlier links usable until they expire.
- **A failed logout leaves a live cookie.** If `DELETE /session` doesn't reach the server, the UI signs out but the refresh token stays valid. The session hint is cleared, so the next load doesn't use it either.
- **Production configuration is undecided:**
  - `trusted_proxies` is unset, which collapses users onto one throttle key behind a public-IP proxy;
  - `force_ssl` is commented out;
  - the cable has no `allowed_request_origins`;
  - CORS allows only `http://localhost:5173`.

  All four are on the pre-production list.
- **Token tables grow forever.** Expired, revoked and used rows are never purged.
