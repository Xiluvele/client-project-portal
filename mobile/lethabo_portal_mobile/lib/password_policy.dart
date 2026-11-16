// Password rules for activation and password reset.
// The API enforces the same rules (backend Security/PasswordPolicy.cs);
// keep the two lists in step. This copy only gives instant feedback.

const int passwordMinLength = 12;
const int passwordMaxLength = 128;

const Set<String> _common = {
  '123456', '1234567', '12345678', '123456789', '1234567890', '0123456789',
  '111111', '000000', '121212', '123123', '654321', '112233', '123321',
  'password', 'passw0rd', 'pass', 'passcode', 'passphrase', 'letmein',
  'welcome', 'admin', 'administrator', 'root', 'user', 'login', 'master',
  'qwerty', 'qwertyuiop', 'qwertyui', 'asdfgh', 'asdfghjkl', 'zxcvbn',
  'zxcvbnm', 'qazwsx', '1q2w3e', '1q2w3e4r', '1qaz2wsx', 'azerty',
  'iloveyou', 'monkey', 'dragon', 'football', 'baseball', 'superman',
  'batman', 'sunshine', 'princess', 'shadow', 'michael', 'trustno1',
  'abc123', 'abcdef', 'abcd1234', 'test', 'testing', 'test123', 'guest',
  'default', 'changeme', 'secret', 'hello', 'freedom', 'whatever',
  'lethabo', 'portal', 'lethaboportal', 'lethabom', 'lethabomsolutions',
  'clientportal', 'projectportal', 'company', 'manager', 'developer',
  'client', 'summer', 'winter', 'spring', 'autumn', 'google', 'gmail',
  'southafrica', 'johannesburg', 'capetown', 'pretoria', 'soweto',
};

const Map<String, String> _lookalikes = {
  '0': 'o', '1': 'l', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b',
  '@': 'a', r'$': 's', '!': 'i', '|': 'l',
};

final RegExp _letter = RegExp(r'\p{L}', unicode: true);
final RegExp _letterOrDigit = RegExp(r'[^\p{L}\p{N}]', unicode: true);

bool _isLetter(String ch) => _letter.hasMatch(ch);

String _trimEdges(String text) {
  final chars = text.trim().runes.map(String.fromCharCode).toList();
  var start = 0;
  var end = chars.length;
  while (start < end && !_isLetter(chars[start])) {
    start++;
  }
  while (end > start && !_isLetter(chars[end - 1])) {
    end--;
  }
  return chars.sublist(start, end).join();
}

String _trimTail(String text) {
  final chars = text.runes.map(String.fromCharCode).toList();
  var end = chars.length;
  while (end > 0 && !_isLetter(chars[end - 1])) {
    end--;
  }
  return chars.sublist(0, end).join();
}

String _strip(String lowered, {required bool lookalikes}) {
  var text = _trimEdges(lowered);
  if (lookalikes) {
    text = _trimEdges(
      text.runes
          .map(String.fromCharCode)
          .map((ch) => _lookalikes[ch] ?? ch)
          .join(),
    );
  }
  return text;
}

bool _isRepeatedCommon(String candidate) {
  for (var size = 3; size <= candidate.length / 2; size++) {
    if (candidate.length % size != 0) continue;
    final unit = candidate.substring(0, size);
    if (_common.contains(unit) && unit * (candidate.length ~/ size) == candidate) {
      return true;
    }
  }
  return false;
}

bool isCommonPassword(String password) {
  final lowered = password.toLowerCase();
  for (final candidate in [
    _strip(lowered, lookalikes: false),
    _strip(lowered, lookalikes: true),
  ]) {
    if (candidate.isEmpty) return true; // nothing but digits and symbols
    if (_common.contains(candidate) || _isRepeatedCommon(candidate)) return true;
  }
  return _common.contains(lowered) || _common.contains(_trimTail(lowered));
}

bool isRepetitiveOrSequential(String password) {
  final lowered = password.toLowerCase();
  if (lowered.split('').toSet().length < 5) return true;

  for (final step in [-1, 1]) {
    var run = true;
    for (var i = 1; i < lowered.length; i++) {
      if (lowered.codeUnitAt(i) - lowered.codeUnitAt(i - 1) != step) {
        run = false;
        break;
      }
    }
    if (run) return true;
  }

  if (RegExp(r'^\d+$').hasMatch(lowered)) {
    if ('01234567890123456789'.contains(lowered) ||
        '98765432109876543210'.contains(lowered)) {
      return true;
    }
  }

  const rows = [
    'qwertyuiopasdfghjklzxcvbnm',
    'mnbvcxzlkjhgfdsapoiuytrewq',
    '1234567890qwertyuiop',
  ];
  return rows.any((row) => row.contains(lowered));
}

bool containsPersonalInfo(String password, List<String> personal) {
  final lowered = password.toLowerCase().replaceAll(_letterOrDigit, '');
  for (final item in personal) {
    final text = item.trim().toLowerCase();
    if (text.isEmpty) continue;
    final at = text.indexOf('@');
    final parts = [
      at > 0 ? text.substring(0, at) : text,
      ...text.split(RegExp(r'[ ._@-]+')),
    ];
    for (final part in parts) {
      final clean = part.replaceAll(_letterOrDigit, '');
      if (clean.length >= 4 && lowered.contains(clean)) return true;
    }
  }
  return false;
}

/// Returns every rule the password breaks. An empty list means it is acceptable.
List<String> validatePassword(String password, {List<String> personal = const []}) {
  final errors = <String>[];
  if (password.length < passwordMinLength) {
    errors.add('Use at least $passwordMinLength characters.');
  }
  if (password.length > passwordMaxLength) {
    errors.add('Use no more than $passwordMaxLength characters.');
  }
  if (password.trim().isEmpty) return errors;

  if (isCommonPassword(password)) {
    errors.add('That password is too common or easy to guess. Choose something less predictable.');
  } else if (isRepetitiveOrSequential(password)) {
    errors.add('Do not use repeated characters or simple sequences such as aaaa or 123456.');
  } else if (containsPersonalInfo(password, personal)) {
    errors.add('Do not include your name or email address in the password.');
  }
  return errors;
}

/// One line of the live requirements list.
class PasswordCheck {
  final String label;
  final bool met;
  final bool typed;
  const PasswordCheck(this.label, this.met, this.typed);
}

List<PasswordCheck> passwordChecks(String password, {List<String> personal = const []}) {
  final typed = password.isNotEmpty;
  return [
    PasswordCheck('At least $passwordMinLength characters', password.length >= passwordMinLength, typed),
    PasswordCheck(
      'Not a common password such as 123456, password or qwerty',
      typed && !isCommonPassword(password) && !isRepetitiveOrSequential(password),
      typed,
    ),
    PasswordCheck(
      'Does not contain your name or email address',
      typed && !containsPersonalInfo(password, personal),
      typed,
    ),
  ];
}
