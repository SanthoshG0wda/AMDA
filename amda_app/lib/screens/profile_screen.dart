import 'package:flutter/material.dart';
import '../models/user.dart';
import '../widgets/role_badge.dart';

class ProfileScreen extends StatelessWidget {
  final User? user;
  final VoidCallback onLogout;

  const ProfileScreen({super.key, this.user, required this.onLogout});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (user == null) {
      return const Center(child: Text('Not logged in'));
    }

    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        const SizedBox(height: 20),
        CircleAvatar(
          radius: 48,
          backgroundColor: theme.colorScheme.primaryContainer,
          child: Text(
            user!.fullName.isNotEmpty
                ? user!.fullName[0].toUpperCase()
                : user!.username[0].toUpperCase(),
            style: TextStyle(
                fontSize: 36,
                fontWeight: FontWeight.bold,
                color: theme.colorScheme.onPrimaryContainer),
          ),
        ),
        const SizedBox(height: 16),
        Text(
          user!.fullName.isNotEmpty ? user!.fullName : user!.username,
          textAlign: TextAlign.center,
          style:
              theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        Center(child: RoleBadge(role: user!.role, fontSize: 13)),
        const SizedBox(height: 32),
        _infoTile(theme, Icons.person, 'Username', user!.username),
        const SizedBox(height: 12),
        _infoTile(theme, Icons.badge, 'Full Name',
            user!.fullName.isNotEmpty ? user!.fullName : '—'),
        const SizedBox(height: 12),
        _infoTile(theme, Icons.work, 'Role', user!.role),
        const SizedBox(height: 12),
        _infoTile(theme, Icons.fingerprint, 'User ID', user!.id),
        const SizedBox(height: 40),
        SizedBox(
          width: double.infinity,
          height: 48,
          child: OutlinedButton.icon(
            onPressed: onLogout,
            icon: const Icon(Icons.logout, color: Colors.red),
            label: const Text('Sign Out',
                style: TextStyle(color: Colors.red, fontSize: 16)),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: Colors.red),
            ),
          ),
        ),
      ],
    );
  }

  Widget _infoTile(ThemeData theme, IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 20, color: Colors.grey),
        const SizedBox(width: 12),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label,
                style: theme.textTheme.labelSmall
                    ?.copyWith(color: Colors.grey)),
            Text(value,
                style: const TextStyle(
                    fontSize: 15, fontWeight: FontWeight.w500)),
          ],
        ),
      ],
    );
  }
}
