const allowedAppointmentUpdateFields = new Set([
  'barber_id',
  'service_id',
  'client_name',
  'client_phone',
  'date',
  'time',
  'status',
  'reminder_days',
  'reminder_date',
  'cancel_note',
  'received_amount',
  'payment_note',
  'barberId',
  'serviceId',
  'clientName',
  'clientPhone',
  'reminderDays',
  'reminderDate',
  'receivedAmount',
  'paymentNote',
]);

const normalizeAppointmentKey = (key) => {
  switch (key) {
    case 'barberId':
      return 'barber_id';
    case 'serviceId':
      return 'service_id';
    case 'clientName':
      return 'client_name';
    case 'clientPhone':
      return 'client_phone';
    case 'reminderDays':
      return 'reminder_days';
    case 'reminderDate':
      return 'reminder_date';
    case 'receivedAmount':
      return 'received_amount';
    case 'paymentNote':
      return 'payment_note';
    default:
      return key;
  }
};

export function normalizeAppointmentPatch(body = {}) {
  return Object.fromEntries(
    Object.entries(body)
      .filter(([key]) => allowedAppointmentUpdateFields.has(key))
      .map(([key, value]) => [normalizeAppointmentKey(key), value]),
  );
}
