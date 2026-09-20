import { neon } from '@neondatabase/serverless'

let client: ReturnType<typeof neon> | undefined

export function sql() {
  if (!client) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured.')
    client = neon(process.env.DATABASE_URL)
  }
  return client
}

export const query = <T>(text: string, params: unknown[] = []) =>
  sql().query(text, params) as Promise<T[]>
