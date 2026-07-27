class DashboardDto {
  const DashboardDto(
      {required this.month,
      required this.appointments,
      required this.completed,
      required this.revenue,
      required this.byBarber,
      required this.totalCommission,
      required this.profit,
      required this.todayAppointments,
      required this.todayCompleted,
      required this.todayRevenue,
      required this.pending,
      required this.walletCount,
      required this.walletAmount,
      required this.risk,
      required this.recovered,
      required this.zenIndex,
      this.nextAppointment});
  final String month;
  final int appointments;
  final int completed;
  final double revenue;
  final List<Map<String, dynamic>> byBarber;
  final double totalCommission;
  final double profit;
  final int todayAppointments;
  final int todayCompleted;
  final double todayRevenue;
  final int pending;
  final int walletCount;
  final double walletAmount;
  final int risk;
  final int recovered;
  final int zenIndex;
  final Map<String, dynamic>? nextAppointment;
  factory DashboardDto.fromJson(Map<String, dynamic> json) => DashboardDto(
      month: '${json['month']}',
      appointments: (json['appointments'] as num?)?.toInt() ?? 0,
      completed: (json['completed'] as num?)?.toInt() ?? 0,
      revenue: (json['revenue'] as num?)?.toDouble() ?? 0,
      byBarber: List<Map<String, dynamic>>.from(json['byBarber'] ?? const []),
      totalCommission: (json['totalCommission'] as num?)?.toDouble() ?? 0,
      profit: (json['profit'] as num?)?.toDouble() ?? 0,
      todayAppointments: (json['today']?['appointments'] as num?)?.toInt() ?? 0,
      todayCompleted: (json['today']?['completed'] as num?)?.toInt() ?? 0,
      todayRevenue: (json['today']?['revenue'] as num?)?.toDouble() ?? 0,
      pending: (json['pending'] as num?)?.toInt() ?? 0,
      walletCount: (json['walletCount'] as num?)?.toInt() ?? 0,
      walletAmount: (json['walletAmount'] as num?)?.toDouble() ?? 0,
      risk: (json['retention']?['risk'] as num?)?.toInt() ?? 0,
      recovered: (json['retention']?['recovered'] as num?)?.toInt() ?? 0,
      zenIndex: (json['retention']?['zenIndex'] as num?)?.toInt() ?? 10,
      nextAppointment: json['today']?['nextAppointment'] == null
          ? null
          : Map<String, dynamic>.from(json['today']['nextAppointment'] as Map));
}
