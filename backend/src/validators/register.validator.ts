// =====================================
// ファイルパス  : zerosend/backend/src/validators/register.validator.ts
// =====================================
import { z } from 'zod'

export const registerSchema = z.object({
  email:           z.string().email('Invalid email format').max(255),
  display_name:    z.string().min(1).max(100),
  password:        z.string().min(8).max(128),
  public_key_b64:  z.string().min(1),
  key_type:        z.enum(['kyber768']),
  totp_secret_enc: z.string().optional().nullable(),
})

export type RegisterBody = z.infer<typeof registerSchema>
