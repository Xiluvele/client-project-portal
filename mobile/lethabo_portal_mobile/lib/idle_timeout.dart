import 'dart:async';

import 'package:flutter/material.dart';

import 'api/portal_api.dart';
import 'screens/login_screen.dart';

/// Signed-in people are signed out after [idleLimit] without activity.
/// [warningTime] before that, a prompt lets them stay signed in.
const Duration idleLimit = Duration(minutes: 15);
const Duration warningTime = Duration(seconds: 60);

const String idleSignOutMessage =
    'You were signed out because you were inactive. Sign in again to continue.';

enum IdleState { active, warning, expired }

class IdleStatus {
  final IdleState state;
  final int secondsLeft;
  const IdleStatus(this.state, this.secondsLeft);
}

/// Works out where the session stands from the time of the last activity.
IdleStatus idleStatus(
  DateTime now,
  DateTime lastActivity, {
  Duration limit = idleLimit,
  Duration warning = warningTime,
}) {
  final remaining = lastActivity.add(limit).difference(now);
  if (remaining <= Duration.zero) return const IdleStatus(IdleState.expired, 0);
  final seconds = (remaining.inMilliseconds / 1000).ceil();
  if (remaining <= warning) return IdleStatus(IdleState.warning, seconds);
  return IdleStatus(IdleState.active, seconds);
}

/// Wrap the whole app (MaterialApp.builder) so every screen is covered.
/// It does nothing while nobody is signed in.
class IdleTimeoutGuard extends StatefulWidget {
  final GlobalKey<NavigatorState> navigatorKey;
  final Widget child;

  const IdleTimeoutGuard({
    super.key,
    required this.navigatorKey,
    required this.child,
  });

  @override
  State<IdleTimeoutGuard> createState() => _IdleTimeoutGuardState();
}

class _IdleTimeoutGuardState extends State<IdleTimeoutGuard>
    with WidgetsBindingObserver {
  DateTime _lastActivity = DateTime.now();
  Timer? _timer;
  bool _wasSignedIn = false;
  bool _warningOpen = false;
  final ValueNotifier<int> _secondsLeft = ValueNotifier<int>(0);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
  }

  @override
  void dispose() {
    _timer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    _secondsLeft.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Timers pause in the background, so check the clock when the app returns.
    if (state == AppLifecycleState.resumed) _tick();
  }

  bool get _signedIn => (PortalApi.sessionToken ?? '').isNotEmpty;

  void _onActivity() {
    // While the warning is showing, only its buttons count as activity.
    if (!_warningOpen) _lastActivity = DateTime.now();
  }

  void _tick() {
    if (!_signedIn) {
      _wasSignedIn = false;
      return;
    }
    if (!_wasSignedIn) {
      // Just signed in: start the clock now.
      _wasSignedIn = true;
      _lastActivity = DateTime.now();
      return;
    }

    final status = idleStatus(DateTime.now(), _lastActivity);
    switch (status.state) {
      case IdleState.active:
        break;
      case IdleState.warning:
        _secondsLeft.value = status.secondsLeft;
        if (!_warningOpen) _showWarning();
      case IdleState.expired:
        _signOut();
    }
  }

  void _showWarning() {
    final context = widget.navigatorKey.currentContext;
    if (context == null) return;
    _warningOpen = true;

    showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => PopScope(
        canPop: false,
        child: AlertDialog(
          backgroundColor: const Color(0xFF1A1A1A),
          title: const Text('Are you still there?',
              style: TextStyle(color: Colors.white)),
          content: ValueListenableBuilder<int>(
            valueListenable: _secondsLeft,
            builder: (_, seconds, _) => Text(
              'For your security you will be signed out in $seconds '
              '${seconds == 1 ? 'second' : 'seconds'} because there has been '
              'no activity.',
              style: TextStyle(color: Colors.grey.shade300),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: const Text('Sign out now'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(dialogContext).pop(true),
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFFFFEE0B),
                foregroundColor: const Color(0xFF0D0D0D),
              ),
              child: const Text('Stay signed in'),
            ),
          ],
        ),
      ),
    ).then((stay) {
      // Null means the dialog was closed by the automatic sign-out.
      if (stay == null) return;
      _warningOpen = false;
      if (stay) {
        _lastActivity = DateTime.now();
      } else {
        _signOut();
      }
    });
  }

  void _signOut() {
    final navigator = widget.navigatorKey.currentState;
    if (_warningOpen) {
      _warningOpen = false;
      // Close the prompt first; the pop returns null so it is not handled twice.
      navigator?.pop();
    }

    PortalApi.signOut();
    _wasSignedIn = false;
    navigator?.pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (route) => false,
    );

    final context = widget.navigatorKey.currentContext;
    if (context != null) {
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        const SnackBar(content: Text(idleSignOutMessage)),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Listener(
      behavior: HitTestBehavior.translucent,
      onPointerDown: (_) => _onActivity(),
      onPointerMove: (_) => _onActivity(),
      onPointerSignal: (_) => _onActivity(),
      child: widget.child,
    );
  }
}
