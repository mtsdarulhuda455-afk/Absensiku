import { Employee, OfficeLocation, AttendanceRecord, WhatsAppConfig, NotificationLog, MonthlyTimeAccumulation, WorkScheduleConfig, SchoolClass, ClassMember } from '../types/attendance';
import { db, handleFirestoreError, OperationType, firebaseConfig, isQuotaExceeded } from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc,
  onSnapshot, 
  query, 
  orderBy, 
  limit,
  writeBatch
} from 'firebase/firestore';

export const WORK_HOURS = {
  RESET_HOUR: 0, // Reset absensi jam 00.00 WIB
  CHECK_IN_OPEN_HOUR: 5,
  CHECK_IN_OPEN_MINUTE: 30, // 05.30 WIB
  WORK_START_HOUR: 7,
  WORK_START_MINUTE: 0, // 07.00 WIB (TIDAK ADA TOLERANSI)
  CHECK_OUT_MIN_HOUR: 13,
  CHECK_OUT_MIN_MINUTE: 0, // 13.00 WIB
  CHECK_OUT_MAX_HOUR: 15,
  CHECK_OUT_MAX_MINUTE: 0, // 15.00 WIB
};

export const DEFAULT_SCHEDULE: WorkScheduleConfig = {
  checkInOpenTime: '05:30',
  workStartTime: '07:00', // Strict 07:00 WIB, no tolerance
  defaultCheckOutTime: '13:00',
  todayCheckOutTime: '13:00', // Customizable e.g. 11:30 for Friday or special days
  isCustomDay: false,
  customDayNote: 'Hari Normal',
};

export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  const h = parts[0] || 0;
  const m = parts[1] || 0;
  return h * 60 + m;
}

export function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data.map((item) => cleanForFirestore(item)) as any;
  }
  if (typeof data === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = cleanForFirestore(value);
      }
    }
    return cleaned;
  }
  return data;
}

export const DEFAULT_OFFICES: OfficeLocation[] = [
  {
    id: 'off-sekolah',
    name: 'Gedung Utama Sekolah & Kampus Terpadu',
    address: 'Jl. Pendidikan No. 45, Kebayoran Baru, Jakarta Selatan',
    latitude: -6.2248,
    longitude: 106.8095,
    radiusMeters: 150,
  },
  {
    id: 'off-lab',
    name: 'Gedung Laboratorium & Praktikum Terpadu',
    address: 'Jl. Pemuda No. 12, Surabaya',
    latitude: -7.2657,
    longitude: 112.7423,
    radiusMeters: 200,
  },
];

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'emp-001',
    nip: 'NIP-19850312-001',
    name: 'Budi Santoso, S.Pd',
    role: 'guru',
    category: 'guru',
    department: 'Dewan Guru',
    position: 'Guru Matematika & Waka Kurikulum',
    phone: '6281289345120',
    email: 'budi.santoso@sekolah.sch.id',
    avatarUrl: '/src/assets/images/avatar_budi_santoso_1793876906414.jpg',
    faceMatchScore: 98.7,
    qrCodeId: '19850312-001',
    shift: '07:00 - 14:30 WIB',
    isActive: true,
  },
  {
    id: 'emp-002',
    nip: 'NIP-19880724-002',
    name: 'Dra. Hj. Siti Rahmawati, M.Pd',
    role: 'super_admin',
    category: 'super_admin',
    department: 'Dewan Guru',
    position: 'Kepala Madrasah & Super Admin',
    phone: '6285712398451',
    email: 'siti.rahmawati@sekolah.sch.id',
    avatarUrl: '/src/assets/images/avatar_siti_rahma_1793876906014.jpg',
    faceMatchScore: 99.2,
    qrCodeId: '19880724-002',
    shift: '07:00 - 15:00 WIB',
    isActive: true,
  },
  {
    id: 'emp-003',
    nip: 'NIP-19941108-003',
    name: 'Reza Aditya, S.Kom',
    role: 'guru',
    category: 'guru',
    department: 'Dewan Guru',
    position: 'Guru Informatika & Wali Kelas 7-B',
    phone: '6287890123445',
    email: 'reza.aditya@sekolah.sch.id',
    avatarUrl: '/src/assets/images/avatar_reza_aditya_1793876906907.jpg',
    faceMatchScore: 97.9,
    qrCodeId: '19941108-003',
    shift: '07:00 - 14:00 WIB',
    isActive: true,
  },
  {
    id: 'emp-004',
    nip: 'NIP-19910515-004',
    name: 'Dewi Anggraini, S.Pd',
    role: 'admin',
    category: 'admin',
    department: 'Dewan Guru',
    position: 'Admin Presensi & Guru Bahasa',
    phone: '6281312345678',
    email: 'dewi.anggraini@sekolah.sch.id',
    avatarUrl: '/src/assets/images/avatar_siti_rahma_1793876906014.jpg',
    faceMatchScore: 98.4,
    qrCodeId: '19910515-004',
    shift: '07:00 - 14:30 WIB',
    isActive: true,
  },
  {
    id: 'emp-005',
    nip: 'NIP-19960218-005',
    name: 'Maya Putri Lestari, S.E',
    role: 'staf',
    category: 'staf',
    department: 'Tata Usaha & Administrasi',
    position: 'Kepala Tata Usaha & Staf Kepegawaian',
    phone: '6289654321098',
    email: 'maya.lestari@sekolah.sch.id',
    avatarUrl: '/src/assets/images/avatar_siti_rahma_1793876906014.jpg',
    faceMatchScore: 98.1,
    qrCodeId: '19960218-005',
    shift: '07:00 - 15:00 WIB',
    isActive: true,
  },
  {
    id: 'emp-006',
    nip: 'NIP-19890401-006',
    name: 'Agus Setiawan',
    role: 'kiosk',
    category: 'staf',
    department: 'Keamanan',
    position: 'Koordinator Keamanan & Petugas Piket Gerbang',
    phone: '6282199887766',
    email: 'agus.setiawan@sekolah.sch.id',
    avatarUrl: '/src/assets/images/avatar_reza_aditya_1793876906907.jpg',
    faceMatchScore: 96.5,
    qrCodeId: '19890401-006',
    shift: '06:00 - 15:00 WIB',
    isActive: true,
  },
  {
    id: 'std-001',
    nip: '0081928371',
    name: 'Ahmad Fauzan Al-Ghifari',
    role: 'siswa',
    category: 'siswa',
    department: 'Kelas 7-A (Tahfidz & Sains)',
    position: 'Siswa / Ketua Kelas 7-A',
    phone: '6281234567890',
    email: 'ahmad.fauzan@siswa.mts.sch.id',
    avatarUrl: '/src/assets/images/avatar_reza_aditya_1793876906907.jpg',
    faceMatchScore: 98.0,
    qrCodeId: 'NISN-0081928371',
    shift: '07:00 - 13:30 WIB',
    isActive: true,
    gender: 'L',
    parentName: 'H. Supriyadi',
    notes: 'Ketua Kelas 7-A',
  },
  {
    id: 'std-002',
    nip: '0076512702',
    name: 'Syifa Nurul Izzah',
    role: 'siswa',
    category: 'siswa',
    department: 'Kelas 9-A (Unggulan & Olimpiade)',
    position: 'Siswi / Juara 1 KSM',
    phone: '6281234567702',
    email: 'syifa.izzah@siswa.mts.sch.id',
    avatarUrl: '/src/assets/images/avatar_siti_rahma_1793876906014.jpg',
    faceMatchScore: 99.0,
    qrCodeId: 'NISN-0076512702',
    shift: '07:00 - 13:30 WIB',
    isActive: true,
    gender: 'P',
    parentName: 'M. Izzuddin',
    notes: 'Peraih Medali Olimpiade',
  }
];

export const DEFAULT_WA_CONFIG: WhatsAppConfig = {
  provider: 'fonnte',
  apiKey: 'FN-DEMO-SECURE-KEY-8823',
  senderNumber: '6281234567890',
  endpointUrl: 'https://api.fonnte.com/send',
  autoSendCheckIn: true,
  autoSendReminder: true,
};

// Haversine distance
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Convert minutes to readable Indonesian format: e.g. "2 Jam 15 Menit"
export function formatMinutes(minutes: number): string {
  if (!minutes || minutes <= 0) return '0 Menit';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} Menit`;
  if (m === 0) return `${h} Jam`;
  return `${h} Jam ${m} Menit`;
}

// Generate seeded attendance history with strict 07:00 WIB check-in rules
export function generateInitialAttendanceRecords(): AttendanceRecord[] {
  const today = new Date().toISOString().split('T')[0];
  
  return [
    {
      id: 'TRX-88201',
      employeeId: 'emp-001',
      employeeName: 'Budi Santoso, S.Pd',
      employeeNip: 'NIP-19850312-001',
      department: 'Dewan Guru',
      date: today,
      time: '06:48:15',
      timestamp: Date.now() - 3600 * 2000,
      type: 'check_in',
      status: 'on_time',
      lateMinutes: 0,
      earlyMinutes: 0,
      overtimeHours: 0,
      verificationMethod: 'face_recognition',
      matchConfidence: 99.4,
      location: {
        lat: -6.22485,
        lng: 106.80952,
        officeId: 'off-sekolah',
        officeName: 'Gedung Utama Sekolah & Kampus Terpadu',
        distanceMeters: 12,
        isWithinRadius: true,
      },
      isOfflineQueued: false,
      syncStatus: 'synced',
      pushNotificationSent: true,
      waNotificationSent: true,
      waStatus: 'terkirim',
      deviceInfo: 'Android Chrome / Samsung S24',
    },
    {
      id: 'TRX-88202',
      employeeId: 'emp-002',
      employeeName: 'Dra. Hj. Siti Rahmawati, M.Pd',
      employeeNip: 'NIP-19880724-002',
      department: 'Dewan Guru',
      date: today,
      time: '06:55:10',
      timestamp: Date.now() - 3600 * 1800,
      type: 'check_in',
      status: 'on_time',
      lateMinutes: 0,
      earlyMinutes: 0,
      overtimeHours: 0,
      verificationMethod: 'face_recognition',
      matchConfidence: 99.1,
      location: {
        lat: -6.22479,
        lng: 106.80948,
        officeId: 'off-sekolah',
        officeName: 'Gedung Utama Sekolah & Kampus Terpadu',
        distanceMeters: 15,
        isWithinRadius: true,
      },
      isOfflineQueued: false,
      syncStatus: 'synced',
      pushNotificationSent: true,
      waNotificationSent: true,
      waStatus: 'terkirim',
      deviceInfo: 'iOS Safari / iPhone 15',
    },
    {
      id: 'TRX-88203',
      employeeId: 'emp-003',
      employeeName: 'Reza Aditya, S.Kom',
      employeeNip: 'NIP-19941108-003',
      department: 'Dewan Guru',
      date: today,
      time: '07:18:24', // Late by 18 minutes past 07:00
      timestamp: Date.now() - 3600 * 1200,
      type: 'check_in',
      status: 'late',
      lateMinutes: 18,
      earlyMinutes: 0,
      overtimeHours: 0,
      verificationMethod: 'external_hardware_scanner',
      matchConfidence: 100,
      location: {
        lat: -6.22481,
        lng: 106.80951,
        officeId: 'off-sekolah',
        officeName: 'Gedung Utama Sekolah & Kampus Terpadu',
        distanceMeters: 8,
        isWithinRadius: true,
      },
      isOfflineQueued: false,
      syncStatus: 'synced',
      pushNotificationSent: true,
      waNotificationSent: true,
      waStatus: 'terkirim',
      deviceInfo: 'Zebra DS2208 USB Barcode Scanner (Piket Gerbang)',
    },
    {
      id: 'TRX-88204',
      employeeId: 'emp-006',
      employeeName: 'Agus Setiawan',
      employeeNip: 'NIP-19890401-006',
      department: 'Keamanan',
      date: today,
      time: '05:50:30',
      timestamp: Date.now() - 3600 * 3000,
      type: 'check_in',
      status: 'on_time',
      lateMinutes: 0,
      earlyMinutes: 0,
      overtimeHours: 0,
      verificationMethod: 'camera_qr',
      matchConfidence: 98.5,
      location: {
        lat: -6.22481,
        lng: 106.80951,
        officeId: 'off-sekolah',
        officeName: 'Gedung Utama Sekolah & Kampus Terpadu',
        distanceMeters: 10,
        isWithinRadius: true,
      },
      isOfflineQueued: false,
      syncStatus: 'synced',
      pushNotificationSent: true,
      waNotificationSent: true,
      waStatus: 'terkirim',
      deviceInfo: 'Kiosk Gerbang Sekolah',
    }
  ];
}

// Storage keys
const KEY_EMPLOYEES = 'absensiku_employees';
const KEY_ATTENDANCE = 'absensiku_attendance';
const KEY_OFFLINE_QUEUE = 'absensiku_offline_queue';
const KEY_OFFICES = 'absensiku_offices';
const KEY_WA_CONFIG = 'absensiku_wa_config';
const KEY_NOTIFICATION_LOGS = 'absensiku_notification_logs';
const KEY_CURRENT_USER = 'absensiku_auth_user';
const KEY_SCHEDULE = 'absensiku_schedule';
const KEY_CLASSES = 'absensiku_classes';

export const INITIAL_CLASSES: SchoolClass[] = [
  {
    id: 'cls-7a',
    name: 'Kelas 7-A (Tahfidz & Sains)',
    gradeLevel: '7',
    academicYear: '2025/2026',
    homeroomTeacherId: 'emp-001',
    homeroomTeacherName: 'Budi Santoso, S.Pd',
    homeroomTeacherNip: 'NIP-19850312-001',
    homeroomTeacherPhone: '6281289345120',
    roomName: 'Ruang 101 - Gedung Ibnu Sina',
    capacity: 32,
    createdAt: '2025-07-15',
    members: [
      {
        id: 'std-7a-01',
        nisn: '0098712301',
        name: 'Ahmad Fauzan Al-Ghifari',
        gender: 'L',
        parentName: 'H. Supriyadi',
        phone: '6281298765431',
        address: 'Jl. Pesantren No. 14, Jakarta',
        qrCodeId: 'NISN-0098712301',
        isActive: true,
        joinedAt: '2025-07-15',
        notes: 'Ketua Kelas',
      },
      {
        id: 'std-7a-02',
        nisn: '0098712302',
        name: 'Siti Nur Aisyah',
        gender: 'P',
        parentName: "M. Syafi'i",
        phone: '6281298765432',
        address: 'Jl. Melati No. 8, Jakarta',
        qrCodeId: 'NISN-0098712302',
        isActive: true,
        joinedAt: '2025-07-15',
        notes: 'Sekretaris Rombel',
      },
      {
        id: 'std-7a-03',
        nisn: '0098712303',
        name: 'Muhammad Rizky Pratama',
        gender: 'L',
        parentName: 'Ir. Hendra',
        phone: '6281298765433',
        address: 'Jl. Anggrek No. 21, Jakarta',
        qrCodeId: 'NISN-0098712303',
        isActive: true,
        joinedAt: '2025-07-15',
      },
      {
        id: 'std-7a-04',
        nisn: '0098712304',
        name: 'Fatimah Zahra Ramadhani',
        gender: 'P',
        parentName: 'Drs. Subekti',
        phone: '6281298765434',
        address: 'Komplek Griya Indah D4',
        qrCodeId: 'NISN-0098712304',
        isActive: true,
        joinedAt: '2025-07-15',
        notes: 'Bendahara Kelas',
      },
      {
        id: 'std-7a-05',
        nisn: '0098712305',
        name: 'Daffa Ibnu Sina',
        gender: 'L',
        parentName: 'dr. Anshori',
        phone: '6281298765435',
        address: 'Jl. Dahlia No. 5',
        qrCodeId: 'NISN-0098712305',
        isActive: true,
        joinedAt: '2025-07-15',
      },
      {
        id: 'std-7a-06',
        nisn: '0098712306',
        name: 'Naila Putri Salsabila',
        gender: 'P',
        parentName: 'Bambang Irawan',
        phone: '6281298765436',
        address: 'Jl. Mawar Indah No. 12',
        qrCodeId: 'NISN-0098712306',
        isActive: true,
        joinedAt: '2025-07-15',
      },
      {
        id: 'std-7a-07',
        nisn: '0098712307',
        name: 'Yusuf Habibi Nurhuda',
        gender: 'L',
        parentName: 'K.H. Nurhadi',
        phone: '6281298765437',
        address: 'Jl. Kyai Mojo No. 3',
        qrCodeId: 'NISN-0098712307',
        isActive: true,
        joinedAt: '2025-07-15',
      },
      {
        id: 'std-7a-08',
        nisn: '0098712308',
        name: 'Anisa Rahmawati Putri',
        gender: 'P',
        parentName: 'Sulaiman',
        phone: '6281298765438',
        address: 'Jl. Kenanga No. 19',
        qrCodeId: 'NISN-0098712308',
        isActive: true,
        joinedAt: '2025-07-15',
      },
    ],
  },
  {
    id: 'cls-7b',
    name: 'Kelas 7-B (Bilingual & Riset)',
    gradeLevel: '7',
    academicYear: '2025/2026',
    homeroomTeacherId: 'emp-003',
    homeroomTeacherName: 'Reza Aditya, S.Kom',
    homeroomTeacherNip: 'NIP-19941108-003',
    homeroomTeacherPhone: '6287890123445',
    roomName: 'Ruang 102 - Gedung Al-Khawarizmi',
    capacity: 32,
    createdAt: '2025-07-15',
    members: [
      {
        id: 'std-7b-01',
        nisn: '0098712401',
        name: 'Bilal Maulana Akbar',
        gender: 'L',
        parentName: 'M. Akbar',
        phone: '6281329876501',
        address: 'Jl. Pemuda No. 7',
        qrCodeId: 'NISN-0098712401',
        isActive: true,
        joinedAt: '2025-07-15',
        notes: 'Ketua Kelas',
      },
      {
        id: 'std-7b-02',
        nisn: '0098712402',
        name: 'Kayla Az-Zahra',
        gender: 'P',
        parentName: 'Rahmat Hidayat',
        phone: '6281329876502',
        address: 'Jl. Cempaka No. 4',
        qrCodeId: 'NISN-0098712402',
        isActive: true,
        joinedAt: '2025-07-15',
      },
      {
        id: 'std-7b-03',
        nisn: '0098712403',
        name: 'Farhan Nuril Anwar',
        gender: 'L',
        parentName: 'H. Anwar Sadat',
        phone: '6281329876503',
        address: 'Jl. Kartini No. 11',
        qrCodeId: 'NISN-0098712403',
        isActive: true,
        joinedAt: '2025-07-15',
      },
      {
        id: 'std-7b-04',
        nisn: '0098712404',
        name: 'Salma Salsabila',
        gender: 'P',
        parentName: 'Agus Santosa',
        phone: '6281329876504',
        address: 'Jl. Veteran No. 3',
        qrCodeId: 'NISN-0098712404',
        isActive: true,
        joinedAt: '2025-07-15',
      },
      {
        id: 'std-7b-05',
        nisn: '0098712405',
        name: 'Haikal Rayhan',
        gender: 'L',
        parentName: 'Iskandar',
        phone: '6281329876505',
        address: 'Jl. Sudirman No. 88',
        qrCodeId: 'NISN-0098712405',
        isActive: true,
        joinedAt: '2025-07-15',
      },
      {
        id: 'std-7b-06',
        nisn: '0098712406',
        name: 'Alya Syarafina',
        gender: 'P',
        parentName: 'Taufiqurrahman',
        phone: '6281329876506',
        address: 'Jl. Gatot Subroto No. 19',
        qrCodeId: 'NISN-0098712406',
        isActive: true,
        joinedAt: '2025-07-15',
      },
    ],
  },
  {
    id: 'cls-8a',
    name: 'Kelas 8-A (Tahfidz Unggulan)',
    gradeLevel: '8',
    academicYear: '2025/2026',
    homeroomTeacherId: 'emp-004',
    homeroomTeacherName: 'Dewi Anggraini, S.Pd',
    homeroomTeacherNip: 'NIP-19910515-004',
    homeroomTeacherPhone: '6281312345678',
    roomName: 'Ruang 201 - Gedung Ar-Razi Lt. 2',
    capacity: 30,
    createdAt: '2025-07-15',
    members: [
      {
        id: 'std-8a-01',
        nisn: '0087612501',
        name: 'Zaidan Robbani',
        gender: 'L',
        parentName: 'H. Lukman Hakim',
        phone: '6285712399101',
        address: 'Perum Asri Blok C2',
        qrCodeId: 'NISN-0087612501',
        isActive: true,
        joinedAt: '2024-07-15',
        notes: 'Ketua Kelas',
      },
      {
        id: 'std-8a-02',
        nisn: '0087612502',
        name: 'Maryam Qonitah',
        gender: 'P',
        parentName: 'Ust. Abdullah',
        phone: '6285712399102',
        address: 'Jl. KH Hasyim No. 9',
        qrCodeId: 'NISN-0087612502',
        isActive: true,
        joinedAt: '2024-07-15',
      },
      {
        id: 'std-8a-03',
        nisn: '0087612503',
        name: 'Ibrahim Al-Fatih',
        gender: 'L',
        parentName: 'dr. Fathurrahman',
        phone: '6285712399103',
        address: 'Jl. Masjid Agung No. 1',
        qrCodeId: 'NISN-0087612503',
        isActive: true,
        joinedAt: '2024-07-15',
      },
      {
        id: 'std-8a-04',
        nisn: '0087612504',
        name: 'Najwa Khairunnisa',
        gender: 'P',
        parentName: 'Budi Darmawan',
        phone: '6285712399104',
        address: 'Jl. Pattimura No. 15',
        qrCodeId: 'NISN-0087612504',
        isActive: true,
        joinedAt: '2024-07-15',
      },
      {
        id: 'std-8a-05',
        nisn: '0087612505',
        name: 'Malik Abdul Aziz',
        gender: 'L',
        parentName: 'Aziz Mahmud',
        phone: '6285712399105',
        address: 'Jl. Diponegoro No. 44',
        qrCodeId: 'NISN-0087612505',
        isActive: true,
        joinedAt: '2024-07-15',
      },
      {
        id: 'std-8a-06',
        nisn: '0087612506',
        name: 'Rania Hasna Kamila',
        gender: 'P',
        parentName: 'Ir. H. Gunawan',
        phone: '6285712399106',
        address: 'Jl. Ahmad Yani No. 71',
        qrCodeId: 'NISN-0087612506',
        isActive: true,
        joinedAt: '2024-07-15',
      },
    ],
  },
  {
    id: 'cls-8b',
    name: 'Kelas 8-B (Reguler Kreatif)',
    gradeLevel: '8',
    academicYear: '2025/2026',
    homeroomTeacherId: 'emp-005',
    homeroomTeacherName: 'Maya Putri Lestari, S.E',
    homeroomTeacherNip: 'NIP-19960218-005',
    homeroomTeacherPhone: '6289654321098',
    roomName: 'Ruang 202 - Gedung Ar-Razi Lt. 2',
    capacity: 32,
    createdAt: '2025-07-15',
    members: [
      {
        id: 'std-8b-01',
        nisn: '0087612601',
        name: 'Fikri Haikal Ramadhan',
        gender: 'L',
        parentName: 'Ramadhan Syah',
        phone: '628998877601',
        address: 'Jl. Surya Kencana No. 5',
        qrCodeId: 'NISN-0087612601',
        isActive: true,
        joinedAt: '2024-07-15',
      },
      {
        id: 'std-8b-02',
        nisn: '0087612602',
        name: 'Nadia Safitri',
        gender: 'P',
        parentName: 'Joko Widodo S.',
        phone: '628998877602',
        address: 'Jl. Gajah Mada No. 10',
        qrCodeId: 'NISN-0087612602',
        isActive: true,
        joinedAt: '2024-07-15',
      },
      {
        id: 'std-8b-03',
        nisn: '0087612603',
        name: 'Raffi Ahmad Danendra',
        gender: 'L',
        parentName: 'Danendra Kusuma',
        phone: '628998877603',
        address: 'Jl. Hayam Wuruk No. 8',
        qrCodeId: 'NISN-0087612603',
        isActive: true,
        joinedAt: '2024-07-15',
      },
      {
        id: 'std-8b-04',
        nisn: '0087612604',
        name: 'Aisyah Humaira',
        gender: 'P',
        parentName: 'H. Mansyur',
        phone: '628998877604',
        address: 'Jl. Imam Bonjol No. 22',
        qrCodeId: 'NISN-0087612604',
        isActive: true,
        joinedAt: '2024-07-15',
      },
      {
        id: 'std-8b-05',
        nisn: '0087612605',
        name: 'Dimas Aditya Nugraha',
        gender: 'L',
        parentName: 'Nugraha Pratama',
        phone: '628998877605',
        address: 'Jl. Basuki Rahmat No. 3',
        qrCodeId: 'NISN-0087612605',
        isActive: true,
        joinedAt: '2024-07-15',
      },
    ],
  },
  {
    id: 'cls-9a',
    name: 'Kelas 9-A (Unggulan & Olimpiade)',
    gradeLevel: '9',
    academicYear: '2025/2026',
    homeroomTeacherId: 'emp-002',
    homeroomTeacherName: 'Dra. Hj. Siti Rahmawati, M.Pd',
    homeroomTeacherNip: 'NIP-19880724-002',
    homeroomTeacherPhone: '6285712398451',
    roomName: 'Ruang 301 - Gedung Utama Lt. 3',
    capacity: 30,
    createdAt: '2025-07-15',
    members: [
      {
        id: 'std-9a-01',
        nisn: '0076512701',
        name: 'Sulthan Hasanuddin',
        gender: 'L',
        parentName: 'H. Hasan Basri',
        phone: '6281234567701',
        address: 'Jl. Kusuma Bangsa No. 2',
        qrCodeId: 'NISN-0076512701',
        isActive: true,
        joinedAt: '2023-07-15',
        notes: 'Ketua OSIS & Kelas',
      },
      {
        id: 'std-9a-02',
        nisn: '0076512702',
        name: 'Syifa Nurul Izzah',
        gender: 'P',
        parentName: 'M. Izzuddin',
        phone: '6281234567702',
        address: 'Jl. Pahlawan No. 40',
        qrCodeId: 'NISN-0076512702',
        isActive: true,
        joinedAt: '2023-07-15',
        notes: 'Juara 1 KSM Matematika',
      },
      {
        id: 'std-9a-03',
        nisn: '0076512703',
        name: 'Fatih Robbani Pratama',
        gender: 'L',
        parentName: 'Pratama Jaya',
        phone: '6281234567703',
        address: 'Jl. Teuku Umar No. 16',
        qrCodeId: 'NISN-0076512703',
        isActive: true,
        joinedAt: '2023-07-15',
      },
      {
        id: 'std-9a-04',
        nisn: '0076512704',
        name: 'Zahra Amalia Sholiha',
        gender: 'P',
        parentName: 'H. Sholihin',
        phone: '6281234567704',
        address: 'Jl. R.A. Kartini No. 5',
        qrCodeId: 'NISN-0076512704',
        isActive: true,
        joinedAt: '2023-07-15',
      },
      {
        id: 'std-9a-05',
        nisn: '0076512705',
        name: 'Rayhan Al-Ghazali',
        gender: 'L',
        parentName: 'Ghazali Al-Mansyur',
        phone: '6281234567705',
        address: 'Jl. Kyai Kholil No. 18',
        qrCodeId: 'NISN-0076512705',
        isActive: true,
        joinedAt: '2023-07-15',
      },
    ],
  },
];

// Automatic Attendance Detection Engine
export function detectAttendanceType(
  employeeId: string,
  todayRecords: AttendanceRecord[],
  schedule: WorkScheduleConfig,
  customNow?: Date
): {
  detectedType: 'check_in' | 'check_out';
  reason: string;
  isLate: boolean;
  lateMinutes: number;
  isEarly: boolean;
  earlyMinutes: number;
  currentTimeStr: string;
  scheduleSummary: string;
} {
  const now = customNow || new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const currentMinutes = hours * 60 + minutes;
  const currentTimeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const workStartMinutes = parseTimeToMinutes(schedule.workStartTime || '07:00'); // 420 (07:00 WIB, strictly no tolerance)
  const checkOutMinutes = parseTimeToMinutes(schedule.todayCheckOutTime || '13:00'); // e.g. 780 for 13:00, or 690 for 11:30

  // Check if employee already has check_in recorded today
  const hasCheckedInToday = todayRecords.some(
    (r) => r.employeeId === employeeId && r.type === 'check_in'
  );

  // Check if employee already has check_out recorded today
  const hasCheckedOutToday = todayRecords.some(
    (r) => r.employeeId === employeeId && r.type === 'check_out'
  );

  const scheduleSummary = `Masuk 07.00 WIB · Pulang ${schedule.todayCheckOutTime} WIB (${schedule.customDayNote || 'Hari Normal'})`;

  // 1. If time is on or after today's configured check-out time (e.g. >= 13:00, or >= 11:30)
  if (currentMinutes >= checkOutMinutes) {
    return {
      detectedType: 'check_out',
      reason: `Otomatis: Waktu (${currentTimeStr} WIB) telah memasuki jam pulang (${schedule.todayCheckOutTime} WIB)`,
      isLate: false,
      lateMinutes: 0,
      isEarly: false,
      earlyMinutes: 0,
      currentTimeStr,
      scheduleSummary,
    };
  }

  // 2. If current time is before configured check-out time:
  // If employee has NOT yet checked in today -> Automatic CHECK_IN
  if (!hasCheckedInToday) {
    const isLate = currentMinutes > workStartMinutes; // > 07:00 WIB
    const lateMinutes = isLate ? currentMinutes - workStartMinutes : 0;
    return {
      detectedType: 'check_in',
      reason: isLate
        ? `Otomatis: Absen Masuk Terlambat (${lateMinutes} menit lewat 07.00 WIB)`
        : `Otomatis: Absen Masuk Tepat Waktu (05.30 - 07.00 WIB)`,
      isLate,
      lateMinutes,
      isEarly: false,
      earlyMinutes: 0,
      currentTimeStr,
      scheduleSummary,
    };
  }

  // 3. Employee already checked in today and scans again before configured check-out time:
  // Automatically detect as CHECK_OUT (Pulang Cepat)
  const earlyMinutes = Math.max(0, checkOutMinutes - currentMinutes);
  return {
    detectedType: 'check_out',
    reason: `Otomatis: Absen Pulang Cepat (Karyawan sudah check-in hari ini, ${earlyMinutes} menit sebelum jam pulang ${schedule.todayCheckOutTime} WIB)`,
    isLate: false,
    lateMinutes: 0,
    isEarly: true,
    earlyMinutes,
    currentTimeStr,
    scheduleSummary,
  };
}

export const StorageService = {
  getSchedule(): WorkScheduleConfig {
    try {
      const data = localStorage.getItem(KEY_SCHEDULE);
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    localStorage.setItem(KEY_SCHEDULE, JSON.stringify(DEFAULT_SCHEDULE));
    return DEFAULT_SCHEDULE;
  },

  saveSchedule(schedule: WorkScheduleConfig) {
    localStorage.setItem(KEY_SCHEDULE, JSON.stringify(schedule));
    if (isQuotaExceeded()) return;
    // Persist to Firebase Firestore
    setDoc(doc(db, 'settings', 'work_schedule'), schedule).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, 'settings/work_schedule');
    });
  },

  setTodayCheckOutTime(time: string, note?: string): WorkScheduleConfig {
    const current = this.getSchedule();
    const isCustom = time !== current.defaultCheckOutTime;
    const updated: WorkScheduleConfig = {
      ...current,
      todayCheckOutTime: time,
      isCustomDay: isCustom,
      customDayNote: note || (isCustom ? `Jam Pulang Disesuaikan (${time} WIB)` : 'Hari Normal'),
    };
    this.saveSchedule(updated);
    return updated;
  },

  getEmployees(): Employee[] {
    try {
      const data = localStorage.getItem(KEY_EMPLOYEES);
      if (data) {
        const list: Employee[] = JSON.parse(data);
        // Ensure super_admin and sample siswa exist if list is from previous session
        const hasSiswa = list.some((e) => e.role === 'siswa' || e.category === 'siswa');
        const hasSuperAdmin = list.some((e) => e.role === 'super_admin');
        if (!hasSiswa || !hasSuperAdmin) {
          const merged = [...list];
          if (!hasSuperAdmin) {
            const admin = merged.find((e) => e.id === 'emp-002');
            if (admin) {
              admin.role = 'super_admin';
              admin.category = 'super_admin';
            }
          }
          if (!hasSiswa) {
            const sampleStudents = INITIAL_EMPLOYEES.filter((e) => e.role === 'siswa');
            merged.push(...sampleStudents);
          }
          localStorage.setItem(KEY_EMPLOYEES, JSON.stringify(merged));
          return merged;
        }
        return list;
      }
    } catch {
      // fallback
    }
    localStorage.setItem(KEY_EMPLOYEES, JSON.stringify(INITIAL_EMPLOYEES));
    return INITIAL_EMPLOYEES;
  },

  // Add single employee permanently without overloading Firebase
  addEmployee(newEmp: Employee): void {
    const list = this.getEmployees();
    const existingIdx = list.findIndex((e) => e.id === newEmp.id || e.nip === newEmp.nip);
    let updated: Employee[];
    if (existingIdx >= 0) {
      updated = [...list];
      updated[existingIdx] = newEmp;
    } else {
      updated = [newEmp, ...list];
    }
    localStorage.setItem(KEY_EMPLOYEES, JSON.stringify(updated));

    if (!isQuotaExceeded()) {
      try {
        const cleanData = cleanForFirestore(newEmp);
        setDoc(doc(db, 'employees', newEmp.id), cleanData).catch((err) => {
          handleFirestoreError(err, OperationType.WRITE, `employees/${newEmp.id}`);
        });
      } catch (err) {
        console.warn(`[Firestore] Error persisting new employee ${newEmp.id}:`, err);
      }
    }
  },

  // Delete employee permanently from localStorage and Firebase Firestore
  deleteEmployee(employeeId: string): void {
    const list = this.getEmployees();
    const updated = list.filter((e) => e.id !== employeeId);
    localStorage.setItem(KEY_EMPLOYEES, JSON.stringify(updated));

    // Permanently remove from Firebase Firestore
    if (!isQuotaExceeded()) {
      deleteDoc(doc(db, 'employees', employeeId)).catch((err) => {
        handleFirestoreError(err, OperationType.DELETE, `employees/${employeeId}`);
      });
    }

    // Clean up class memberships if this user was a student in any class
    try {
      const classes = this.getClasses();
      let classChanged = false;
      const updatedClasses = classes.map((cls) => {
        if (cls.members.some((m) => m.id === employeeId)) {
          classChanged = true;
          return {
            ...cls,
            members: cls.members.filter((m) => m.id !== employeeId),
            updatedAt: new Date().toISOString(),
          };
        }
        return cls;
      });
      if (classChanged) {
        this.saveClasses(updatedClasses);
      }
    } catch (e) {
      console.warn('Class cleanup error on employee delete:', e);
    }
  },

  // Batch import employees (e.g. from Excel) using writeBatch to avoid overloading Firebase
  async addEmployeesBatch(newEmps: Employee[]): Promise<void> {
    if (!newEmps || newEmps.length === 0) return;
    const currentList = this.getEmployees();
    const map = new Map<string, Employee>();
    currentList.forEach((e) => map.set(e.id, e));
    newEmps.forEach((e) => map.set(e.id, e));
    const merged = Array.from(map.values());
    localStorage.setItem(KEY_EMPLOYEES, JSON.stringify(merged));

    if (isQuotaExceeded()) return;

    try {
      const batchSize = 400;
      for (let i = 0; i < newEmps.length; i += batchSize) {
        const chunk = newEmps.slice(i, i + batchSize);
        const batch = writeBatch(db);
        chunk.forEach((emp) => {
          const cleanData = cleanForFirestore(emp);
          batch.set(doc(db, 'employees', emp.id), cleanData);
        });
        await batch.commit();
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'employees/batch');
    }
  },

  // Smart differential save: permanently syncs additions, edits, and deletions without redundant writes
  saveEmployees(employees: Employee[]) {
    const oldList = this.getEmployees();
    localStorage.setItem(KEY_EMPLOYEES, JSON.stringify(employees));
    if (isQuotaExceeded()) return;

    const oldMap = new Map<string, Employee>(oldList.map((e) => [e.id, e]));
    const newMap = new Map<string, Employee>(employees.map((e) => [e.id, e]));

    // 1. Permanently delete from Firestore any user deleted from the list
    for (const [oldId] of oldMap) {
      if (!newMap.has(oldId)) {
        deleteDoc(doc(db, 'employees', oldId)).catch((err) => {
          handleFirestoreError(err, OperationType.DELETE, `employees/${oldId}`);
        });
      }
    }

    // 2. Only write new or actually changed employees (zero redundant writes)
    for (const [newId, newEmp] of newMap) {
      const oldEmp = oldMap.get(newId);
      const hasChanged =
        !oldEmp ||
        oldEmp.name !== newEmp.name ||
        oldEmp.nip !== newEmp.nip ||
        oldEmp.role !== newEmp.role ||
        oldEmp.category !== newEmp.category ||
        oldEmp.department !== newEmp.department ||
        oldEmp.position !== newEmp.position ||
        oldEmp.isActive !== newEmp.isActive ||
        oldEmp.avatarUrl !== newEmp.avatarUrl ||
        oldEmp.qrCodeId !== newEmp.qrCodeId ||
        oldEmp.phone !== newEmp.phone ||
        oldEmp.shift !== newEmp.shift ||
        oldEmp.email !== newEmp.email;

      if (hasChanged) {
        try {
          const cleanData = cleanForFirestore(newEmp);
          setDoc(doc(db, 'employees', newId), cleanData).catch((err) => {
            handleFirestoreError(err, OperationType.WRITE, `employees/${newId}`);
          });
        } catch (err) {
          console.warn(`[Firestore] Skipping write for ${newId}:`, err);
        }
      }
    }
  },

  updateEmployee(updated: Employee): void {
    const list = this.getEmployees();
    const index = list.findIndex((e) => e.id === updated.id);
    if (index >= 0) {
      list[index] = updated;
    } else {
      list.push(updated);
    }
    
    // Always persist to localStorage first
    localStorage.setItem(KEY_EMPLOYEES, JSON.stringify(list));

    // Update authUser if current user is being updated
    try {
      const current = this.getAuthUser();
      if (current && current.id === updated.id) {
        this.setAuthUser(updated);
      }
    } catch (e) {
      console.warn('Auth user sync notice:', e);
    }

    // Persist specific doc to Firestore safely if quota allows
    if (!isQuotaExceeded()) {
      try {
        const cleanData = cleanForFirestore(updated);
        setDoc(doc(db, 'employees', updated.id), cleanData).catch((err) => {
          handleFirestoreError(err, OperationType.WRITE, `employees/${updated.id}`);
        });
      } catch (err) {
        console.warn('[Firestore] Error persisting updated employee:', err);
      }
    }
  },

  getOffices(): OfficeLocation[] {
    try {
      const data = localStorage.getItem(KEY_OFFICES);
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    localStorage.setItem(KEY_OFFICES, JSON.stringify(DEFAULT_OFFICES));
    return DEFAULT_OFFICES;
  },

  getAttendanceRecords(): AttendanceRecord[] {
    try {
      const data = localStorage.getItem(KEY_ATTENDANCE);
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    const initial = generateInitialAttendanceRecords();
    localStorage.setItem(KEY_ATTENDANCE, JSON.stringify(initial));
    return initial;
  },

  saveAttendanceRecords(records: AttendanceRecord[]) {
    localStorage.setItem(KEY_ATTENDANCE, JSON.stringify(records));
  },

  addAttendanceRecord(record: AttendanceRecord): void {
    const records = this.getAttendanceRecords();
    records.unshift(record);
    this.saveAttendanceRecords(records);

    if (isQuotaExceeded()) {
      // Offline fallback: queue locally so no data is ever lost
      const queue = this.getOfflineQueue();
      if (!queue.some((q) => q.id === record.id)) {
        queue.push({ ...record, isOfflineQueued: true, syncStatus: 'pending' });
        this.saveOfflineQueue(queue);
      }
      return;
    }

    // Save record to Firebase Firestore
    setDoc(doc(db, 'attendance_records', record.id), record)
      .then(() => {
        console.log(`[Firebase Firestore] Record ${record.id} berhasil tersimpan ke cloud.`);
      })
      .catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, `attendance_records/${record.id}`);
        // If offline or network issue, queue for retry
        const queue = this.getOfflineQueue();
        if (!queue.some(q => q.id === record.id)) {
          queue.push({ ...record, isOfflineQueued: true, syncStatus: 'pending' });
          this.saveOfflineQueue(queue);
        }
      });
  },

  // Delete attendance record permanently from localStorage and Firebase Firestore
  deleteAttendanceRecord(recordId: string): void {
    const records = this.getAttendanceRecords();
    const updated = records.filter((r) => r.id !== recordId);
    this.saveAttendanceRecords(updated);

    // Remove from offline queue if queued
    const queue = this.getOfflineQueue().filter((q) => q.id !== recordId);
    this.saveOfflineQueue(queue);

    // Permanently remove from Firebase Firestore
    if (!isQuotaExceeded()) {
      deleteDoc(doc(db, 'attendance_records', recordId)).catch((err) => {
        handleFirestoreError(err, OperationType.DELETE, `attendance_records/${recordId}`);
      });
    }
  },

  getOfflineQueue(): AttendanceRecord[] {
    try {
      const data = localStorage.getItem(KEY_OFFLINE_QUEUE);
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    return [];
  },

  saveOfflineQueue(queue: AttendanceRecord[]) {
    localStorage.setItem(KEY_OFFLINE_QUEUE, JSON.stringify(queue));
  },

  enqueueOfflineAttendance(record: AttendanceRecord): void {
    const queue = this.getOfflineQueue();
    queue.push(record);
    this.saveOfflineQueue(queue);
    this.addAttendanceRecord(record);
  },

  syncOfflineQueue(): { count: number } {
    if (isQuotaExceeded()) {
      return { count: 0 };
    }
    const queue = this.getOfflineQueue();
    if (queue.length === 0) return { count: 0 };

    const records = this.getAttendanceRecords();
    const syncedIds = new Set(queue.map((q) => q.id));

    // Upload queued items to Firebase Firestore
    queue.forEach((rec) => {
      const updatedRec: AttendanceRecord = {
        ...rec,
        syncStatus: 'synced',
        isOfflineQueued: false,
        notes: (rec.notes ? rec.notes + ' ' : '') + '[Tersinkron Cloud]',
      };
      setDoc(doc(db, 'attendance_records', rec.id), updatedRec).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, `attendance_records/${rec.id}`);
      });
    });

    const updatedRecords = records.map((rec) => {
      if (syncedIds.has(rec.id)) {
        return {
          ...rec,
          syncStatus: 'synced' as const,
          isOfflineQueued: false,
          notes: (rec.notes ? rec.notes + ' ' : '') + '[Tersinkron Cloud]',
        };
      }
      return rec;
    });

    this.saveAttendanceRecords(updatedRecords);
    this.saveOfflineQueue([]);
    return { count: queue.length };
  },

  // Real-time Firestore sync & listener setup
  initFirestoreSync(callbacks?: {
    onEmployees?: (emps: Employee[]) => void;
    onAttendance?: (recs: AttendanceRecord[]) => void;
    onSchedule?: (sched: WorkScheduleConfig) => void;
    onClasses?: (classes: SchoolClass[]) => void;
  }) {
    if (isQuotaExceeded()) {
      return;
    }

    // 1. Initial Pull / Seeding for Employees
    getDocs(collection(db, 'employees'))
      .then((snapshot) => {
        if (!snapshot.empty) {
          const remoteEmployees = snapshot.docs.map(d => d.data() as Employee);
          if (remoteEmployees.length > 0) {
            // Update localStorage only without calling setDoc loop
            localStorage.setItem(KEY_EMPLOYEES, JSON.stringify(remoteEmployees));
            callbacks?.onEmployees?.(remoteEmployees);
          }
        } else if (!isQuotaExceeded()) {
          // Seed initial MTs Darul Huda employees to Firestore using single batch write
          const initial = this.getEmployees();
          try {
            const batch = writeBatch(db);
            initial.forEach(emp => {
              batch.set(doc(db, 'employees', emp.id), cleanForFirestore(emp));
            });
            batch.commit().catch(() => {});
          } catch (e) {
            console.warn('[Firestore] Batch seed notice:', e);
          }
        }
      })
      .catch((err) => {
        handleFirestoreError(err, OperationType.LIST, 'employees');
      });

    // 2. Initial Pull for Attendance Records
    getDocs(query(collection(db, 'attendance_records'), orderBy('timestamp', 'desc'), limit(100)))
      .then((snapshot) => {
        if (!snapshot.empty) {
          const remoteRecords = snapshot.docs.map(d => d.data() as AttendanceRecord);
          if (remoteRecords.length > 0) {
            localStorage.setItem(KEY_ATTENDANCE, JSON.stringify(remoteRecords));
            callbacks?.onAttendance?.(remoteRecords);
          }
        }
      })
      .catch((err) => {
        handleFirestoreError(err, OperationType.LIST, 'attendance_records');
      });

    // 3. Initial Pull for Work Schedule
    getDoc(doc(db, 'settings', 'work_schedule'))
      .then((docSnap) => {
        if (docSnap.exists()) {
          const remoteSchedule = docSnap.data() as WorkScheduleConfig;
          localStorage.setItem(KEY_SCHEDULE, JSON.stringify(remoteSchedule));
          callbacks?.onSchedule?.(remoteSchedule);
        }
      })
      .catch((err) => {
        handleFirestoreError(err, OperationType.GET, 'settings/work_schedule');
      });

    // 4. Initial Pull for Classes & Homeroom
    getDocs(collection(db, 'classes'))
      .then((snapshot) => {
        if (!snapshot.empty) {
          const remoteClasses = snapshot.docs.map(d => d.data() as SchoolClass);
          if (remoteClasses.length > 0) {
            localStorage.setItem(KEY_CLASSES, JSON.stringify(remoteClasses));
            callbacks?.onClasses?.(remoteClasses);
          }
        } else if (!isQuotaExceeded()) {
          // Seed initial classes using single batch write
          const initial = this.getClasses();
          try {
            const batch = writeBatch(db);
            initial.forEach(cls => {
              batch.set(doc(db, 'classes', cls.id), cleanForFirestore(cls));
            });
            batch.commit().catch(() => {});
          } catch (e) {
            console.warn('[Firestore] Batch classes seed notice:', e);
          }
        }
      })
      .catch((err) => {
        handleFirestoreError(err, OperationType.LIST, 'classes');
      });
  },

  // Attach real-time snapshot listener for attendance records
  subscribeToAttendance(callback: (records: AttendanceRecord[]) => void) {
    if (isQuotaExceeded()) return () => {};
    const q = query(collection(db, 'attendance_records'), orderBy('timestamp', 'desc'), limit(100));
    let unsubscribed = false;
    let unsub: (() => void) | null = null;
    try {
      unsub = onSnapshot(
        q,
        (snapshot) => {
          const list = snapshot.docs.map((d) => d.data() as AttendanceRecord);
          localStorage.setItem(KEY_ATTENDANCE, JSON.stringify(list));
          callback(list);
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'attendance_records');
          if ((error as any)?.code === 'resource-exhausted' || error?.message?.includes('Quota exceeded')) {
            if (unsub && !unsubscribed) {
              unsubscribed = true;
              unsub();
            }
          }
        }
      );
      return () => {
        unsubscribed = true;
        if (unsub) unsub();
      };
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'attendance_records');
      return () => {};
    }
  },

  // Attach real-time snapshot listener for employees
  subscribeToEmployees(callback: (employees: Employee[]) => void) {
    if (isQuotaExceeded()) return () => {};
    let unsubscribed = false;
    let unsub: (() => void) | null = null;
    try {
      unsub = onSnapshot(
        collection(db, 'employees'),
        (snapshot) => {
          const list = snapshot.docs.map((d) => d.data() as Employee);
          // Only update localStorage and invoke UI callback - never loop writes!
          localStorage.setItem(KEY_EMPLOYEES, JSON.stringify(list));
          callback(list);
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'employees');
          if ((error as any)?.code === 'resource-exhausted' || error?.message?.includes('Quota exceeded')) {
            if (unsub && !unsubscribed) {
              unsubscribed = true;
              unsub();
            }
          }
        }
      );
      return () => {
        unsubscribed = true;
        if (unsub) unsub();
      };
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'employees');
      return () => {};
    }
  },

  // ==========================================
  // School Classes & Homeroom (Wali Kelas) Methods
  // ==========================================
  getClasses(): SchoolClass[] {
    try {
      const data = localStorage.getItem(KEY_CLASSES);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    localStorage.setItem(KEY_CLASSES, JSON.stringify(INITIAL_CLASSES));
    return INITIAL_CLASSES;
  },

  saveClasses(classes: SchoolClass[]): void {
    const oldList = this.getClasses();
    localStorage.setItem(KEY_CLASSES, JSON.stringify(classes));
    if (isQuotaExceeded()) return;

    const oldMap = new Map<string, SchoolClass>(oldList.map((c) => [c.id, c]));
    const newMap = new Map<string, SchoolClass>(classes.map((c) => [c.id, c]));

    // 1. Permanently delete from Firestore any class removed from the list
    for (const [oldId] of oldMap) {
      if (!newMap.has(oldId)) {
        deleteDoc(doc(db, 'classes', oldId)).catch((err) => {
          handleFirestoreError(err, OperationType.DELETE, `classes/${oldId}`);
        });
      }
    }

    // 2. Only write new or modified classes
    for (const [newId, newCls] of newMap) {
      const oldCls = oldMap.get(newId);
      const isChanged = !oldCls || JSON.stringify(oldCls) !== JSON.stringify(newCls);
      if (isChanged) {
        try {
          const cleanData = cleanForFirestore(newCls);
          setDoc(doc(db, 'classes', newId), cleanData).catch((err) => {
            handleFirestoreError(err, OperationType.WRITE, `classes/${newId}`);
          });
        } catch (err) {
          console.warn(`[Firestore] Skipping write for class ${newId}:`, err);
        }
      }
    }
  },

  saveClass(cls: SchoolClass): void {
    const current = this.getClasses();
    const index = current.findIndex((c) => c.id === cls.id);
    let updated: SchoolClass[];
    if (index >= 0) {
      updated = [...current];
      updated[index] = { ...cls, updatedAt: new Date().toISOString() };
    } else {
      updated = [{ ...cls, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...current];
    }
    localStorage.setItem(KEY_CLASSES, JSON.stringify(updated));
    if (isQuotaExceeded()) return;
    // Save to Firestore safely
    try {
      const cleanData = cleanForFirestore(cls);
      setDoc(doc(db, 'classes', cls.id), cleanData).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, `classes/${cls.id}`);
      });
    } catch (err) {
      console.warn(`[Firestore] Error saving class ${cls.id}:`, err);
    }
  },

  deleteClass(classId: string): void {
    const current = this.getClasses();
    const updated = current.filter((c) => c.id !== classId);
    localStorage.setItem(KEY_CLASSES, JSON.stringify(updated));
    if (isQuotaExceeded()) return;
    // Delete from Firestore
    deleteDoc(doc(db, 'classes', classId)).catch((err) => {
      handleFirestoreError(err, OperationType.DELETE, `classes/${classId}`);
    });
  },

  addStudentToClass(classId: string, student: ClassMember): void {
    const current = this.getClasses();
    const cls = current.find((c) => c.id === classId);
    if (!cls) return;

    const existingIndex = cls.members.findIndex((m) => m.id === student.id || m.nisn === student.nisn);
    let updatedMembers: ClassMember[];
    if (existingIndex >= 0) {
      updatedMembers = [...cls.members];
      updatedMembers[existingIndex] = student;
    } else {
      updatedMembers = [student, ...cls.members];
    }

    const updatedCls: SchoolClass = {
      ...cls,
      members: updatedMembers,
      updatedAt: new Date().toISOString(),
    };
    this.saveClass(updatedCls);
  },

  updateStudentInClass(classId: string, student: ClassMember): void {
    const current = this.getClasses();
    const cls = current.find((c) => c.id === classId);
    if (!cls) return;

    const updatedMembers = cls.members.map((m) => (m.id === student.id ? student : m));
    const updatedCls: SchoolClass = {
      ...cls,
      members: updatedMembers,
      updatedAt: new Date().toISOString(),
    };
    this.saveClass(updatedCls);
  },

  removeStudentFromClass(classId: string, studentId: string): void {
    const current = this.getClasses();
    const cls = current.find((c) => c.id === classId);
    if (!cls) return;

    const updatedMembers = cls.members.filter((m) => m.id !== studentId);
    const updatedCls: SchoolClass = {
      ...cls,
      members: updatedMembers,
      updatedAt: new Date().toISOString(),
    };
    this.saveClass(updatedCls);
  },

  // Attach real-time snapshot listener for classes
  subscribeToClasses(callback: (classes: SchoolClass[]) => void) {
    if (isQuotaExceeded()) return () => {};
    let unsubscribed = false;
    let unsub: (() => void) | null = null;
    try {
      unsub = onSnapshot(
        collection(db, 'classes'),
        (snapshot) => {
          const list = snapshot.docs.map((d) => d.data() as SchoolClass);
          localStorage.setItem(KEY_CLASSES, JSON.stringify(list));
          callback(list);
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'classes');
          if ((error as any)?.code === 'resource-exhausted' || error?.message?.includes('Quota exceeded')) {
            if (unsub && !unsubscribed) {
              unsubscribed = true;
              unsub();
            }
          }
        }
      );
      return () => {
        unsubscribed = true;
        if (unsub) unsub();
      };
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'classes');
      return () => {};
    }
  },

  getWhatsAppConfig(): WhatsAppConfig {
    try {
      const data = localStorage.getItem(KEY_WA_CONFIG);
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    localStorage.setItem(KEY_WA_CONFIG, JSON.stringify(DEFAULT_WA_CONFIG));
    return DEFAULT_WA_CONFIG;
  },

  saveWhatsAppConfig(config: WhatsAppConfig) {
    localStorage.setItem(KEY_WA_CONFIG, JSON.stringify(config));
  },

  getNotificationLogs(): NotificationLog[] {
    try {
      const data = localStorage.getItem(KEY_NOTIFICATION_LOGS);
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    return [];
  },

  addNotificationLog(log: NotificationLog) {
    const logs = this.getNotificationLogs();
    logs.unshift(log);
    if (logs.length > 100) logs.pop();
    localStorage.setItem(KEY_NOTIFICATION_LOGS, JSON.stringify(logs));
  },

  // Auth User storage
  getAuthUser(): Employee | null {
    try {
      const data = localStorage.getItem(KEY_CURRENT_USER);
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    return null; // Return null so login screen displays on first visit
  },

  setAuthUser(user: Employee | null) {
    if (user) {
      localStorage.setItem(KEY_CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(KEY_CURRENT_USER);
    }
  },

  // Compute monthly accumulated time summary for employees
  getMonthlyAccumulations(
    employees: Employee[],
    records: AttendanceRecord[],
    month: number,
    year: number
  ): MonthlyTimeAccumulation[] {
    const standardWorkDays = 24; // standard 24 working/school days per month

    return employees.map((emp) => {
      const empRecords = records.filter((r) => {
        if (r.employeeId !== emp.id) return false;
        const d = new Date(r.date);
        return d.getMonth() + 1 === month && d.getFullYear() === year;
      });

      const checkIns = empRecords.filter((r) => r.type === 'check_in');
      const checkOuts = empRecords.filter((r) => r.type === 'check_out');

      let attendedDays = checkIns.length;
      let lateCount = 0;
      let totalLateMinutes = 0;
      let earlyLeaveCount = 0;
      let totalEarlyLeaveMinutes = 0;

      // Realistic baseline seed for demo if records are fresh
      if (empRecords.length < 5) {
        if (emp.id === 'emp-001') {
          attendedDays = 22;
          lateCount = 1;
          totalLateMinutes = 12;
          earlyLeaveCount = 0;
          totalEarlyLeaveMinutes = 0;
        } else if (emp.id === 'emp-003') {
          attendedDays = 21;
          lateCount = 4;
          totalLateMinutes = 68; // 1 Jam 8 Menit
          earlyLeaveCount = 2;
          totalEarlyLeaveMinutes = 35; // 35 Menit
        } else if (emp.id === 'emp-004') {
          attendedDays = 23;
          lateCount = 2;
          totalLateMinutes = 24;
          earlyLeaveCount = 1;
          totalEarlyLeaveMinutes = 15;
        } else {
          attendedDays = Math.max(1, checkIns.length);
        }
      }

      checkIns.forEach((r) => {
        if (r.status === 'late' && r.lateMinutes > 0) {
          lateCount += 1;
          totalLateMinutes += r.lateMinutes;
        }
      });

      checkOuts.forEach((r) => {
        if (r.status === 'early_leave' && r.earlyMinutes > 0) {
          earlyLeaveCount += 1;
          totalEarlyLeaveMinutes += r.earlyMinutes;
        }
      });

      const absentDays = Math.max(0, standardWorkDays - attendedDays);
      const totalWorkMinutes = attendedDays * 7 * 60 - totalLateMinutes - totalEarlyLeaveMinutes;

      return {
        employeeId: emp.id,
        employeeName: emp.name,
        employeeNip: emp.nip,
        department: emp.department,
        position: emp.position,
        category: emp.category,
        periodMonth: month,
        periodYear: year,
        totalWorkDays: standardWorkDays,
        attendedDays,
        absentDays,
        lateCount,
        totalLateMinutes,
        formattedLateTime: formatMinutes(totalLateMinutes),
        earlyLeaveCount,
        totalEarlyLeaveMinutes,
        formattedEarlyTime: formatMinutes(totalEarlyLeaveMinutes),
        totalWorkMinutes: Math.max(0, totalWorkMinutes),
        formattedTotalWorkTime: formatMinutes(Math.max(0, totalWorkMinutes)),
      };
    });
  },

  isQuotaExceeded(): boolean {
    return isQuotaExceeded();
  }
};

