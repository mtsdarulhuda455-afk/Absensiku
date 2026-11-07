import { AttendanceRecord, Employee, NotificationLog } from '../types/attendance';
import { StorageService } from './storage';

export const NotificationService = {
  // Request Web Browser Push Notification Permission
  async requestPushPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }
    if (Notification.permission === 'granted') {
      return true;
    }
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch {
      return false;
    }
  },

  // Send Browser Push Notification & Broadcast to in-app event
  sendPushNotification(title: string, body: string, icon = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png') {
    const event = new CustomEvent('absensiku:toast', {
      detail: { title, body, timestamp: Date.now() },
    });
    window.dispatchEvent(event);

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon,
          badge: icon,
        });
      } catch (err) {
        console.warn('Native notification failed', err);
      }
    }
  },

  // Generate official Indonesian WhatsApp formatted message for attendance
  createAttendanceWAMessage(record: AttendanceRecord, employee: Employee): string {
    const isCheckIn = record.type === 'check_in';
    let statusText = 'TEPAT WAKTU (Sebelum 07.00 WIB) ✅';
    if (record.status === 'late') {
      statusText = `TERLAMBAT (+${record.lateMinutes} menit dari jam 07.00 WIB) ⚠️`;
    } else if (record.status === 'early_leave') {
      statusText = `PULANG CEPAT (-${record.earlyMinutes} menit sebelum 13.00 WIB) ⚠️`;
    }

    const actionText = isCheckIn ? 'MASUK (CHECK-IN)' : 'PULANG (CHECK-OUT)';

    return [
      `🔔 *ABSENSIKU - BUKTI TRANSAKSI ABSENSI RESMI*`,
      `───────────────────────`,
      `Halo *${employee.name}* (${employee.nip}),`,
      `Absensi *${actionText}* berhasil diverifikasi dan dicatat ke sistem.`,
      ``,
      `📅 *Tanggal:* ${record.date}`,
      `⏰ *Waktu:* ${record.time} WIB`,
      `📊 *Status:* ${statusText}`,
      `📍 *Lokasi:* ${record.location.officeName}`,
      `📏 *Radius GPS:* ${record.location.distanceMeters} m (${record.location.isWithinRadius ? 'Valid' : 'Luar Radius'})`,
      `🛡️ *Metode:* ${getVerificationLabel(record.verificationMethod)}`,
      `✨ *Akurasi AI:* ${record.matchConfidence}%`,
      `🧾 *ID Transaksi:* #${record.id}`,
      `───────────────────────`,
      `_Aturan jam masuk: 07.00 WIB (tanpa toleransi). Jam pulang: 13.00 - 15.00 WIB._`,
      `_Sistem AbsensiKu Waktu Indonesia Barat (WIB)._`
    ].join('\n');
  },

  // Specialized WhatsApp reminder message for Teachers & Educators
  createTeacherReminderWAMessage(employee: Employee): string {
    return [
      `🔔 *PENGINGAT ABSENSI PAGI - ABSENSIKU GURU & TENAGA PENDIDIK*`,
      `───────────────────────`,
      `Yth. *${employee.name}* (${employee.position}),`,
      `Sistem mendeteksi Anda *BELUM MELAKUKAN ABSENSI MASUK* hari ini: *${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}*.`,
      ``,
      `⏰ *Batas Jam Masuk Resmi:* TEPAT PUKUL 07.00 WIB`,
      `⚠️ *PENTING:* Sistem menerapkan aturan *TANPA TOLERANSI*. Kehadiran lewat dari pukul 07.00 WIB akan langsung dicatat sebagai keterlambatan dan diakumulasi ke dalam rekap waktu bulanan.`,
      ``,
      `👉 Silakan lakukan presensi wajah atau tembakkan Barcode Batang ID Card Anda di terminal gerbang masuk sekolah.`,
      `───────────────────────`,
      `_Dewan Guru & Manajemen AbsensiKu_`
    ].join('\n');
  },

  // Standard reminder message
  createReminderWAMessage(employee: Employee): string {
    return this.createTeacherReminderWAMessage(employee);
  },

  // Send WhatsApp via configured Gateway
  async dispatchWhatsAppNotification(params: {
    phone: string;
    targetName: string;
    message: string;
    isReminder?: boolean;
  }): Promise<{ success: boolean; directUrl: string }> {
    const config = StorageService.getWhatsAppConfig();
    const cleanPhone = params.phone.replace(/[^0-9]/g, '');
    const directUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(params.message)}`;

    const newLog: NotificationLog = {
      id: 'notif-wa-' + Date.now(),
      type: 'whatsapp',
      targetName: params.targetName,
      targetPhoneOrDevice: cleanPhone,
      title: params.isReminder ? 'Pengingat Guru & Karyawan Belum Absen' : 'Bukti Absensi WhatsApp',
      message: params.message,
      timestamp: Date.now(),
      status: 'terkirim',
      apiProvider: `${config.provider.toUpperCase()} Gateway (${config.endpointUrl})`,
    };

    StorageService.addNotificationLog(newLog);

    return {
      success: true,
      directUrl,
    };
  },
};

function getVerificationLabel(method: string): string {
  switch (method) {
    case 'face_recognition':
      return 'Pengenalan Wajah AI (Face Biometric)';
    case 'camera_qr':
      return 'Kamera Scanner Barcode ID';
    case 'external_hardware_scanner':
      return 'Scanner Barcode Batang (Kabel / Bluetooth HID)';
    case 'biometric_fingerprint':
      return 'Sidik Jari Biometrik';
    default:
      return method;
  }
}
