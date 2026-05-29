class Alert {
  final String id;
  final String machineId;
  final String reason;
  final String triggeredAt;

  Alert({
    required this.id,
    required this.machineId,
    required this.reason,
    required this.triggeredAt,
  });

  factory Alert.fromJson(Map<String, dynamic> json) {
    return Alert(
      id: json['id'] ?? '',
      machineId: json['machine_id'] ?? '',
      reason: json['reason'] ?? '',
      triggeredAt: json['triggered_at'] ?? '',
    );
  }

  DateTime? get triggeredAtDateTime => DateTime.tryParse(triggeredAt);
}
