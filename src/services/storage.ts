import { Employee, OfficeLocation, AttendanceRecord, WhatsAppConfig, NotificationLog, MonthlyTimeAccumulation, WorkScheduleConfig } from '../types/attendance';
import { db, handleFirestoreError, OperationType, firebaseConfig } from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit 
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
    role: 'employee',
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
    role: 'manager',
    category: 'manajemen',
    department: 'Dewan Guru',
    position: 'Kepala Sekolah',
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
    role: 'employee',
    category: 'guru',
    department: 'Dewan Guru',
    position: 'Guru Informatika & Multimedia',
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
    category: 'guru',
    department: 'Dewan Guru',
    position: 'Guru Bahasa & Koordinator Kesiswaan',
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
    role: 'employee',
    category: 'staf',
    department: 'Tata Usaha & Administrasi',
    position: 'Kepala Tata Usaha & Kepegawaian',
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
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    localStorage.setItem(KEY_EMPLOYEES, JSON.stringify(INITIAL_EMPLOYEES));
    return INITIAL_EMPLOYEES;
  },

  saveEmployees(employees: Employee[]) {
    localStorage.setItem(KEY_EMPLOYEES, JSON.stringify(employees));
    // Persist all employees to Firestore in background
    employees.forEach((emp) => {
      setDoc(doc(db, 'employees', emp.id), emp).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, `employees/${emp.id}`);
      });
    });
  },

  updateEmployee(updated: Employee): void {
    const list = this.getEmployees();
    const index = list.findIndex(e => e.id === updated.id);
    if (index >= 0) {
      list[index] = updated;
    } else {
      list.push(updated);
    }
    this.saveEmployees(list);
    // Persist specific doc to Firestore
    setDoc(doc(db, 'employees', updated.id), updated).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, `employees/${updated.id}`);
    });
    // Update authUser if matched
    const current = this.getAuthUser();
    if (current && current.id === updated.id) {
      this.setAuthUser(updated);
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
  }) {
    // 1. Initial Pull / Seeding for Employees
    getDocs(collection(db, 'employees'))
      .then((snapshot) => {
        if (!snapshot.empty) {
          const remoteEmployees = snapshot.docs.map(d => d.data() as Employee);
          if (remoteEmployees.length > 0) {
            this.saveEmployees(remoteEmployees);
            callbacks?.onEmployees?.(remoteEmployees);
          }
        } else {
          // Seed initial MTs Darul Huda employees to Firestore
          const initial = this.getEmployees();
          initial.forEach(emp => {
            setDoc(doc(db, 'employees', emp.id), emp).catch(() => {});
          });
        }
      })
      .catch((err) => {
        handleFirestoreError(err, OperationType.LIST, 'employees');
      });

    // 2. Initial Pull / Seeding for Attendance Records
    getDocs(query(collection(db, 'attendance_records'), orderBy('timestamp', 'desc'), limit(150)))
      .then((snapshot) => {
        if (!snapshot.empty) {
          const remoteRecords = snapshot.docs.map(d => d.data() as AttendanceRecord);
          if (remoteRecords.length > 0) {
            this.saveAttendanceRecords(remoteRecords);
            callbacks?.onAttendance?.(remoteRecords);
          }
        } else {
          // Seed initial attendance demo history to Firestore
          const initial = this.getAttendanceRecords();
          initial.forEach(rec => {
            setDoc(doc(db, 'attendance_records', rec.id), rec).catch(() => {});
          });
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
          this.saveSchedule(remoteSchedule);
          callbacks?.onSchedule?.(remoteSchedule);
        } else {
          const currentSched = this.getSchedule();
          setDoc(doc(db, 'settings', 'work_schedule'), currentSched).catch(() => {});
        }
      })
      .catch((err) => {
        handleFirestoreError(err, OperationType.GET, 'settings/work_schedule');
      });
  },

  // Attach real-time snapshot listener for attendance records
  subscribeToAttendance(callback: (records: AttendanceRecord[]) => void) {
    const q = query(collection(db, 'attendance_records'), orderBy('timestamp', 'desc'), limit(200));
    return onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map((d) => d.data() as AttendanceRecord);
          this.saveAttendanceRecords(list);
          callback(list);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'attendance_records');
      }
    );
  },

  // Attach real-time snapshot listener for employees
  subscribeToEmployees(callback: (employees: Employee[]) => void) {
    return onSnapshot(
      collection(db, 'employees'),
      (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map((d) => d.data() as Employee);
          this.saveEmployees(list);
          callback(list);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'employees');
      }
    );
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
  }
};
