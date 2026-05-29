import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:shared_preferences/shared_preferences.dart';

class AppConfig {
  static const String _defaultHost = '100.118.24.101';
  static const int _defaultPort = 5000;
  static String? _overrideUrl;

  static Future<String> get serverUrl async {
    if (_overrideUrl != null) return _overrideUrl!;
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString('server_url');
    if (saved != null && saved.isNotEmpty) return saved;
    if (kIsWeb) return 'http://$_defaultHost:$_defaultPort';
    if (Platform.isAndroid) return 'http://$_defaultHost:$_defaultPort';
    return 'http://$_defaultHost:$_defaultPort';
  }

  static Future<String> get socketUrl async => await serverUrl;

  static Future<void> setServerUrl(String url) async {
    _overrideUrl = url;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('server_url', url);
  }
}
