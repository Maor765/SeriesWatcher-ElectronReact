import { appendFileSync, mkdirSync } from 'fs'
import { dirname } from 'path'

function ts(): string { return new Date().toISOString().replace('T', ' ').substring(0, 19) }

export function logMutation(logPath: string, message: string): void {
  mkdirSync(dirname(logPath), { recursive: true })
  appendFileSync(logPath, `[${ts()}] ${message}\n`, 'utf-8')
}
