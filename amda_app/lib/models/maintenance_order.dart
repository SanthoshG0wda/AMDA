class MaintenanceOrder {
  final String id;
  final String machineId;
  final String failure;
  final String priority;
  final int priorityScore;
  final String requiredRole;
  final String status;
  final String notes;
  final dynamic createdAt;
  final dynamic closedAt;
  final String? closedBy;

  MaintenanceOrder({
    required this.id,
    required this.machineId,
    required this.failure,
    required this.priority,
    required this.priorityScore,
    required this.requiredRole,
    required this.status,
    required this.notes,
    this.createdAt,
    this.closedAt,
    this.closedBy,
  });

  factory MaintenanceOrder.fromJson(Map<String, dynamic> json) {
    return MaintenanceOrder(
      id: json['id'] ?? '',
      machineId: json['machine_id'] ?? '',
      failure: json['failure'] ?? '',
      priority: json['priority'] ?? 'medium',
      priorityScore: json['priority_score'] ?? 0,
      requiredRole: json['required_role'] ?? 'technician',
      status: json['status'] ?? 'open',
      notes: json['notes'] ?? '',
      createdAt: json['created_at'],
      closedAt: json['closed_at'],
      closedBy: json['closed_by'],
    );
  }

  DateTime? get createdAtDateTime {
    if (createdAt == null) return null;
    if (createdAt is num) {
      return DateTime.fromMillisecondsSinceEpoch(
          (createdAt as num).toInt() * 1000);
    }
    return DateTime.tryParse(createdAt.toString());
  }

  DateTime? get closedAtDateTime {
    if (closedAt == null) return null;
    if (closedAt is num) {
      return DateTime.fromMillisecondsSinceEpoch(
          (closedAt as num).toInt() * 1000);
    }
    return DateTime.tryParse(closedAt.toString());
  }

  bool get isOpen => status.toLowerCase() == 'open';
}
