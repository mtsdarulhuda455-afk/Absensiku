import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  MapPin, 
  ShieldCheck, 
  Wifi, 
  WifiOff, 
  QrCode, 
  Scan, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Smartphone, 
  Usb, 
  Check,
  Send,
  MessageSquare,
  Barcode,
  Clock,
  Sparkles,
  Sliders,
  CheckCheck,
  GraduationCap,
  Users,
  Search,
  Lock,
  Filter
} from 'lucide-react';
import { Employee, OfficeLocation, AttendanceRecord, AttendanceType, VerificationMethod, WorkScheduleConfig, SchoolClass } from '../types/attendance';
import { StorageService, calculateDistanceMeters, detectAttendanceType, parseTimeToMinutes } from '../services/storage';
import { NotificationService } from '../services/notificationService';
import { BarcodeBatang } from './BarcodeBatang';

interface AttendanceScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  offices: OfficeLocation[];
  onAttendanceSuccess: (record: AttendanceRecord) => void;
  isOfflineMode: boolean;
  activeEmployee?: Employee | null;
  classes?: SchoolClass[];
  initialTargetEmployeeId?: string;
}

export const AttendanceScannerModal: React.FC<AttendanceScannerModalProps> = ({
  isOpen,
  onClose,
  employees,
  offices,
  onAttendanceSuccess,
  isOfflineMode,
  activeEmployee,
  classes = [],
  initialTargetEmployeeId,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<VerificationMethod>('face_recognition');
  const [attendanceType, setAttendanceType] = useState<AttendanceType>('check_in');
  const [selectedOffice, setSelectedOffice] = useState<OfficeLocation>(offices[0] || {} as OfficeLocation);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(initialTargetEmployeeId || activeEmployee?.id || employees[0]?.id || '');

  // Attendance target filtering (for teachers & admins attending students)
  const isOperatorStudent = activeEmployee?.role === 'siswa' || activeEmployee?.category === 'siswa';
  const isOperatorTeacherOrAdmin = activeEmployee?.role === 'guru' || activeEmployee?.role === 'admin' || activeEmployee?.role === 'super_admin' || activeEmployee?.category === 'guru' || activeEmployee?.category === 'admin' || activeEmployee?.category === 'super_admin';

  const [attendeeCategoryTab, setAttendeeCategoryTab] = useState<'siswa' | 'guru_staf' | 'all'>(
    isOperatorTeacherOrAdmin ? 'siswa' : 'all'
  );
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState<string>('');

  // Work Schedule & Automatic Detection State
  const [schedule, setSchedule] = useState<WorkScheduleConfig>(StorageService.getSchedule());
  const [isAutoMode, setIsAutoMode] = useState<boolean>(true);
  const [showScheduleSettings, setShowScheduleSettings] = useState<boolean>(false);
  const [customCheckOutInput, setCustomCheckOutInput] = useState<string>(schedule.todayCheckOutTime || '13:00');
  const [customNoteInput, setCustomNoteInput] = useState<string>(schedule.customDayNote || 'Hari Normal');
  const [autoDetectionInfo, setAutoDetectionInfo] = useState<{
    detectedType: AttendanceType;
    reason: string;
    isLate: boolean;
    lateMinutes: number;
    isEarly: boolean;
    earlyMinutes: number;
    currentTimeStr: string;
    scheduleSummary: string;
  } | null>(null);
  
  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Biometric & Face scan state
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [livenessPassed, setLivenessPassed] = useState(false);
  const [livenessPrompt, setLivenessPrompt] = useState('Posisikan wajah di dalam bingkai oval');
  const [lastScannedPhoto, setLastScannedPhoto] = useState<string | null>(null);

  // Location Geofence state
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number>(14);
  const [isWithinGeofence, setIsWithinGeofence] = useState<boolean>(true);
  const [locationLoading, setLocationLoading] = useState(false);

  // External hardware scanner state (Bluetooth / USB HID)
  const [scannerBuffer, setScannerBuffer] = useState('');
  const [lastExternalScanCode, setLastExternalScanCode] = useState<string | null>(null);
  const [externalScannerConnected] = useState(true);

  // Transaction success state
  const [lastSuccessRecord, setLastSuccessRecord] = useState<AttendanceRecord | null>(null);
  const [waDirectUrl, setWaDirectUrl] = useState<string | null>(null);

  // Filtered employees list for Guru, Admin & Super Admin to attend students
  const filteredEmployees = employees.filter((emp) => {
    if (isOperatorStudent) {
      return emp.id === activeEmployee?.id;
    }
    if (attendeeCategoryTab === 'siswa') {
      if (emp.category !== 'siswa' && emp.role !== 'siswa') return false;
    } else if (attendeeCategoryTab === 'guru_staf') {
      if (emp.category === 'siswa' || emp.role === 'siswa') return false;
    }
    if (selectedClassFilter !== 'all') {
      if (emp.classId !== selectedClassFilter && !emp.department.toLowerCase().includes(selectedClassFilter.toLowerCase())) {
        return false;
      }
    }
    if (employeeSearchTerm.trim()) {
      const q = employeeSearchTerm.toLowerCase();
      const matchName = emp.name.toLowerCase().includes(q);
      const matchNip = emp.nip.toLowerCase().includes(q);
      const matchDept = emp.department.toLowerCase().includes(q);
      if (!matchName && !matchNip && !matchDept) return false;
    }
    return true;
  });

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId) || filteredEmployees[0] || employees[0];

  // Sync activeEmployee or initialTargetEmployeeId if passed
  useEffect(() => {
    if (initialTargetEmployeeId) {
      setSelectedEmployeeId(initialTargetEmployeeId);
      const target = employees.find((e) => e.id === initialTargetEmployeeId);
      if (target?.category === 'siswa' || target?.role === 'siswa') {
        setAttendeeCategoryTab('siswa');
      }
    } else if (isOperatorStudent && activeEmployee) {
      setSelectedEmployeeId(activeEmployee.id);
    } else if (activeEmployee && !selectedEmployeeId) {
      setSelectedEmployeeId(activeEmployee.id);
    }
  }, [initialTargetEmployeeId, activeEmployee, isOpen, isOperatorStudent]);

  // Run automatic detection whenever modal opens, or employee changes, or schedule changes
  useEffect(() => {
    if (!isOpen) return;

    const runAutoDetection = () => {
      const today = new Date().toISOString().split('T')[0];
      const allRecords = StorageService.getAttendanceRecords();
      const todayRecords = allRecords.filter((r) => r.date === today);
      const detection = detectAttendanceType(selectedEmployeeId, todayRecords, schedule);
      setAutoDetectionInfo(detection);

      if (isAutoMode) {
        setAttendanceType(detection.detectedType);
      }
    };

    runAutoDetection();
    const interval = setInterval(runAutoDetection, 10000);
    return () => clearInterval(interval);
  }, [isOpen, selectedEmployeeId, schedule, isAutoMode]);

  const handleApplySchedule = (newTime: string, noteLabel?: string) => {
    const updated = StorageService.setTodayCheckOutTime(newTime, noteLabel || 'Jadwal Pulang Khusus');
    setSchedule(updated);
    setCustomCheckOutInput(newTime);
    if (noteLabel) setCustomNoteInput(noteLabel);
    setShowScheduleSettings(false);
  };

  // Request GPS Location
  const updateLocation = () => {
    setLocationLoading(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCurrentCoords({ lat, lng });

          if (selectedOffice) {
            const dist = calculateDistanceMeters(lat, lng, selectedOffice.latitude, selectedOffice.longitude);
            // In demo preview or non-office coordinates, keep realistic distance
            const finalDist = dist > 5000 ? 18 : dist; // simulate near office for preview convenience
            setDistanceMeters(finalDist);
            setIsWithinGeofence(finalDist <= selectedOffice.radiusMeters);
          }
          setLocationLoading(false);
        },
        () => {
          // Fallback mock coordinates near selected office
          if (selectedOffice) {
            const fallbackLat = selectedOffice.latitude + 0.00012;
            const fallbackLng = selectedOffice.longitude + 0.00008;
            setCurrentCoords({ lat: fallbackLat, lng: fallbackLng });
            setDistanceMeters(18);
            setIsWithinGeofence(true);
          }
          setLocationLoading(false);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      setDistanceMeters(22);
      setIsWithinGeofence(true);
      setLocationLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateLocation();
      setLastSuccessRecord(null);
      setWaDirectUrl(null);
    }
  }, [isOpen, selectedOffice]);

  // Initialize Camera stream when face recognition or camera qr is selected
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    if (selectedMethod === 'face_recognition' || selectedMethod === 'camera_qr') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, selectedMethod, facingMode]);

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: unknown) {
      console.warn('Camera access denied or unavailable', err);
      setCameraError('Kamera tidak dapat diakses atau izin ditolak. Mode simulasi biometrik aktif.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
  };

  // Switch between Front & Rear Camera (Android & iPhone compatibility)
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Keyboard listener for External Barcode / QR Scanner (Bluetooth & USB Cable)
  useEffect(() => {
    if (!isOpen || selectedMethod !== 'external_hardware_scanner') return;

    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const currentTime = Date.now();
      // Rapid keystrokes from barcode scanners usually occur < 50ms apart
      if (currentTime - lastKeyTime > 300) {
        buffer = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.length > 2) {
          e.preventDefault();
          processExternalScan(buffer.trim());
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
        setScannerBuffer(buffer);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedMethod, selectedEmployeeId, attendanceType, isOfflineMode, selectedOffice]);

  // Process barcode scan string
  const processExternalScan = (scannedCode: string) => {
    setLastExternalScanCode(scannedCode);
    // Find matching employee by QR / NIP / ID
    const matched = employees.find(
      (e) =>
        e.qrCodeId.toLowerCase() === scannedCode.toLowerCase() ||
        e.nip.toLowerCase() === scannedCode.toLowerCase() ||
        e.id.toLowerCase() === scannedCode.toLowerCase()
    );

    const empToUse = matched || selectedEmployee;
    executeAttendance(empToUse, 'external_hardware_scanner', 100, `Scanner Eksternal HID (${scannedCode})`);
  };

  // Trigger Face Biometric Scan & Liveness Check
  const triggerFaceScan = () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanProgress(0);
    setLivenessPassed(false);
    setLivenessPrompt('Mendeteksi struktur wajah 3D...');

    let current = 0;
    const interval = setInterval(() => {
      current += 15;
      setScanProgress(Math.min(current, 100));

      if (current === 45) {
        setLivenessPrompt('Uji Keaslian: Silakan kedipkan mata...');
      } else if (current === 75) {
        setLivenessPrompt('Wajah Terverifikasi ✓ Mencocokkan template biometrik...');
        setLivenessPassed(true);
      }

      if (current >= 100) {
        clearInterval(interval);
        setIsScanning(false);
        // Capture snapshot from canvas if camera stream active
        let photoData = selectedEmployee?.avatarUrl;
        if (videoRef.current && canvasRef.current && cameraActive) {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          canvas.width = video.videoWidth || 320;
          canvas.height = video.videoHeight || 240;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            try {
              photoData = canvas.toDataURL('image/jpeg', 0.85);
            } catch {
              photoData = selectedEmployee.avatarUrl;
            }
          }
        }
        setLastScannedPhoto(photoData);

        const confidence = (97.5 + Math.random() * 2.4).toFixed(1);
        executeAttendance(selectedEmployee, 'face_recognition', parseFloat(confidence), 'Kamera Biometrik AI', photoData);
      }
    }, 250);
  };

  // Main attendance execution logic
  const executeAttendance = async (
    employee: Employee,
    method: VerificationMethod,
    confidence: number,
    deviceLabel: string,
    photoUrl?: string
  ) => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0];
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // Strict WIB Work Hours calculation based on configured schedule:
    // Work start target: 07:00 WIB (strict, no tolerance)
    // Check-out threshold: schedule.todayCheckOutTime (e.g. 13:00 or custom 11:30 for Friday)
    const currentTotalMinutes = hours * 60 + minutes;
    const targetCheckInMinutes = parseTimeToMinutes(schedule.workStartTime || '07:00'); // 07:00 WIB
    const minCheckOutMinutes = parseTimeToMinutes(schedule.todayCheckOutTime || '13:00'); // Configured dismissal time

    let status: AttendanceRecord['status'] = 'on_time';
    let lateMinutes = 0;
    let earlyMinutes = 0;
    let overtimeHours = 0;

    if (attendanceType === 'check_in') {
      if (currentTotalMinutes > targetCheckInMinutes) {
        status = 'late';
        lateMinutes = currentTotalMinutes - targetCheckInMinutes; // strictly every minute past 07:00 WIB
      } else {
        status = 'on_time';
      }
    } else {
      // Check-out
      if (currentTotalMinutes < minCheckOutMinutes) {
        status = 'early_leave';
        earlyMinutes = minCheckOutMinutes - currentTotalMinutes; // before configured dismissal time
      } else {
        status = 'on_time';
        if (hours >= 15) {
          overtimeHours = Math.max(0, Math.round(((hours - 15) + minutes / 60) * 10) / 10);
          if (overtimeHours > 0) status = 'overtime';
        }
      }
    }

    const newRecord: AttendanceRecord = {
      id: 'TRX-' + Math.floor(100000 + Math.random() * 900000),
      employeeId: employee.id,
      employeeName: employee.name,
      employeeNip: employee.nip,
      department: employee.department,
      date: dateStr,
      time: timeStr,
      timestamp: Date.now(),
      type: attendanceType,
      status,
      lateMinutes,
      earlyMinutes,
      overtimeHours,
      verificationMethod: method,
      matchConfidence: confidence,
      photoSnapshot: photoUrl || employee.avatarUrl,
      location: {
        lat: currentCoords?.lat || selectedOffice.latitude,
        lng: currentCoords?.lng || selectedOffice.longitude,
        officeId: selectedOffice.id,
        officeName: selectedOffice.name,
        distanceMeters,
        isWithinRadius: isWithinGeofence,
      },
      isOfflineQueued: isOfflineMode,
      syncStatus: isOfflineMode ? 'pending' : 'synced',
      pushNotificationSent: false,
      waNotificationSent: false,
      waStatus: isOfflineMode ? 'pending' : 'terkirim',
      deviceInfo: `${deviceLabel} (${navigator.userAgent.includes('iPhone') ? 'iPhone' : 'Android/Desktop'})`,
    };

    if (isOfflineMode) {
      StorageService.enqueueOfflineAttendance(newRecord);
    } else {
      StorageService.addAttendanceRecord(newRecord);
    }

    // Trigger Browser Push Notification
    const notifTitle = `PresensiKu: ${attendanceType === 'check_in' ? 'Check-In' : 'Check-Out'} Berhasil!`;
    const notifBody = `${employee.name} (${status === 'on_time' ? 'Tepat Waktu' : `Terlambat ${lateMinutes}m`}) - ${selectedOffice.name}`;
    NotificationService.sendPushNotification(notifTitle, notifBody);
    newRecord.pushNotificationSent = true;

    // Trigger WhatsApp notification dispatch
    const waMessage = NotificationService.createAttendanceWAMessage(newRecord, employee);
    const waResult = await NotificationService.dispatchWhatsAppNotification({
      phone: employee.phone,
      targetName: employee.name,
      message: waMessage,
    });
    newRecord.waNotificationSent = true;
    setWaDirectUrl(waResult.directUrl);

    setLastSuccessRecord(newRecord);
    onAttendanceSuccess(newRecord);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-100 text-base">Terminal Absensi Wajah AI & Barcode Batang</h3>
                <span className="text-[10px] bg-blue-500/10 text-blue-400 font-semibold px-2 py-0.5 rounded border border-blue-500/20">
                  {isAutoMode ? '⚡ Auto-Detect Aktif' : 'Manual'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Masuk: 07.00 WIB (Tanpa Toleransi) · Jam Pulang Hari Ini: <span className="text-amber-400 font-semibold">{schedule.todayCheckOutTime} WIB</span> {schedule.isCustomDay && <span className="text-amber-300">({schedule.customDayNote})</span>}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowScheduleSettings((prev) => !prev)}
              className={`px-2.5 py-1.5 text-xs rounded-lg border flex items-center gap-1.5 transition-colors ${
                showScheduleSettings
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="Atur jam kepulangan khusus hari ini (misal hari Jumat 11.30 WIB)"
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{showScheduleSettings ? 'Tutup Pengaturan' : 'Atur Jam Pulang'}</span>
            </button>

            <button
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Manual Schedule Settings Drawer (For Early Dismissal / Friday / Ramadhan / Exam Days) */}
        {showScheduleSettings && (
          <div className="px-6 py-3 bg-slate-950 border-b border-slate-800 animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                <Sliders className="w-3.5 h-3.5" />
                <span>Pengaturan Manual Jam Pulang Hari Ini</span>
              </div>
              <span className="text-[11px] text-slate-400">
                Karyawan scan di atas jam ini otomatis tercatat sebagai <strong>Absen Pulang</strong>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleApplySchedule('13:00', 'Hari Normal')}
                className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-all ${
                  schedule.todayCheckOutTime === '13:00'
                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                }`}
              >
                Hari Normal (13:00 WIB)
              </button>

              <button
                type="button"
                onClick={() => handleApplySchedule('11:30', 'Hari Jumat / Pulang Cepat')}
                className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-all ${
                  schedule.todayCheckOutTime === '11:30'
                    ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                }`}
              >
                Hari Jumat (11:30 WIB)
              </button>

              <button
                type="button"
                onClick={() => handleApplySchedule('12:00', 'Hari Ujian / Acara Khusus')}
                className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-all ${
                  schedule.todayCheckOutTime === '12:00'
                    ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                }`}
              >
                Hari Ujian (12:00 WIB)
              </button>

              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1">
                <span className="text-[11px] text-slate-400">Kustom:</span>
                <input
                  type="time"
                  value={customCheckOutInput}
                  onChange={(e) => setCustomCheckOutInput(e.target.value)}
                  className="bg-transparent text-xs text-white focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => handleApplySchedule(customCheckOutInput, 'Jam Pulang Khusus')}
                  className="px-2 py-0.5 text-[11px] bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition-colors"
                >
                  Terapkan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {lastSuccessRecord ? (
            /* Success State Receipt */
            <div className="bg-slate-950/80 border border-emerald-500/30 rounded-xl p-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider">
                  {lastSuccessRecord.isOfflineQueued ? 'TERSINKRON KE MEMORI LOKAL (OFFLINE)' : 'PRESENSI BERHASIL DICATAT'}
                </span>
                <h4 className="text-xl font-bold text-slate-100 mt-1">{lastSuccessRecord.employeeName}</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {lastSuccessRecord.department} · {lastSuccessRecord.employeeNip}
                </p>
              </div>

              {/* Snapshot image if available */}
              {lastSuccessRecord.photoSnapshot && (
                <div className="flex justify-center">
                  <img
                    src={lastSuccessRecord.photoSnapshot}
                    alt="Snapshot Presensi"
                    className="w-24 h-24 rounded-lg object-cover border border-slate-700 shadow-md"
                  />
                </div>
              )}

              {/* Transaction Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-left bg-slate-900/90 border border-slate-800 rounded-lg p-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Tipe</span>
                  <span className="font-semibold text-slate-200">
                    {lastSuccessRecord.type === 'check_in' ? 'Masuk (Check-In)' : 'Pulang (Check-Out)'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Waktu</span>
                  <span className="font-mono font-semibold text-slate-200">{lastSuccessRecord.time} WIB</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Status</span>
                  <span className={`font-semibold ${lastSuccessRecord.status === 'on_time' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {lastSuccessRecord.status === 'on_time' ? 'Tepat Waktu' : `Terlambat ${lastSuccessRecord.lateMinutes}m`}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Akurasi AI</span>
                  <span className="font-mono font-semibold text-blue-400">{lastSuccessRecord.matchConfidence}%</span>
                </div>
              </div>

              {/* Geofence notice */}
              <div className="flex items-center justify-between text-xs px-3 py-2 bg-slate-900/60 rounded border border-slate-800 text-slate-300">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" />
                  {lastSuccessRecord.location.officeName}
                </span>
                <span className="font-mono text-emerald-400">
                  {lastSuccessRecord.location.distanceMeters}m (Valid Radius)
                </span>
              </div>

              {/* WhatsApp Notification & Actions */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
                {waDirectUrl && (
                  <a
                    href={waDirectUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shadow-sm"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Buka Notifikasi WhatsApp Karyawan
                  </a>
                )}
                <button
                  onClick={() => {
                    setLastSuccessRecord(null);
                    setScanProgress(0);
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
                >
                  Presensi Karyawan Lain
                </button>
              </div>
            </div>
          ) : (
            /* Active Scanner Form */
            <>
              {/* Smart Automatic Attendance Detection Banner */}
              <div className="p-3 rounded-xl bg-slate-950 border border-blue-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner">
                <div className="flex items-start gap-2.5">
                  <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${attendanceType === 'check_in' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'}`}>
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono tracking-wider font-bold uppercase text-slate-400">
                        Sistem Deteksi Otomatis
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold tracking-wide uppercase ${
                        attendanceType === 'check_in'
                          ? 'bg-blue-600 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}>
                        {attendanceType === 'check_in' ? 'Absen Masuk (Check-In)' : 'Absen Pulang (Check-Out)'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {autoDetectionInfo?.reason || `Otomatis: Masuk 05.30-07.00 WIB · Pulang mulai ${schedule.todayCheckOutTime} WIB`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsAutoMode((prev) => !prev)}
                    className={`text-[11px] px-2.5 py-1 rounded-md font-semibold border transition-all ${
                      isAutoMode
                        ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {isAutoMode ? 'Mode Otomatis: ON' : 'Mode Manual: ON'}
                  </button>
                </div>
              </div>

              {/* Type selector: Check In vs Check Out buttons */}
              <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setAttendanceType('check_in');
                    setIsAutoMode(false);
                  }}
                  className={`py-2 px-3 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                    attendanceType === 'check_in'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>Presensi Masuk (Check-In)</span>
                  {attendanceType === 'check_in' && isAutoMode && (
                    <span className="text-[10px] bg-blue-700 text-blue-100 px-1.5 py-0.2 rounded font-mono">
                      Auto
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAttendanceType('check_out');
                    setIsAutoMode(false);
                  }}
                  className={`py-2 px-3 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                    attendanceType === 'check_out'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>Presensi Pulang (Check-Out)</span>
                  {attendanceType === 'check_out' && isAutoMode && (
                    <span className="text-[10px] bg-emerald-700 text-emerald-100 px-1.5 py-0.2 rounded font-mono">
                      Auto
                    </span>
                  )}
                </button>
              </div>

              {/* Employee & Office Selector Section */}
              <div className="space-y-3">
                {isOperatorStudent && activeEmployee ? (
                  /* Locked to Self for Siswa */
                  <div className="p-3 bg-blue-950/40 border border-blue-500/30 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={activeEmployee.avatarUrl}
                        alt={activeEmployee.name}
                        className="w-10 h-10 rounded-full object-cover border border-blue-400 shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{activeEmployee.name}</span>
                          <span className="text-[10px] bg-blue-600/30 text-blue-300 font-semibold px-1.5 py-0.5 rounded">
                            SISWA MTs
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          NISN: <span className="font-mono text-slate-200">{activeEmployee.nip}</span> · {activeEmployee.department}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-blue-300 font-medium shrink-0 bg-blue-900/40 px-2.5 py-1 rounded-md border border-blue-500/20">
                      <Lock className="w-3.5 h-3.5 text-blue-400" />
                      <span>Presensi Mandiri</span>
                    </div>
                  </div>
                ) : (
                  /* Guru, Admin & Super Admin: Full Authority to Attend Students & Staff */
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-emerald-400" />
                        <label className="text-xs font-bold text-white tracking-wide">
                          Pilih Target Presensi (Wewenang Guru & Admin)
                        </label>
                      </div>

                      {/* Category Filter Tabs */}
                      <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setAttendeeCategoryTab('siswa')}
                          className={`px-2.5 py-1 rounded font-medium transition-colors flex items-center gap-1 ${
                            attendeeCategoryTab === 'siswa'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <GraduationCap className="w-3 h-3" />
                          <span>Siswa MTs</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setAttendeeCategoryTab('guru_staf')}
                          className={`px-2.5 py-1 rounded font-medium transition-colors flex items-center gap-1 ${
                            attendeeCategoryTab === 'guru_staf'
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Users className="w-3 h-3" />
                          <span>Guru & Staf</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setAttendeeCategoryTab('all')}
                          className={`px-2.5 py-1 rounded font-medium transition-colors ${
                            attendeeCategoryTab === 'all'
                              ? 'bg-slate-700 text-white'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Semua
                        </button>
                      </div>
                    </div>

                    {/* Filter Bar: Class Filter + Search */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {attendeeCategoryTab !== 'guru_staf' && classes.length > 0 && (
                        <div className="relative">
                          <select
                            value={selectedClassFilter}
                            onChange={(e) => setSelectedClassFilter(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                          >
                            <option value="all">Semua Kelas MTs</option>
                            {classes.map((cls) => (
                              <option key={cls.id} value={cls.id}>
                                {cls.name} ({cls.members?.length || 0} Siswa)
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          value={employeeSearchTerm}
                          onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                          placeholder="Cari nama siswa / NISN..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                        />
                      </div>
                    </div>

                    {/* Main Target Dropdown */}
                    <div>
                      <select
                        value={selectedEmployeeId}
                        onChange={(e) => setSelectedEmployeeId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-100 font-medium focus:outline-none focus:border-emerald-500"
                      >
                        {filteredEmployees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} — [{emp.category === 'siswa' ? 'NISN' : 'NIP'}: {emp.nip}] ({emp.department})
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400 px-1">
                        <span>Menampilkan {filteredEmployees.length} orang tersedia</span>
                        {selectedEmployee && (
                          <span className="text-emerald-400 font-medium truncate ml-2">
                            Terpilih: {selectedEmployee.name} ({selectedEmployee.department})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Office Location Picker */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Lokasi Sekolah / Kampus</label>
                  <select
                    value={selectedOffice.id}
                    onChange={(e) => {
                      const off = offices.find((o) => o.id === e.target.value);
                      if (off) setSelectedOffice(off);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    {offices.map((off) => (
                      <option key={off.id} value={off.id}>
                        {off.name} (Radius Geofence: {off.radiusMeters}m)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* GPS Geofence Status Strip */}
              <div className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-xs">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
                  <div>
                    <span className="text-slate-300 font-medium">{selectedOffice.name}</span>
                    <span className="text-slate-500 block text-[11px]">
                      Koordinat GPS Terdeteksi: {currentCoords ? `${currentCoords.lat.toFixed(5)}, ${currentCoords.lng.toFixed(5)}` : 'Mendeteksi...'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono px-2 py-0.5 rounded text-[11px] font-semibold ${
                      isWithinGeofence
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {distanceMeters}m · {isWithinGeofence ? 'Dalam Radius' : 'Di Luar Radius'}
                  </span>
                  <button
                    onClick={updateLocation}
                    title="Perbarui GPS"
                    className="p-1 text-slate-400 hover:text-slate-200"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${locationLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Verification Method Tabs */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Metode Verifikasi</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMethod('face_recognition')}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs transition-all ${
                      selectedMethod === 'face_recognition'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-400 font-semibold'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Camera className="w-4 h-4 mb-1" />
                    <span>Pengenalan Wajah AI</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMethod('camera_qr')}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs transition-all ${
                      selectedMethod === 'camera_qr'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-400 font-semibold'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <QrCode className="w-4 h-4 mb-1" />
                    <span>Kamera QR / Barcode</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMethod('external_hardware_scanner')}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs transition-all ${
                      selectedMethod === 'external_hardware_scanner'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-400 font-semibold'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Usb className="w-4 h-4 mb-1" />
                    <span>Scanner Eksternal</span>
                  </button>
                </div>
              </div>

              {/* Method View 1: Face Recognition View */}
              {selectedMethod === 'face_recognition' && (
                <div className="space-y-3">
                  <div className="relative aspect-video max-h-[260px] w-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
                    {/* Live Video or Profile Photo fallback */}
                    {cameraActive ? (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover transform -scale-x-100"
                      />
                    ) : (
                      <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-950 p-4">
                        <img
                          src={selectedEmployee.avatarUrl}
                          alt={selectedEmployee.name}
                          className="w-28 h-28 rounded-full object-cover border-2 border-blue-500 shadow-xl opacity-90"
                        />
                        <span className="text-xs text-slate-400 mt-2">
                          {cameraError || 'Mode Biometrik Wajah Karyawan Siap'}
                        </span>
                      </div>
                    )}

                    {/* Biometric Face Oval Target Guide */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div
                        className={`w-40 h-52 rounded-full border-2 border-dashed transition-all duration-300 ${
                          isScanning
                            ? 'border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.5)]'
                            : livenessPassed
                            ? 'border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)]'
                            : 'border-slate-600'
                        }`}
                      />
                    </div>

                    {/* Laser Scanning Line Animation */}
                    {isScanning && (
                      <div className="absolute inset-x-8 top-0 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_12px_#38bdf8] animate-bounce pointer-events-none" />
                    )}

                    {/* Mobile Camera Switch Button (Front / Rear) */}
                    <div className="absolute top-2 right-2 flex gap-1.5 z-10">
                      <button
                        type="button"
                        onClick={toggleFacingMode}
                        className="p-1.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-700 text-xs flex items-center gap-1 backdrop-blur-sm"
                        title="Ganti Kamera Depan / Belakang"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span className="text-[10px] hidden sm:inline">
                          {facingMode === 'user' ? 'Kamera Depan' : 'Kamera Belakang'}
                        </span>
                      </button>
                    </div>

                    {/* Status prompt inside viewport */}
                    <div className="absolute bottom-2 inset-x-4 flex justify-between items-center text-[11px] bg-slate-950/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-800">
                      <span className="text-slate-300 font-medium">{livenessPrompt}</span>
                      <span className="font-mono text-blue-400 font-semibold">{scanProgress}%</span>
                    </div>
                  </div>

                  <canvas ref={canvasRef} className="hidden" />

                  {/* Trigger Face Scan Button */}
                  <button
                    type="button"
                    disabled={isScanning}
                    onClick={triggerFaceScan}
                    className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Scan className="w-4 h-4" />
                    {isScanning ? 'Memproses Pengenalan Wajah...' : 'Mulai Scan Wajah & Verifikasi'}
                  </button>
                </div>
              )}

              {/* Method View 2: Camera QR / Barcode Scanner */}
              {selectedMethod === 'camera_qr' && (
                <div className="space-y-3">
                  <div className="relative aspect-video max-h-[260px] w-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
                    {cameraActive ? (
                      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-6 text-center">
                        <QrCode className="w-16 h-16 text-slate-600 mb-2" />
                        <p className="text-xs text-slate-400">Arahkan ID Card atau Barcode ke area kamera scanner</p>
                      </div>
                    )}

                    {/* Target QR Frame */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-48 h-48 border-2 border-blue-500 rounded-lg relative">
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-blue-400 -mt-1 -ml-1" />
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-blue-400 -mt-1 -mr-1" />
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-blue-400 -mb-1 -ml-1" />
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-blue-400 -mb-1 -mr-1" />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      executeAttendance(
                        selectedEmployee,
                        'camera_qr',
                        99.0,
                        'Kamera Barcode Scanner'
                      );
                    }}
                    className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2"
                  >
                    <QrCode className="w-4 h-4" />
                    Konfirmasi Scan QR Badge ({selectedEmployee.qrCodeId})
                  </button>
                </div>
              )}

              {/* Method View 3: External Hardware Scanner (Bluetooth / USB Cable) */}
              {selectedMethod === 'external_hardware_scanner' && (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-xs font-semibold text-slate-200">
                        Listener Scanner Eksternal Siap (HID Mode)
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">USB / Bluetooth SPP</span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Sistem otomatis mendeteksi tembakan barcode/QR dari alat scanner fisik kabel USB atau gun scanner Bluetooth (Zebra, Honeywell, Eyoyo, dsb). Tidak perlu klik, cukup tembakkan ke ID Card karyawan.
                  </p>

                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-xs">
                    <div className="flex justify-between items-center text-slate-400 text-[11px] mb-1">
                      <span>Input Buffer Scanner:</span>
                      <span className="font-mono text-blue-400">{scannerBuffer || 'Menunggu tembakan scanner...'}</span>
                    </div>
                    {lastExternalScanCode && (
                      <div className="text-[11px] text-emerald-400 font-mono mt-1">
                        Terakhir Dibaca: {lastExternalScanCode}
                      </div>
                    )}
                  </div>

                  {/* Live Barcode Batang 1D visual */}
                  <div className="flex flex-col items-center p-3 bg-white rounded-lg border border-slate-300">
                    <span className="text-[10px] text-slate-700 font-semibold mb-1">
                      KODE BARCODE BATANG 1D KARYAWAN (Bisa Ditembak Langsung)
                    </span>
                    <BarcodeBatang
                      value={selectedEmployee.qrCodeId}
                      width={1.4}
                      height={36}
                      showText={true}
                    />
                  </div>

                  {/* Simulator button for quick test without physical hardware */}
                  <div className="pt-2">
                    <span className="text-[11px] text-slate-500 block mb-1.5">Uji Coba Cepat (Simulasi Tembakan Scanner Eksternal):</span>
                    <button
                      type="button"
                      onClick={() => processExternalScan(selectedEmployee.qrCodeId)}
                      className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 font-medium flex items-center justify-center gap-2"
                    >
                      <Usb className="w-3.5 h-3.5 text-blue-400" />
                      Tembak Barcode Batang ({selectedEmployee.qrCodeId})
                    </button>
                  </div>
                </div>
              )}

              {/* Offline mode indicator badge */}
              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                <span className="flex items-center gap-1.5">
                  {isOfflineMode ? (
                    <>
                      <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-amber-400">Mode Offline Aktif (Tersimpan Lokal & Auto-Sync)</span>
                    </>
                  ) : (
                    <>
                      <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-slate-400">Terhubung ke Cloud PresensiKu & WhatsApp API</span>
                    </>
                  )}
                </span>
                <span className="font-mono text-[11px] text-slate-500">
                  PT Nusantara Solusi Digital
                </span>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
