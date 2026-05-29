import 'dart:async';
import 'package:flutter/material.dart';
import '../models/maintenance_order.dart';
import '../models/user.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';
import '../services/socket_service.dart';
import '../widgets/order_card.dart';
import 'login_screen.dart';
import 'order_detail_screen.dart';
import 'profile_screen.dart';

class HomeScreen extends StatefulWidget {
  final AuthService authService;

  const HomeScreen({super.key, required this.authService});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late ApiService _api;
  late SocketService _socket;
  List<MaintenanceOrder> _orders = [];
  bool _loading = true;
  int _selectedIndex = 0;
  StreamSubscription<MaintenanceOrder>? _orderSub;
  StreamSubscription<String>? _removeSub;

  User? get _user => widget.authService.currentUser;
  String get _role => _user?.role ?? 'technician';

  @override
  void initState() {
    super.initState();
    _api = ApiService(widget.authService.token);
    _socket = SocketService();
    _initSocket();
    _loadOrders();
  }

  void _initSocket() {
    _socket.connect(role: _role);

    _orderSub = _socket.orderStream.listen((order) {
      if (!mounted) return;
      if (_role != 'admin' && _role != 'engineer' &&
          order.requiredRole != _role) {
        return;
      }
      setState(() {
        _orders.removeWhere((o) => o.id == order.id);
        _orders.insert(0, order);
        if (_orders.length > 200) _orders = _orders.take(200).toList();
      });
    });

    _removeSub = _socket.orderRemovedStream.listen((orderId) {
      if (!mounted) return;
      setState(() {
        _orders.removeWhere((o) => o.id == orderId);
      });
    });
  }

  Future<void> _loadOrders() async {
    setState(() => _loading = true);
    final orders = await _api.getOrders();
    if (!mounted) return;
    setState(() {
      _orders = orders;
      _loading = false;
    });
  }

  Future<void> _logout() async {
    _socket.disconnect();
    await widget.authService.logout();
    if (!mounted) return;
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(
        builder: (_) => LoginScreen(authService: widget.authService),
      ),
      (route) => false,
    );
  }

  @override
  void dispose() {
    _orderSub?.cancel();
    _removeSub?.cancel();
    _socket.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final pages = [
      _buildOrdersPage(theme),
      ProfileScreen(
        user: _user,
        onLogout: _logout,
      ),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Icon(Icons.precision_manufacturing,
                color: theme.colorScheme.primary, size: 24),
            const SizedBox(width: 8),
            const Text('AMDA'),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: theme.colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(_role[0].toUpperCase() + _role.substring(1),
                  style: TextStyle(
                      fontSize: 11,
                      color: theme.colorScheme.onPrimaryContainer,
                      fontWeight: FontWeight.w600)),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadOrders,
          ),
        ],
      ),
      body: IndexedStack(
        index: _selectedIndex,
        children: pages,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (i) => setState(() => _selectedIndex = i),
        destinations: [
          NavigationDestination(
            icon: Badge(
              isLabelVisible: _orders.any((o) => o.isOpen),
              label: Text('${_orders.where((o) => o.isOpen).length}'),
              child: const Icon(Icons.assignment),
            ),
            selectedIcon: const Icon(Icons.assignment),
            label: 'Orders',
          ),
          const NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }

  Widget _buildOrdersPage(ThemeData theme) {
    final openOrders = _orders.where((o) => o.isOpen).toList();
    final closedOrders = _orders.where((o) => !o.isOpen).toList();

    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_orders.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.inbox_outlined,
                size: 64, color: theme.colorScheme.onSurface.withValues(alpha: 0.3)),
            const SizedBox(height: 16),
            Text('No orders for your role',
                style: theme.textTheme.titleMedium
                    ?.copyWith(color: Colors.grey)),
            const SizedBox(height: 8),
            Text.rich(
              TextSpan(
                text: 'Your role: ',
                style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey),
                children: [
                  TextSpan(
                    text: _role[0].toUpperCase() + _role.substring(1),
                    style: TextStyle(
                      color: theme.colorScheme.primary,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const TextSpan(text: ' — real-time failures matching your role will appear here'),
                ],
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            OutlinedButton.icon(
              onPressed: _loadOrders,
              icon: const Icon(Icons.refresh, size: 18),
              label: const Text('Refresh'),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadOrders,
      child: ListView(
        padding: const EdgeInsets.only(top: 8, bottom: 80),
        children: [
          if (openOrders.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 8, 18, 4),
              child: Text('OPEN (${openOrders.length})',
                  style: theme.textTheme.labelSmall
                      ?.copyWith(color: Colors.orange, letterSpacing: 1)),
            ),
            ...openOrders.map((o) => OrderCard(
                  order: o,
                  onTap: () => _openDetail(o),
                )),
          ],
          if (closedOrders.isNotEmpty) ...[
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 8, 18, 4),
              child: Text('CLOSED (${closedOrders.length})',
                  style: theme.textTheme.labelSmall
                      ?.copyWith(color: Colors.green, letterSpacing: 1)),
            ),
            ...closedOrders.map((o) => OrderCard(
                  order: o,
                  onTap: () => _openDetail(o),
                )),
          ],
        ],
      ),
    );
  }

  void _openDetail(MaintenanceOrder order) async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => OrderDetailScreen(
          order: order,
          apiService: _api,
          onOrderClosed: _loadOrders,
        ),
      ),
    );
  }
}
