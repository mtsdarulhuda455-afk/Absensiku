export type UserRole = 'super_admin' | 'admin' | 'guru' | 'siswa' | 'staf' | 'manager' | 'employee' | 'kiosk';

export type EmployeeCategory = 'guru' | 'staf' | 'manajemen' | 'siswa' | 'admin' | 'super_admin';

export interface Employee {
  id: string;
  nip: string; // NIP Pegawai atau NISN Siswa
  name: string;
  role: UserRole;
  category: EmployeeCategory;
  department: string; // 'Dewan Guru' | 'Tata Usaha & Administrasi' | 'Kelas 7-A' | etc.
  position: string;
  phone: string; // e.g. 628123456789 (No WA pegawai atau orang tua siswa)
  email: string;
  avatarUrl: string;
  faceMatchScore: number;
  qrCodeId: string; // Barcode ID (Code 39)
  shift: string; // "07:00 - 14:00 WIB"
  isActive: boolean;
  classId?: string;
  gender?: 'L' | 'P';
  parentName?: string;
  notes?: string;
}

export interface OfficeLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export type AttendanceType = 'check_in' | 'check_out';

export type AttendanceStatus = 'on_time' | 'late' | 'early_leave' | 'overtime';

export type VerificationMethod = 
  | 'face_recognition' 
  | 'camera_qr' 
  | 'external_hardware_scanner' 
  | 'biometric_fingerprint';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNip: string;
  department: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  timestamp: number;
  type: AttendanceType;
  status: AttendanceStatus;
  lateMinutes: number; // calculated if after 07:00:00 (no tolerance)
  earlyMinutes: number; // calculated if check-out before 13:00:00
  overtimeHours: number;
  verificationMethod: VerificationMethod;
  matchConfidence: number; // 0 - 100%
  photoSnapshot?: string;
  location: {
    lat: number;
    lng: number;
    officeId: string;
    officeName: string;
    distanceMeters: number;
    isWithinRadius: boolean;
  };
  isOfflineQueued: boolean;
  syncStatus: 'synced' | 'pending' | 'failed';
  pushNotificationSent: boolean;
  waNotificationSent: boolean;
  waStatus: 'terkirim' | 'pending' | 'gagal';
  deviceInfo: string;
  notes?: string;
}

// Monthly Time Accumulation Summary
export interface MonthlyTimeAccumulation {
  employeeId: string;
  employeeName: string;
  employeeNip: string;
  department: string;
  position: string;
  category: EmployeeCategory;
  periodMonth: number;
  periodYear: number;
  totalWorkDays: number;
  attendedDays: number;
  absentDays: number;
  
  // Late accumulation
  lateCount: number;
  totalLateMinutes: number;
  formattedLateTime: string; // e.g. "2 Jam 15 Menit"
  
  // Early leave accumulation
  earlyLeaveCount: number;
  totalEarlyLeaveMinutes: number;
  formattedEarlyTime: string; // e.g. "45 Menit"
  
  // Work time accumulation
  totalWorkMinutes: number;
  formattedTotalWorkTime: string; // e.g. "142 Jam 30 Menit"
}

export interface NotificationLog {
  id: string;
  type: 'whatsapp' | 'push';
  targetName: string;
  targetPhoneOrDevice: string;
  title: string;
  message: string;
  timestamp: number;
  status: 'terkirim' | 'pending' | 'gagal';
  apiProvider: string;
}

export interface WhatsAppConfig {
  provider: 'fonnte' | 'wablas' | 'twilio' | 'direct_gateway';
  apiKey: string;
  senderNumber: string;
  endpointUrl: string;
  autoSendCheckIn: boolean;
  autoSendReminder: boolean;
}

export interface WorkScheduleConfig {
  checkInOpenTime: string; // e.g. "05:30"
  workStartTime: string; // e.g. "07:00" (Strict, no tolerance)
  defaultCheckOutTime: string; // e.g. "13:00"
  todayCheckOutTime: string; // Customizable e.g. "11:30" or "13:00"
  isCustomDay: boolean;
  customDayNote: string; // e.g. "Hari Jumat / Kepulangan Awal"
}

// Model Siswa / Anggota Kelas MTs Darul Huda
export interface ClassMember {
  id: string; // e.g. "std-7a-01"
  nisn: string; // e.g. "0081928371"
  name: string; // e.g. "Ahmad Fauzan Al-Ghifari"
  gender: 'L' | 'P';
  parentName: string; // e.g. "H. Supriyadi"
  phone: string; // e.g. "6281234567890" (WhatsApp orang tua untuk notifikasi kehadiran & pengumuman kelas)
  address?: string;
  qrCodeId: string; // e.g. "NISN-0081928371"
  photoUrl?: string;
  isActive: boolean;
  notes?: string;
  joinedAt?: string;
}

// Model Kelas & Wali Kelas
export interface SchoolClass {
  id: string; // e.g. "cls-7a"
  name: string; // e.g. "Kelas 7-A (Tahfidz & Sains)"
  gradeLevel: '7' | '8' | '9' | string;
  academicYear: string; // e.g. "2025/2026"
  homeroomTeacherId: string; // Employee ID
  homeroomTeacherName: string; // Nama Wali Kelas
  homeroomTeacherNip?: string; // NIP Wali Kelas
  homeroomTeacherPhone?: string; // No WA Wali Kelas
  roomName?: string; // e.g. "Gedung Al-Hikmah Lt. 2 (R. 201)"
  capacity: number; // e.g. 32
  members: ClassMember[];
  createdAt?: string;
  updatedAt?: string;
}

