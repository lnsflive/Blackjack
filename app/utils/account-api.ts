export type AccountId = string | number
export interface User { id: AccountId }
export interface Player { id: AccountId; name: string; bank: number }
export interface RequestOptions {
  headers?: Record<string, string>
  withCredentials?: boolean
}
export interface AccountAPI {
  $get(url: string, options?: RequestOptions): Promise<unknown>
  $post(url: string, body: Record<string, unknown>, options?: RequestOptions): Promise<unknown>
  $put(url: string, body: Record<string, unknown>, options?: RequestOptions): Promise<unknown>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseId(value: unknown): AccountId {
  if ((typeof value === 'number' && Number.isSafeInteger(value)) || (typeof value === 'string' && value.trim() !== '')) return value
  throw new Error('Invalid account ID')
}

export function parseUser(value: unknown): User {
  if (!isRecord(value)) throw new Error('Invalid account')
  return { id: parseId(value.id) }
}

export function parsePlayer(value: unknown): Player {
  if (!isRecord(value) || typeof value.name !== 'string') throw new Error('Invalid saved profile value')
  if (!['number', 'string'].includes(typeof value.bank) || String(value.bank).trim() === '') throw new Error('Invalid saved profile value')
  const bank = Number(value.bank)
  if (!Number.isSafeInteger(bank) || bank < 0) throw new Error('Invalid saved profile value')
  return { id: parseId(value.id), name: value.name, bank }
}

export function parsePlayers(value: unknown): Player[] {
  if (!Array.isArray(value)) throw new Error('Invalid player list')
  return value.map(parsePlayer)
}

export function apiFailure(error: unknown): { status: number | null; code: string | null } {
  if (!isRecord(error)) return { status: null, code: null }
  const response = isRecord(error.response) ? error.response : {}
  const data = isRecord(response.data) ? response.data : isRecord(error.data) ? error.data : {}
  return {
    status: typeof response.status === 'number' ? response.status : null,
    code: typeof data.message === 'string' ? data.message : typeof data.error === 'string' ? data.error : null,
  }
}
