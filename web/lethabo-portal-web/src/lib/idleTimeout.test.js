import assert from 'node:assert/strict'
import { test } from 'node:test'
import { idleStatus } from './idleTimeout.js'

const IDLE = 15 * 60 * 1000
const WARN = 60 * 1000

test('active while well inside the idle window', () => {
  assert.equal(idleStatus(1_000, 0, IDLE, WARN).status, 'active')
})

test('active just before the warning starts', () => {
  assert.equal(idleStatus(IDLE - WARN - 1, 0, IDLE, WARN).status, 'active')
})

test('warns for the last minute and counts down', () => {
  const at = idleStatus(IDLE - WARN, 0, IDLE, WARN)
  assert.equal(at.status, 'warning')
  assert.equal(at.secondsLeft, 60)
  assert.equal(idleStatus(IDLE - 1_500, 0, IDLE, WARN).secondsLeft, 2)
})

test('expires when the idle time is reached', () => {
  assert.equal(idleStatus(IDLE, 0, IDLE, WARN).status, 'expired')
  assert.equal(idleStatus(IDLE + 60_000, 0, IDLE, WARN).status, 'expired')
})

test('new activity restarts the clock', () => {
  assert.equal(idleStatus(IDLE + 5_000, IDLE, IDLE, WARN).status, 'active')
})
