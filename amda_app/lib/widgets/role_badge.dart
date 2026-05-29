import 'package:flutter/material.dart';

class RoleBadge extends StatelessWidget {
  final String role;
  final double fontSize;

  const RoleBadge({super.key, required this.role, this.fontSize = 11});

  @override
  Widget build(BuildContext context) {
    final (color, icon) = _roleStyle(role.toLowerCase());
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
            role[0].toUpperCase() + role.substring(1),
            style: TextStyle(
              color: color,
              fontSize: fontSize,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  (Color, IconData) _roleStyle(String role) {
    switch (role) {
      case 'electrician':
        return (Colors.amber, Icons.bolt);
      case 'mechanic':
        return (Colors.blue, Icons.build);
      case 'technician':
        return (Colors.teal, Icons.handyman);
      case 'engineer':
        return (Colors.purple, Icons.engineering);
      case 'admin':
        return (Colors.red, Icons.shield);
      default:
        return (Colors.grey, Icons.person);
    }
  }
}
