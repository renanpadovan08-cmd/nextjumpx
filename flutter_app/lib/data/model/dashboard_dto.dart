class DashboardDto {
  const DashboardDto({required this.month, required this.appointments, required this.completed, required this.revenue, required this.byBarber});
  final String month;
  final int appointments;
  final int completed;
  final double revenue;
  final List<Map<String, dynamic>> byBarber;
  factory DashboardDto.fromJson(Map<String, dynamic> json) => DashboardDto(month: '${json['month']}', appointments: (json['appointments'] as num?)?.toInt() ?? 0, completed: (json['completed'] as num?)?.toInt() ?? 0, revenue: (json['revenue'] as num?)?.toDouble() ?? 0, byBarber: List<Map<String, dynamic>>.from(json['byBarber'] ?? const []));
}
