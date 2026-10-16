import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import '../api/portal_api.dart';
import 'forgot_password_screen.dart';
import 'sign_in_code_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _hidePassword = true;
  bool _isLoading = false;

  static const Color yellow = Color(0xFFFFEE0B);
  static const Color black = Color(0xFF0D0D0D);

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  // ============================================================
  // LOGIN FUNCTION
  // ============================================================

  Future<void> _login() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    // ----------------------------------------------------------
    // Validate fields
    // ----------------------------------------------------------

    if (email.isEmpty || password.isEmpty) {
      _showMessage('Please enter your email address and password.');
      return;
    }

    // Start loading.
    setState(() {
      _isLoading = true;
    });

    try {
      // --------------------------------------------------------
      // Send login details to ASP.NET Core API
      // --------------------------------------------------------

      final response = await http.post(
        Uri.parse('${PortalApi.baseUrl}/api/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'password': password}),
      );

      // --------------------------------------------------------
      // Read API response
      // --------------------------------------------------------

      Map<String, dynamic> data = {};

      if (response.body.isNotEmpty) {
        data = jsonDecode(response.body) as Map<String, dynamic>;
      }

      if (!mounted) return;

      // --------------------------------------------------------
      // LOGIN SUCCESSFUL
      // --------------------------------------------------------

      if (response.statusCode == 200) {
        final user = PortalUser.fromLogin(data);
        if (user.id.isEmpty) {
          _showMessage('Unable to read user information.');
          return;
        }

        final code = PortalApi.sixDigitCode();
        final mailed = await PortalApi.post('/api/auth/email-code', {
          'email': user.email,
          'name': user.name,
          'code': code,
          'purpose': 'login',
        });
        if (!mounted) return;

        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => SignInCodeScreen(
              user: user,
              initialCode: code,
              emailed: mailed.ok && mailed.map['sent'] == true,
            ),
          ),
        );
        return;
      }

      // --------------------------------------------------------
      // LOGIN FAILED
      // --------------------------------------------------------

      final String message =
          data['message']?.toString() ?? 'Unable to sign in.';

      _showMessage(message);
    } catch (e) {
      // --------------------------------------------------------
      // CONNECTION / SERVER ERROR
      // --------------------------------------------------------

      if (!mounted) return;

      debugPrint('Login error: $e');

      _showMessage('Unable to connect to the server. Please try again.');
    } finally {
      // Stop loading.
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  // ============================================================
  // DISPLAY MESSAGE
  // ============================================================

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: const Color(0xFF1A1A1A),
      ),
    );
  }

  // ============================================================
  // USER INTERFACE
  // ============================================================

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: black,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 30),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 40),

              // ==================================================
              // LOGO
              // ==================================================
              Center(
                child: Container(
                  width: 85,
                  height: 85,
                  decoration: BoxDecoration(
                    color: yellow,
                    borderRadius: BorderRadius.circular(22),
                  ),
                  child: const Center(
                    child: Text(
                      'L',
                      style: TextStyle(
                        color: black,
                        fontSize: 45,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 40),

              // WELCOME TEXT
              const Text(
                'Welcome back',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 30,
                  fontWeight: FontWeight.bold,
                ),
              ),

              const SizedBox(height: 8),
              Text(
                'Sign in to continue to your project portal.',
                style: TextStyle(color: Colors.grey.shade400, fontSize: 15),
              ),

              const SizedBox(height: 40),

              // EMAIL ADDRESS
              const Text(
                'Email address',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),

              const SizedBox(height: 10),

              TextField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                autocorrect: false,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  hintText: 'Enter your email',
                  hintStyle: TextStyle(color: Colors.grey.shade600),
                  prefixIcon: const Icon(Icons.email_outlined, color: yellow),
                  filled: true,
                  fillColor: const Color(0xFF1A1A1A),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide.none,
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: yellow, width: 1.5),
                  ),
                ),
              ),

              const SizedBox(height: 22),

              // ==================================================
              // PASSWORD
              // ==================================================
              const Text(
                'Password',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),

              const SizedBox(height: 10),

              TextField(
                controller: _passwordController,
                obscureText: _hidePassword,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  hintText: 'Enter your password',
                  hintStyle: TextStyle(color: Colors.grey.shade600),
                  prefixIcon: const Icon(Icons.lock_outline, color: yellow),

                  // ----------------------------------------------
                  // SHOW / HIDE PASSWORD
                  // ----------------------------------------------
                  suffixIcon: IconButton(
                    onPressed: () {
                      setState(() {
                        _hidePassword = !_hidePassword;
                      });
                    },
                    icon: Icon(
                      _hidePassword
                          ? Icons.visibility_off_outlined
                          : Icons.visibility_outlined,
                      color: Colors.grey,
                    ),
                  ),

                  filled: true,
                  fillColor: const Color(0xFF1A1A1A),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide.none,
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: yellow, width: 1.5),
                  ),
                ),

                // Pressing Done on the keyboard also attempts login.
                onSubmitted: (_) {
                  if (!_isLoading) {
                    _login();
                  }
                },
              ),

              const SizedBox(height: 12),

              // ==================================================
              // FORGOT PASSWORD
              // ==================================================
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const ForgotPasswordScreen(),
                      ),
                    );
                  },
                  child: const Text(
                    'Forgot password?',
                    style: TextStyle(
                      color: yellow,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 18),

              // ==================================================
              // SIGN IN BUTTON
              // ==================================================
              SizedBox(
                width: double.infinity,
                height: 55,
                child: ElevatedButton(
                  // Call the real login function.
                  //
                  // The button is disabled while a login request
                  // is already running.
                  onPressed: _isLoading ? null : _login,

                  style: ElevatedButton.styleFrom(
                    backgroundColor: yellow,
                    foregroundColor: black,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),

                  // Show loading circle while signing in.
                  child: _isLoading
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.5,
                            color: black,
                          ),
                        )
                      : const Text(
                          'Sign In',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                ),
              ),

              const SizedBox(height: 12),

              // ==================================================
              // FOOTER
              // ==================================================
              Center(
                child: Text(
                  'Lethabo M Solutions',
                  style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
