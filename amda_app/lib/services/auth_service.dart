import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config.dart';
import '../models/user.dart';

class AuthService {
  static const String _tokenKey = 'auth_token';
  static const String _userKey = 'auth_user';

  String? _token;
  User? _currentUser;

  String? get token => _token;
  User? get currentUser => _currentUser;

  Future<void> _loadSession() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString(_tokenKey);
    final userJson = prefs.getString(_userKey);
    if (userJson != null && _token != null) {
      _currentUser = User.fromJson(jsonDecode(userJson));
    }
  }

  Future<void> _saveSession(String token, User user) async {
    _token = token;
    _currentUser = user;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
    await prefs.setString(_userKey, jsonEncode(user.toJson()));
  }

  Future<bool> isLoggedIn() async {
    await _loadSession();
    return _token != null && _currentUser != null;
  }

  Future<Map<String, dynamic>> login(
      String username, String password) async {
    try {
      final url = Uri.parse('${AppConfig.serverUrl}/auth/login');
      debugPrint('AuthService: POST $url');
      final res = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'username': username, 'password': password}),
      );
      final data = jsonDecode(res.body);
      if (res.statusCode == 200 && data['ok'] == true) {
        await _saveSession(
          data['token'],
          User.fromJson(data['user']),
        );
      }
      return data;
    } catch (e) {
      debugPrint('AuthService.login error: $e');
      return {'ok': false, 'error': 'Cannot reach server at ${AppConfig.serverUrl}'};
    }
  }

  Future<Map<String, dynamic>> signup({
    required String username,
    required String password,
    required String fullName,
    required String role,
  }) async {
    try {
      final url = Uri.parse('${AppConfig.serverUrl}/auth/signup');
      debugPrint('AuthService: POST $url');
      final res = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'username': username,
          'password': password,
          'full_name': fullName,
          'role': role,
        }),
      );
      final body = res.body;
      debugPrint('AuthService: status=${res.statusCode} body=$body');
      final data = jsonDecode(body);
      if (res.statusCode == 201 && data['ok'] == true) {
        await _saveSession(
          data['token'],
          User.fromJson(data['user']),
        );
      }
      return data;
    } catch (e) {
      debugPrint('AuthService.signup error: $e');
      return {'ok': false, 'error': 'Cannot reach server at ${AppConfig.serverUrl}'};
    }
  }

  Future<void> logout() async {
    _token = null;
    _currentUser = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_userKey);
  }
}
