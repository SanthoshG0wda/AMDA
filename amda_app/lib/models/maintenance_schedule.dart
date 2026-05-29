class MaintenanceSchedule {
  final String id;
  final String orderId;
  final String machineId;
  final String failure;
  final dynamic scheduledStart;
  final dynamic scheduledEnd;
  final String assignedTo;
  final String scheduleStatus;

  MaintenanceSchedule({
    required this.id,
    required this.orderId,
    required this.machineId,
    required this.failure,
    this.scheduledStart,
    this.scheduledEnd,
    required this.assignedTo,
    required this.scheduleStatus,
  });

  factory MaintenanceSchedule.fromJson(Map<String, dynamic> json) {
    return MaintenanceSchedule(
      id: json['id'] ?? '',
      orderId: json['order_id'] ?? '',
      machineId: json['machine_id'] ?? '',
      failure: json['failure'] ?? '',
      scheduledStart: json['scheduled_start'],
      scheduledEnd: json['scheduled_end'],
      assignedTo: json['assigned_to'] ?? '',
      scheduleStatus: json['schedule_status'] ?? 'scheduled',
    );
  }

  DateTime? get startDateTime {
    if (scheduledStart == null) return null;
    if (scheduledStart is num) {
      return DateTime.fromMillisecondsSinceEpoch(
          (scheduledStart as num).toInt() * 1000);
    }
    return DateTime.tryParse(scheduledStart.toString());
  }

  DateTime? get endDateTime {
    if (scheduledEnd == null) return null;
    if (scheduledEnd is num) {
      return DateTime.fromMillisecondsSinceEpoch(
          (scheduledEnd as num).toInt() * 1000);
    }
    return DateTime.tryParse(scheduledEnd.toString());
  }
}
