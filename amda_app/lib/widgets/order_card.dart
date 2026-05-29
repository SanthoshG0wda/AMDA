import 'package:flutter/material.dart';
import '../models/maintenance_order.dart';
import 'role_badge.dart';
import 'status_badge.dart';

class OrderCard extends StatelessWidget {
  final MaintenanceOrder order;
  final VoidCallback onTap;

  const OrderCard({super.key, required this.order, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.precision_manufacturing,
                      size: 18, color: colorScheme.primary),
                  const SizedBox(width: 6),
                  Text(
                    order.machineId,
                    style: const TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                  const Spacer(),
                  StatusBadge(status: order.priority, fontSize: 10),
                  const SizedBox(width: 6),
                  StatusBadge(status: order.status, fontSize: 10),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                order.failure.replaceAll('_', ' '),
                style: TextStyle(
                  fontSize: 13,
                  color: colorScheme.onSurface.withValues(alpha: 0.8),
                ),
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  RoleBadge(role: order.requiredRole, fontSize: 10),
                  const Spacer(),
                  if (order.createdAtDateTime != null)
                    Text(
                      _formatTime(order.createdAtDateTime!),
                      style: TextStyle(
                        fontSize: 11,
                        color: colorScheme.onSurface.withValues(alpha: 0.5),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatTime(DateTime dt) {
    final now = DateTime.now();
    final diff = now.difference(dt);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }
}
