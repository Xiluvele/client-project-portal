import 'package:flutter/material.dart';
import 'idle_timeout.dart';
import 'screens/splash_screen.dart';

void main() {
  runApp(const LethaboPortalApp());
}

final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

class LethaboPortalApp extends StatelessWidget {
  const LethaboPortalApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: navigatorKey,
      debugShowCheckedModeBanner: false,
      builder: (context, child) => IdleTimeoutGuard(
        navigatorKey: navigatorKey,
        child: child ?? const SizedBox.shrink(),
      ),
      title: 'Lethabo M Solutions',
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFFFFEE0B)),
      ),
      home: const SplashScreen(),
    );
  }
}
