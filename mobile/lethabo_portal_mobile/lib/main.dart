import 'package:flutter/material.dart';
import 'screens/splash_screen.dart';

void main() {
  runApp(const LethaboPortalApp());
}

class LethaboPortalApp extends StatelessWidget {
  const LethaboPortalApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Lethabo M Solutions',
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFFFFEE0B)),
      ),
      home: const SplashScreen(),
    );
  }
}
