import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as socket_io;
import '../config.dart';
import '../models/alert.dart';
import '../models/maintenance_order.dart';

class SocketService {
  socket_io.Socket? _socket;
  final StreamController<MaintenanceOrder> _orderController =
      StreamController<MaintenanceOrder>.broadcast();
  final StreamController<String> _orderRemovedController =
      StreamController<String>.broadcast();
  final StreamController<Alert> _alertController =
      StreamController<Alert>.broadcast();

  Stream<MaintenanceOrder> get orderStream => _orderController.stream;
  Stream<String> get orderRemovedStream => _orderRemovedController.stream;
  Stream<Alert> get alertStream => _alertController.stream;

  bool get isConnected => _socket?.connected ?? false;

  Future<void> connect({String? role}) async {
    if (_socket != null && _socket!.connected) return;

    final url = await AppConfig.socketUrl;
    _socket = socket_io.io(
      url,
      {
        'transports': ['websocket'],
        'autoConnect': true,
        'reconnection': true,
        'reconnectionAttempts': 10,
        'reconnectionDelay': 1000,
      },
    );

    _socket!.onConnect((_) {
      debugPrint('Socket connected');
      if (role != null) {
        _socket!.emit('subscribe', {'role': role});
      }
    });

    _socket!.onDisconnect((_) => debugPrint('Socket disconnected'));

    _socket!.on('maintenance_order', (data) {
      if (data is Map<String, dynamic>) {
        _orderController.add(MaintenanceOrder.fromJson(data));
      }
    });

    _socket!.on('maintenance_order_removed', (data) {
      if (data is Map<String, dynamic> && data['id'] != null) {
        _orderRemovedController.add(data['id'].toString());
      }
    });

    _socket!.on('alert', (data) {
      if (data is Map<String, dynamic>) {
        _alertController.add(Alert.fromJson(data));
      }
    });

    _socket!.connect();
  }

  void disconnect() {
    _socket?.disconnect();
    _socket = null;
  }

  void dispose() {
    disconnect();
    _orderController.close();
    _orderRemovedController.close();
    _alertController.close();
  }
}
