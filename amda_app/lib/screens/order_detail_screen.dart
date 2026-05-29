import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/maintenance_order.dart';
import '../models/maintenance_schedule.dart';
import '../services/api_service.dart';
import '../widgets/role_badge.dart';
import '../widgets/status_badge.dart';

class OrderDetailScreen extends StatefulWidget {
  final MaintenanceOrder order;
  final ApiService apiService;
  final VoidCallback? onOrderClosed;

  const OrderDetailScreen({
    super.key,
    required this.order,
    required this.apiService,
    this.onOrderClosed,
  });

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  MaintenanceSchedule? _schedule;
  bool _loadingSchedule = true;
  bool _closing = false;

  @override
  void initState() {
    super.initState();
    _loadDetail();
  }

  Future<void> _loadDetail() async {
    final result =
        await widget.apiService.getOrderDetail(widget.order.id);
    if (!mounted) return;
    setState(() => _loadingSchedule = false);
    if (result['schedule'] is Map<String, dynamic>) {
      _schedule = MaintenanceSchedule.fromJson(result['schedule']);
    }
  }

  Future<void> _closeOrder() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Close Order'),
        content: Text('Mark "${widget.order.id}" as completed?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Close'),
          ),
        ],
      ),
    );

    if (confirm != true) return;
    setState(() => _closing = true);

    final result = await widget.apiService.closeOrder(widget.order.id);

    if (!mounted) return;
    setState(() => _closing = false);

    if (result['ok'] == true) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Order closed successfully'),
          backgroundColor: Colors.green,
        ),
      );
      widget.onOrderClosed?.call();
      Navigator.pop(context);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result['error'] ?? 'Failed to close order'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final o = widget.order;
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(o.id),
        actions: [
          if (o.isOpen)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: _closing
                  ? const SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : FilledButton.tonalIcon(
                      onPressed: _closeOrder,
                      icon: const Icon(Icons.check, size: 18),
                      label: const Text('Close'),
                      style: FilledButton.styleFrom(
                        backgroundColor: Colors.red.withValues(alpha: 0.2),
                        foregroundColor: Colors.red,
                      ),
                    ),
            ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _section('Machine', o.machineId, Icons.precision_manufacturing),
          const SizedBox(height: 12),
          _section(
              'Failure Mode',
              o.failure.replaceAll('_', ' '),
              Icons.error_outline),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _section('Priority', o.priority.toUpperCase(),
                    Icons.flag),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _section('Score', '${o.priorityScore}', Icons.score),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _section('Status', o.status.toUpperCase(),
                    Icons.circle),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Required Role',
                        style: theme.textTheme.labelSmall
                            ?.copyWith(color: Colors.grey)),
                    const SizedBox(height: 4),
                    RoleBadge(role: o.requiredRole),
                  ],
                ),
              ),
            ],
          ),
          if (o.createdAtDateTime != null) ...[
            const SizedBox(height: 12),
            _section(
              'Created',
              DateFormat('MMM dd, yyyy HH:mm')
                  .format(o.createdAtDateTime!),
              Icons.access_time,
            ),
          ],
          if (o.closedAtDateTime != null) ...[
            const SizedBox(height: 12),
            _section(
              'Closed',
              DateFormat('MMM dd, yyyy HH:mm')
                  .format(o.closedAtDateTime!),
              Icons.check_circle_outline,
            ),
          ],
          if (o.closedBy != null) ...[
            const SizedBox(height: 12),
            _section('Closed By', o.closedBy!, Icons.person),
          ],
          if (o.notes.isNotEmpty && o.notes != '—') ...[
            const SizedBox(height: 12),
            _section('AI Diagnosis', o.notes, Icons.psychology),
          ],
          if (_loadingSchedule)
            const Padding(
              padding: EdgeInsets.all(16),
              child: Center(child: CircularProgressIndicator()),
            ),
          if (_schedule != null) ...[
            const SizedBox(height: 16),
            const Divider(),
            const SizedBox(height: 8),
            Text('Maintenance Schedule',
                style: theme.textTheme.titleMedium
                    ?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            _section('Schedule ID', _schedule!.id, Icons.calendar_month),
            const SizedBox(height: 8),
            if (_schedule!.startDateTime != null)
              _section(
                'Start',
                DateFormat('MMM dd, yyyy HH:mm')
                    .format(_schedule!.startDateTime!),
                Icons.play_arrow,
              ),
            if (_schedule!.endDateTime != null) ...[
              const SizedBox(height: 8),
              _section(
                'Deadline',
                DateFormat('MMM dd, yyyy HH:mm')
                    .format(_schedule!.endDateTime!),
                Icons.alarm,
              ),
            ],
            const SizedBox(height: 8),
            _section('Assigned To', _schedule!.assignedTo, Icons.person),
            const SizedBox(height: 8),
            Row(
              children: [
                const StatusBadge(status: 'scheduled'),
                const SizedBox(width: 8),
                Text(_schedule!.scheduleStatus,
                    style: theme.textTheme.bodySmall),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _section(String label, String value, IconData icon) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: Colors.grey),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label,
                  style: Theme.of(context)
                      .textTheme
                      .labelSmall
                      ?.copyWith(color: Colors.grey)),
              const SizedBox(height: 2),
              Text(value,
                  style: const TextStyle(
                      fontSize: 14, fontWeight: FontWeight.w500)),
            ],
          ),
        ),
      ],
    );
  }
}
