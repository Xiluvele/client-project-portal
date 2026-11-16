import 'package:flutter_test/flutter_test.dart';
import 'package:lethabo_portal_mobile/idle_timeout.dart';

void main() {
  final start = DateTime(2026, 1, 1, 9);

  IdleStatus at(Duration after, {DateTime? last}) =>
      idleStatus(start.add(after), last ?? start);

  test('active well inside the idle window', () {
    expect(at(const Duration(seconds: 1)).state, IdleState.active);
  });

  test('active just before the warning starts', () {
    expect(at(idleLimit - warningTime - const Duration(milliseconds: 1)).state,
        IdleState.active);
  });

  test('warns during the last minute and counts down', () {
    final first = at(idleLimit - warningTime);
    expect(first.state, IdleState.warning);
    expect(first.secondsLeft, 60);
    expect(at(idleLimit - const Duration(milliseconds: 1500)).secondsLeft, 2);
  });

  test('expires when the idle limit is reached', () {
    expect(at(idleLimit).state, IdleState.expired);
    expect(at(idleLimit + const Duration(minutes: 5)).state, IdleState.expired);
  });

  test('new activity restarts the clock', () {
    final last = start.add(idleLimit);
    expect(at(idleLimit + const Duration(seconds: 5), last: last).state,
        IdleState.active);
  });
}
