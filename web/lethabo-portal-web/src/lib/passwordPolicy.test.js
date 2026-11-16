import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validatePassword } from './passwordPolicy.js'

const weak = [
  '', 'short1!', 'Abcdefg1!xy', '123456', 'password', 'qwerty', 'admin123',
  'password123456', 'Password1234!!', 'P@ssw0rd2024!!', 'qwertyuiop12',
  'Qwerty123456!', 'admin1234567', 'iloveyou2024!', 'letmein123456',
  'passwordpassword', '123456789012', '000000000000', 'aaaaaaaaaaaaaa',
  'abcdefghijkl', '987654321098',
]
const strong = [
  'correct horse battery staple', 'Mango-River-Lantern-47', 't7Kp!zQ2vLm9#x',
  'my dog eats blue cheese', 'Tg4$kLw9!pQx',
]

for (const pw of weak) {
  test(`rejects weak password "${pw}"`, () => {
    assert.ok(validatePassword(pw, ['someone@example.com']).length > 0)
  })
}

for (const pw of strong) {
  test(`accepts strong password "${pw}"`, () => {
    assert.deepEqual(validatePassword(pw, ['someone@example.com']), [])
  })
}

test('rejects a password containing the email name', () => {
  assert.ok(validatePassword('thabo.mokoena-2026-xyz', ['thabo.mokoena@example.com']).length > 0)
})

test('rejects passwords over 128 characters', () => {
  assert.ok(validatePassword('a'.repeat(64) + 'Zq7!' + 'b'.repeat(64)).length > 0)
})
