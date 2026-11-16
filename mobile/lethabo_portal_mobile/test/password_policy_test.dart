import 'package:flutter_test/flutter_test.dart';
import 'package:lethabo_portal_mobile/password_policy.dart';

void main() {
  const weak = [
    '', 'short1!', 'Abcdefg1!xy', '123456', 'password', 'qwerty', 'admin123',
    'password123456', 'Password1234!!', 'P@ssw0rd2024!!', 'qwertyuiop12',
    'Qwerty123456!', 'admin1234567', 'iloveyou2024!', 'letmein123456',
    'passwordpassword', '123456789012', '000000000000', 'aaaaaaaaaaaaaa',
    'abcdefghijkl', '987654321098',
  ];
  const strong = [
    'correct horse battery staple', 'Mango-River-Lantern-47', 't7Kp!zQ2vLm9#x',
    'my dog eats blue cheese', 'Tg4\$kLw9!pQx',
  ];

  for (final pw in weak) {
    test('rejects weak password "$pw"', () {
      expect(validatePassword(pw, personal: ['someone@example.com']), isNotEmpty);
    });
  }

  for (final pw in strong) {
    test('accepts strong password "$pw"', () {
      expect(validatePassword(pw, personal: ['someone@example.com']), isEmpty);
    });
  }

  test('rejects a password containing the email name', () {
    expect(
      validatePassword('thabo.mokoena-2026-xyz', personal: ['thabo.mokoena@example.com']),
      isNotEmpty,
    );
  });

  test('rejects passwords over 128 characters', () {
    expect(validatePassword('${'a' * 64}Zq7!${'b' * 64}'), isNotEmpty);
  });
}
