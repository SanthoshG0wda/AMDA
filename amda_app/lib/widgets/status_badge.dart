import 'package:flutter/material.dart';

class StatusBadge extends StatelessWidget {
  final String status;
  final double fontSize;

  const StatusBadge({super.key, required this.status, this.fontSize = 11});

  @override
  Widget build(BuildContext context) {
    final (color, icon) = _statusStyle(status.toLowerCase());
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: fontSize + 1, color: color),
          const SizedBox(width: 4),
          Text(
            status.toUpperCase(),
            style: TextStyle(
              color: color,
              fontSize: fontSize,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }

  (Color, IconData) _statusStyle(String status) {
    switch (status) {
      case 'open':
        return (Colors.orange, Icons.circle_outlined);
      case 'closed':
        return (Colors.green, Icons.check_circle);
      case 'critical':
        return (Colors.red, Icons.warning);
      case 'high':
        return (Colors.deepOrange, Icons.arrow_upward);
      case 'medium':
        return (Colors.yellow, Icons.remove);
      case 'low':
        return (Colors.grey, Icons.arrow_downward);
      default:
        return (Colors.grey, Icons.circle);
    }
  }
}
