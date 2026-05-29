import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../config.dart';
import '../models/maintenance_order.dart';

class ApiService {
  final String? token;

  ApiService(this.token);

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };

  Future<List<MaintenanceOrder>> getOrders() async {
    try {
      final base = await AppConfig.serverUrl;
      final res = await http.get(
        Uri.parse('$base/mobile/orders'),
        headers: _headers,
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['orders'] is List) {
          return (data['orders'] as List)
              .map((o) => MaintenanceOrder.fromJson(o))
              .toList();
        }
      }
    } catch (e) {
      debugPrint('ApiService.getOrders error: $e');
    }
    return [];
  }

  Future<Map<String, dynamic>> getOrderDetail(String orderId) async {
    try {
      final base = await AppConfig.serverUrl;
      final res = await http.get(
        Uri.parse('$base/mobile/orders/$orderId'),
        headers: _headers,
      );
      if (res.statusCode == 200) {
        return jsonDecode(res.body);
      }
      return {'ok': false, 'error': 'Failed to fetch order'};
    } catch (e) {
      return {'ok': false, 'error': 'Network error: $e'};
    }
  }

  Future<Map<String, dynamic>> closeOrder(String orderId) async {
    try {
      final base = await AppConfig.serverUrl;
      final res = await http.post(
        Uri.parse('$base/mobile/orders/$orderId/close'),
        headers: _headers,
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {'ok': false, 'error': 'Network error: $e'};
    }
  }

  Future<Map<String, dynamic>> getProfile() async {
    try {
      final base = await AppConfig.serverUrl;
      final res = await http.get(
        Uri.parse('$base/mobile/profile'),
        headers: _headers,
      );
      if (res.statusCode == 200) {
        return jsonDecode(res.body);
      }
      return {'ok': false, 'error': 'Failed to fetch profile'};
    } catch (e) {
      return {'ok': false, 'error': 'Network error: $e'};
    }
  }

  Future<Map<String, dynamic>> getMachines() async {
    try {
      final base = await AppConfig.serverUrl;
      final res = await http.get(
        Uri.parse('$base/mobile/machines'),
        headers: _headers,
      );
      if (res.statusCode == 200) {
        return jsonDecode(res.body);
      }
      return {'ok': false, 'error': 'Failed to fetch machines'};
    } catch (e) {
      return {'ok': false, 'error': 'Network error: $e'};
    }
  }
}
