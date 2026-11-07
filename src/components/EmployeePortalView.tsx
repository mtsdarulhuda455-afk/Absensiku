import React, { useState } from 'react';
import { 
  User, 
  Scan, 
  MapPin, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Printer, 
  ShieldCheck, 
  Smartphone,
  MessageSquare,
  GraduationCap,
  Users,
  Search,
  CheckCheck,
  Sparkles,
  ArrowRight,
  Filter,
  Check,
  QrCode
} from 'lucide-react';
import { Employee, AttendanceRecord, OfficeLocation, SchoolClass, AttendanceType } from '../types/attendance';
import { StorageService, formatMinutes } from '../services/storage';
import { BarcodeBatang, generateBarcodeSvg } from './BarcodeBatang';

interface EmployeePortalViewProps {
  employee: Employee;
  attendanceRecords: AttendanceRecord[];
  offices: OfficeLocation[];
  onOpenScanner: (targetEmployeeId?: string) => void;
  allEmployees?: Employee[];
  classes?: SchoolClass[];
  onAttendanceSuccess?: (record: AttendanceRecord) => void;
}

export const EmployeePortalView: React.FC<EmployeePortalViewProps> = ({
  employee,
  attendanceRecords,
  offices,
  onOpenScanner,
  allEmployees = [],
  classes = [],
  onAttendanceSuccess,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  
  const isTeacher = employee.role === 'guru' || employee.category === 'guru';
  const isStudent = employee.role === 'siswa' || employee.category === 'siswa';
  const isAdminOrSuper = employee.role === 'admin' || employee.role === 'super_admin' || employee.category === 'admin' || employee.category === 'super_admin';

  // Find homeroom class for this teacher if applicable
  const homeroomClass = classes.find(
    (c) => c.homeroomTeacherId === employee.id || c.homeroomTeacherName?.toLowerCase() === employee.name.toLowerCase()
  );

  // State for teacher student attendance view
  const [selectedClassId, setSelectedClassId] = useState<string>(
    homeroomClass?.id || (classes.length > 0 ? classes[0].id : 'all')
  );
  const [studentSearchTerm, setStudentSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unattended' | 'checked_in' | 'checked_out'>('all');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Records for this employee
  const myRecords = attendanceRecords.filter((r) => r.employeeId === employee.id);
  const todayCheckIn = myRecords.find((r) => r.date === todayStr && r.type === 'check_in');
  const todayCheckOut = myRecords.find((r) => r.date === todayStr && r.type === 'check_out');

  // Calculate monthly time accumulation for this employee
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const accumulations = StorageService.getMonthlyAccumulations([employee], attendanceRecords, currentMonth, currentYear);
  const mySummary = accumulations[0];

  // Student list for Teacher & Admin to perform attendance
  const studentEmployees = allEmployees.filter(
    (e) => e.category === 'siswa' || e.role === 'siswa'
  );

  const activeClassObj = classes.find((c) => c.id === selectedClassId);

  const filteredStudents = studentEmployees.filter((student) => {
    // Filter by class
    if (selectedClassId !== 'all') {
      const matchClassId = student.classId === selectedClassId;
      const matchDept = activeClassObj && student.department?.toLowerCase().includes(activeClassObj.name.toLowerCase());
      const matchMember = activeClassObj?.members?.some((m) => m.id === student.id || m.nisn === student.nip);
      if (!matchClassId && !matchDept && !matchMember) {
        return false;
      }
    }

    // Filter by search query
    if (studentSearchTerm.trim()) {
      const q = studentSearchTerm.toLowerCase();
      const matchName = student.name.toLowerCase().includes(q);
      const matchNip = student.nip.toLowerCase().includes(q);
      if (!matchName && !matchNip) return false;
    }

    // Filter by attendance status today
    const studentCheckIn = attendanceRecords.find(
      (r) => r.employeeId === student.id && r.date === todayStr && r.type === 'check_in'
    );
    const studentCheckOut = attendanceRecords.find(
      (r) => r.employeeId === student.id && r.date === todayStr && r.type === 'check_out'
    );

    if (statusFilter === 'unattended') {
      if (studentCheckIn) return false;
    } else if (statusFilter === 'checked_in') {
      if (!studentCheckIn) return false;
    } else if (statusFilter === 'checked_out') {
      if (!studentCheckOut) return false;
    }

    return true;
  });

  // Action: Mark single student attendance directly
  const handleDirectAttendStudent = (student: Employee, type: AttendanceType) => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    let status: 'on_time' | 'late' | 'early_leave' = 'on_time';
    let lateMinutes = 0;
    let earlyMinutes = 0;

    if (type === 'check_in') {
      // 07:00 WIB threshold
      if (nowMinutes > 7 * 60) {
        status = 'late';
        lateMinutes = nowMinutes - 7 * 60;
      } else {
        status = 'on_time';
        lateMinutes = 0;
      }
    } else {
      // 13:00 WIB threshold
      if (nowMinutes < 13 * 60) {
        status = 'early_leave';
        earlyMinutes = 13 * 60 - nowMinutes;
      } else {
        status = 'on_time';
        earlyMinutes = 0;
      }
    }

    const defaultOffice = offices[0] || {
      id: 'off-sekolah',
      name: 'Gedung Utama MTs Darul Huda',
      latitude: -6.22485,
      longitude: 106.80952,
      radiusMeters: 100,
    };

    const newRecord: AttendanceRecord = {
      id: 'TRX-' + Math.floor(100000 + Math.random() * 900000),
      employeeId: student.id,
      employeeName: student.name,
      employeeNip: student.nip,
      department: student.department,
      date: dateStr,
      time: timeStr,
      timestamp: Date.now(),
      type,
      status,
      lateMinutes,
      earlyMinutes,
      overtimeHours: 0,
      verificationMethod: 'biometric_fingerprint',
      matchConfidence: 99.8,
      photoSnapshot: student.avatarUrl,
      location: {
        lat: defaultOffice.latitude,
        lng: defaultOffice.longitude,
        officeId: defaultOffice.id,
        officeName: defaultOffice.name,
        distanceMeters: 8,
        isWithinRadius: true,
      },
      isOfflineQueued: false,
      syncStatus: 'synced',
      pushNotificationSent: true,
      waNotificationSent: true,
      waStatus: 'terkirim',
      deviceInfo: `Wewenang Guru (${employee.name})`,
      notes: `Diabsenkan langsung oleh Guru: ${employee.name}`,
    };

    StorageService.addAttendanceRecord(newRecord);
    onAttendanceSuccess?.(newRecord);

    setActionFeedback(
      `Presensi ${type === 'check_in' ? 'Masuk' : 'Pulang'} berhasil dicatat untuk ${student.name} (${status === 'on_time' ? 'Tepat Waktu' : `Terlambat ${lateMinutes}m`}).`
    );
    setTimeout(() => setActionFeedback(null), 4000);
  };

  // Action: Bulk attend all un-checked-in students in current class view
  const handleBulkAttendClass = () => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const isLate = nowMinutes > 7 * 60;
    const lateMinutes = isLate ? nowMinutes - 7 * 60 : 0;
    const status = isLate ? 'late' : 'on_time';

    const defaultOffice = offices[0] || {
      id: 'off-sekolah',
      name: 'Gedung Utama MTs Darul Huda',
      latitude: -6.22485,
      longitude: 106.80952,
      radiusMeters: 100,
    };

    let count = 0;
    filteredStudents.forEach((student) => {
      const alreadyCheckedIn = attendanceRecords.some(
        (r) => r.employeeId === student.id && r.date === dateStr && r.type === 'check_in'
      );
      if (!alreadyCheckedIn) {
        const record: AttendanceRecord = {
          id: 'TRX-' + Math.floor(100000 + Math.random() * 900000),
          employeeId: student.id,
          employeeName: student.name,
          employeeNip: student.nip,
          department: student.department,
          date: dateStr,
          time: timeStr,
          timestamp: Date.now(),
          type: 'check_in',
          status,
          lateMinutes,
          earlyMinutes: 0,
          overtimeHours: 0,
          verificationMethod: 'biometric_fingerprint',
          matchConfidence: 100,
          photoSnapshot: student.avatarUrl,
          location: {
            lat: defaultOffice.latitude,
            lng: defaultOffice.longitude,
            officeId: defaultOffice.id,
            officeName: defaultOffice.name,
            distanceMeters: 5,
            isWithinRadius: true,
          },
          isOfflineQueued: false,
          syncStatus: 'synced',
          pushNotificationSent: true,
          waNotificationSent: true,
          waStatus: 'terkirim',
          deviceInfo: `Presensi Kolektif Guru (${employee.name})`,
          notes: `Presensi Cepat Kolektif oleh Guru: ${employee.name}`,
        };
        StorageService.addAttendanceRecord(record);
        onAttendanceSuccess?.(record);
        count++;
      }
    });

    setActionFeedback(`Berhasil mencatat presensi masuk untuk ${count} siswa sekaligus.`);
    setTimeout(() => setActionFeedback(null), 5000);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <img
            src={employee.avatarUrl}
            alt={employee.name}
            className="w-12 h-12 rounded-full object-cover border-2 border-blue-500 shadow-md"
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-white">
                {isStudent ? `Dasbor Siswa: ${employee.name}` : isTeacher ? `Dasbor Guru: ${employee.name}` : employee.name}
              </h2>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                isStudent ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-500/20 text-blue-300'
              }`}>
                {employee.category === 'siswa' ? 'SISWA MTs' : employee.category === 'guru' ? 'DEWAN GURU' : employee.category}
              </span>
              {homeroomClass && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Wali Kelas: {homeroomClass.name}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isStudent ? 'NISN' : 'NIP'}: {employee.nip} · {employee.position} ({employee.department})
            </p>
          </div>
        </div>

        <button
          onClick={() => onOpenScanner(employee.id)}
          className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md shrink-0 cursor-pointer"
        >
          <Scan className="w-4 h-4" />
          <span>{isStudent ? 'Lakukan Presensi Mandiri' : 'Buka Terminal Absensi'}</span>
        </button>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs rounded-xl flex items-center justify-between gap-2 shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-emerald-400 hover:text-emerald-200 text-[11px] font-semibold"
          >
            Tutup
          </button>
        </div>
      )}

      {/* SECTION KHUSUS GURU: Presensi Siswa Kelas (Wewenang Guru & Wali Kelas) */}
      {(isTeacher || isAdminOrSuper) && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-600/20 text-emerald-400 rounded-lg">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Presensi Siswa Kelas
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded border border-emerald-500/30">
                      Wewenang Guru & Wali Kelas
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Guru dapat melakukan absensi masuk, absen pulang, atau scan kartu barcode langsung untuk seluruh siswa.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Bulk Attend Action */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBulkAttendClass}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-colors cursor-pointer"
                title="Hadirkan semua siswa di filter ini yang belum absen masuk hari ini"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Presensi Cepat: Hadirkan Seluruh Siswa Hari Ini</span>
              </button>
            </div>
          </div>

          {/* Filter Bar: Class Selector, Search, and Status Tabs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Class Dropdown */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Pilih Kelas</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-medium"
              >
                <option value="all">Semua Kelas MTs</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} {cls.homeroomTeacherId === employee.id ? '★ (Kelas Bimbingan Anda)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Cari Nama Siswa / NISN</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={studentSearchTerm}
                  onChange={(e) => setStudentSearchTerm(e.target.value)}
                  placeholder="Ketik nama atau NISN siswa..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Status Filter Tabs */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Status Kehadiran Hari Ini</label>
              <div className="grid grid-cols-4 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px] text-center">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`py-1 rounded font-medium transition-colors ${
                    statusFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('unattended')}
                  className={`py-1 rounded font-medium transition-colors ${
                    statusFilter === 'unattended' ? 'bg-rose-950 text-rose-300' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Belum
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('checked_in')}
                  className={`py-1 rounded font-medium transition-colors ${
                    statusFilter === 'checked_in' ? 'bg-blue-950 text-blue-300' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Masuk
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('checked_out')}
                  className={`py-1 rounded font-medium transition-colors ${
                    statusFilter === 'checked_out' ? 'bg-teal-950 text-teal-300' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Pulang
                </button>
              </div>
            </div>
          </div>

          {/* Student List Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/60">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-medium">
                  <th className="py-3 px-4">Nama Siswa</th>
                  <th className="py-3 px-3">NISN & Kelas</th>
                  <th className="py-3 px-3">Absen Masuk (07.00 WIB)</th>
                  <th className="py-3 px-3">Absen Pulang (13.00 WIB)</th>
                  <th className="py-3 px-4 text-right">Aksi Absensi Guru</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      Tidak ada data siswa yang cocok dengan filter atau kelas ini.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => {
                    const studentCheckIn = attendanceRecords.find(
                      (r) => r.employeeId === student.id && r.date === todayStr && r.type === 'check_in'
                    );
                    const studentCheckOut = attendanceRecords.find(
                      (r) => r.employeeId === student.id && r.date === todayStr && r.type === 'check_out'
                    );

                    return (
                      <tr key={student.id} className="hover:bg-slate-900/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={student.avatarUrl}
                              alt={student.name}
                              className="w-9 h-9 rounded-full object-cover border border-slate-700 shrink-0"
                            />
                            <div>
                              <span className="font-semibold text-slate-100 block">{student.name}</span>
                              <span className="text-[11px] text-slate-400">{student.phone ? `WA: ${student.phone}` : 'No WA Wali'}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-mono text-slate-300 block">{student.nip}</span>
                          <span className="text-[11px] text-emerald-400 font-medium">{student.department}</span>
                        </td>

                        <td className="py-3 px-3">
                          {studentCheckIn ? (
                            <div>
                              <span className="font-mono font-bold text-white text-xs">{studentCheckIn.time} WIB</span>
                              <span className={`block text-[10px] font-semibold ${
                                studentCheckIn.status === 'on_time' ? 'text-emerald-400' : 'text-amber-400'
                              }`}>
                                {studentCheckIn.status === 'on_time' ? '✓ Tepat Waktu' : `Terlambat +${studentCheckIn.lateMinutes}m`}
                              </span>
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-rose-950/60 text-rose-400 border border-rose-900/40">
                              Belum Masuk
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          {studentCheckOut ? (
                            <div>
                              <span className="font-mono font-bold text-white text-xs">{studentCheckOut.time} WIB</span>
                              <span className={`block text-[10px] font-semibold ${
                                studentCheckOut.status === 'early_leave' ? 'text-rose-400' : 'text-teal-400'
                              }`}>
                                {studentCheckOut.status === 'early_leave' ? `Pulang Awal (-${studentCheckOut.earlyMinutes}m)` : '✓ Selesai'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[11px]">Belum Pulang</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!studentCheckIn ? (
                              <button
                                type="button"
                                onClick={() => handleDirectAttendStudent(student, 'check_in')}
                                className="px-2.5 py-1 text-[11px] font-semibold rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer shadow-sm"
                                title="Catat kehadiran masuk siswa ini sekarang"
                              >
                                Absen Masuk
                              </button>
                            ) : !studentCheckOut ? (
                              <button
                                type="button"
                                onClick={() => handleDirectAttendStudent(student, 'check_out')}
                                className="px-2.5 py-1 text-[11px] font-semibold rounded bg-teal-600 hover:bg-teal-500 text-white transition-colors cursor-pointer shadow-sm"
                                title="Catat absensi pulang siswa ini"
                              >
                                Absen Pulang
                              </button>
                            ) : (
                              <span className="text-[11px] text-emerald-400 font-semibold px-2 py-0.5 bg-emerald-950/40 rounded border border-emerald-900/30">
                                Lengkap
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => onOpenScanner(student.id)}
                              className="px-2.5 py-1 text-[11px] font-medium rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 flex items-center gap-1 transition-colors cursor-pointer"
                              title="Buka pemindai barcode / kamera khusus siswa ini"
                            >
                              <Scan className="w-3 h-3" />
                              <span>Scan Barcode</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main Grid: ID Card & Status Pribadi Pegawai / Siswa */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Digital ID Badge with 1D Barcode Batang */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col items-center text-center relative overflow-hidden shadow-xl">
          <div className="w-full flex justify-between items-center text-[10px] text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2 mb-4">
            <span>SISTEM ABSENSIKU</span>
            <span className="text-emerald-400 font-semibold font-mono">TERDAFTAR</span>
          </div>

          <div className="relative mb-3">
            <img
              src={employee.avatarUrl}
              alt={employee.name}
              className="w-24 h-24 rounded-full object-cover border-4 border-slate-800 shadow-lg"
            />
            <div className="absolute bottom-0 right-0 p-1 bg-blue-600 rounded-full text-white shadow" title="Biometrik Wajah Terdaftar">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>

          <h3 className="font-bold text-slate-100 text-base">{employee.name}</h3>
          <span className="text-xs text-blue-400 font-medium">{employee.position}</span>
          <span className="text-[11px] font-mono text-slate-400 mt-0.5">
            {isStudent ? 'NISN' : 'NIP'}: {employee.nip}
          </span>

          {/* 1D Linear Barcode Batang representation */}
          <div className="mt-4 p-2.5 bg-white rounded-lg shadow-inner flex flex-col items-center border border-slate-300">
            <BarcodeBatang
              value={employee.qrCodeId}
              width={1.4}
              height={38}
              showText={true}
              className="p-1"
            />
          </div>

          {/* Print ID Card Button */}
          <button
            onClick={() => {
              const printWindow = window.open('', '_blank');
              if (!printWindow) return;

              const barcodeSvg = generateBarcodeSvg(employee.qrCodeId, {
                width: 1.35,
                height: 40,
                showText: true,
                textColor: '#0f172a',
                fontSize: 10,
              });

              const html = `
                <!DOCTYPE html>
                <html>
                  <head>
                    <title>Kartu_ID_${employee.name.replace(/\s+/g, '_')}</title>
                    <style>
                      @page {
                        size: A4 portrait;
                        margin: 10mm;
                      }
                      * {
                        box-sizing: border-box;
                      }
                      body {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                        padding: 24px;
                        background: #f8fafc;
                        color: #0f172a;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                      }
                      .no-print {
                        margin-bottom: 20px;
                        background: white;
                        padding: 12px 24px;
                        border-radius: 8px;
                        border: 1px solid #cbd5e1;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                        display: flex;
                        align-items: center;
                        gap: 12px;
                      }
                      .btn-print {
                        background: #0284c7;
                        color: white;
                        border: none;
                        padding: 8px 16px;
                        border-radius: 6px;
                        font-weight: 600;
                        cursor: pointer;
                        font-size: 13px;
                      }
                      .id-card {
                        width: 54mm;
                        height: 85.6mm;
                        border-radius: 9px;
                        background: #ffffff;
                        border: 1px solid #cbd5e1;
                        box-shadow: 0 8px 24px rgba(0,0,0,0.12);
                        display: flex;
                        flex-direction: column;
                        overflow: hidden;
                        position: relative;
                      }
                      .card-header {
                        background: #0369a1;
                        color: white;
                        padding: 7px 8px 5px 8px;
                        text-align: center;
                      }
                      .card-inst {
                        font-size: 7.5px;
                        letter-spacing: 0.8px;
                        font-weight: 600;
                        color: #bae6fd;
                      }
                      .card-title {
                        font-size: 10px;
                        font-weight: 800;
                        letter-spacing: 0.4px;
                        margin-top: 1px;
                      }
                      .card-sub {
                        font-size: 6.5px;
                        color: #e0f2fe;
                        margin-top: 1px;
                      }
                      .card-body {
                        padding: 8px 10px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        flex: 1;
                        text-align: center;
                      }
                      .avatar-wrap {
                        width: 52px;
                        height: 52px;
                        border-radius: 50%;
                        border: 2px solid #0284c7;
                        overflow: hidden;
                        margin-bottom: 5px;
                        background: #f1f5f9;
                      }
                      .avatar-img {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                      }
                      .emp-name {
                        font-size: 10px;
                        font-weight: 800;
                        color: #0f172a;
                        line-height: 1.2;
                      }
                      .emp-pos {
                        font-size: 8px;
                        color: #0284c7;
                        font-weight: 600;
                        margin-top: 2px;
                      }
                      .emp-nip {
                        font-size: 8px;
                        font-family: monospace;
                        font-weight: bold;
                        color: #475569;
                        margin-top: 2px;
                      }
                      .emp-dept {
                        font-size: 8.5px;
                        color: #64748b;
                        margin-top: 1px;
                      }
                      .emp-cat {
                        display: inline-block;
                        padding: 1px 7px;
                        border-radius: 3px;
                        font-size: 8px;
                        font-weight: 800;
                        text-transform: uppercase;
                        margin-top: 4px;
                      }
                      .cat-guru {
                        background: #e0f2fe;
                        color: #0369a1;
                        border: 1px solid #bae6fd;
                      }
                      .cat-staf {
                        background: #ecfdf5;
                        color: #047857;
                        border: 1px solid #a7f3d0;
                      }
                      .cat-siswa {
                        background: #fef3c7;
                        color: #92400e;
                        border: 1px solid #fde68a;
                      }
                      .barcode-box {
                        width: 100%;
                        margin-top: auto;
                        padding: 4px 6px;
                        background: #ffffff;
                        border: 1px solid #cbd5e1;
                        border-radius: 6px;
                        box-sizing: border-box;
                      }
                      .card-footer {
                        background: #f8fafc;
                        border-top: 1px solid #e2e8f0;
                        padding: 5px 8px;
                        font-size: 7.5px;
                        color: #64748b;
                        text-align: center;
                        font-weight: 500;
                      }
                      @media print {
                        body {
                          background: white !important;
                          padding: 0 !important;
                        }
                        .no-print {
                          display: none !important;
                        }
                        .id-card {
                          box-shadow: none !important;
                          border: 1px dashed #94a3b8 !important;
                        }
                      }
                    </style>
                  </head>
                  <body>
                    <div class="no-print">
                      <button onclick="window.print()" class="btn-print">
                        🖨️ Cetak Kartu ID ${isStudent ? 'Siswa (Kartu Pelajar)' : 'Pegawai'}
                      </button>
                      <span style="font-size: 11px; color: #64748b;">
                        Format kartu ID resmi siap cetak dengan barcode batang 1D terkalibrasi
                      </span>
                    </div>

                    <div class="id-card">
                      <div class="card-header">
                        <div class="card-inst">MTs DARUL HUDA</div>
                        <div class="card-title">${isStudent ? 'KARTU PELAJAR SISWA' : 'KARTU IDENTITAS RESMI PEGAWAI'}</div>
                        <div class="card-sub">PEMERIKSAAN BIOMETRIK & BARCODE 1D</div>
                      </div>
                      
                      <div class="card-body">
                        <div class="avatar-wrap">
                          <img src="${employee.avatarUrl}" class="avatar-img" alt="${employee.name}" />
                        </div>

                        <div class="emp-name">${employee.name}</div>
                        <div class="emp-pos">${employee.position}</div>
                        <div class="emp-nip">${isStudent ? 'NISN' : 'NIP'}: ${employee.nip}</div>
                        <div class="emp-dept">${employee.department}</div>
                        
                        <div style="margin-top: 3px;">
                          <span class="emp-cat ${isStudent ? 'cat-siswa' : employee.category === 'guru' ? 'cat-guru' : 'cat-staf'}">
                            ${isStudent ? 'SISWA MTs' : employee.category === 'guru' ? 'DEWAN GURU' : 'STAF / KARYAWAN'}
                          </span>
                        </div>

                        <div class="barcode-box">
                          ${barcodeSvg}
                        </div>
                      </div>

                      <div class="card-footer">
                        Scan barcode pada terminal gerbang masuk atau mesin absen
                      </div>
                    </div>
                  </body>
                </html>
              `;
              printWindow.document.write(html);
              printWindow.document.close();
            }}
            className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Kartu & Barcode Batang</span>
          </button>

          <div className="w-full mt-4 pt-3 border-t border-slate-800/80 text-left space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Jam Masuk:</span>
              <span className="font-semibold text-amber-400">07.00 WIB Tepat</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Jam Pulang:</span>
              <span className="font-semibold text-slate-200">13.00 - 15.00 WIB</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Buka Terminal:</span>
              <span className="font-semibold text-emerald-400">05.30 WIB</span>
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Today's Status & Time Accumulation */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Today's Attendance Status Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-white">Status Kehadiran Anda Hari Ini</h3>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })} (WIB)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Check In Box */}
              <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-slate-400 font-medium">Absensi Masuk (Target 07.00 WIB)</span>
                  {todayCheckIn ? (
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Tercatat
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-rose-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Belum
                    </span>
                  )}
                </div>

                {todayCheckIn ? (
                  <div>
                    <div className="text-lg font-bold font-mono text-white">{todayCheckIn.time} WIB</div>
                    <span className={`text-[11px] font-medium ${todayCheckIn.status === 'on_time' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {todayCheckIn.status === 'on_time' ? 'Tepat Waktu (<07.00 WIB)' : `Terlambat +${todayCheckIn.lateMinutes} Menit`}
                    </span>
                    <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-blue-400" />
                      {todayCheckIn.location.officeName} ({todayCheckIn.location.distanceMeters}m)
                    </div>
                  </div>
                ) : (
                  <div className="pt-2">
                    <p className="text-xs text-slate-400 mb-2">Batas masuk pukul 07.00 WIB tepat (tanpa toleransi keterlambatan).</p>
                    <button
                      onClick={() => onOpenScanner(employee.id)}
                      className="w-full py-1.5 px-3 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Absen Masuk Sekarang
                    </button>
                  </div>
                )}
              </div>

              {/* Check Out Box */}
              <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-slate-400 font-medium">Absensi Pulang (13.00 - 15.00 WIB)</span>
                  {todayCheckOut ? (
                    <span className="text-xs font-semibold text-teal-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Tercatat
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500 font-medium">Jam pulang mulai 13.00 WIB</span>
                  )}
                </div>

                {todayCheckOut ? (
                  <div>
                    <div className="text-lg font-bold font-mono text-white">{todayCheckOut.time} WIB</div>
                    <span className={`text-[11px] font-medium ${todayCheckOut.status === 'early_leave' ? 'text-rose-400' : 'text-teal-400'}`}>
                      {todayCheckOut.status === 'early_leave' ? `Pulang Cepat (-${todayCheckOut.earlyMinutes}m)` : 'Selesai Sesuai Jadwal'}
                    </span>
                  </div>
                ) : (
                  <div className="pt-2">
                    <p className="text-xs text-slate-400 mb-2">Check-out sebelum jam 13.00 WIB dihitung pulang cepat.</p>
                    <button
                      onClick={() => onOpenScanner(employee.id)}
                      className="w-full py-1.5 px-3 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Absen Pulang
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Time Accumulation Summary Card */}
          {mySummary && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Akumulasi Waktu Kehadiran Anda Bulan Ini</h3>
                <p className="text-xs text-slate-400">Total akumulasi menit terlambat & pulang awal periode berjalan</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 block">Total Hari Hadir</span>
                  <span className="font-mono font-bold text-slate-200 text-sm">
                    {mySummary.attendedDays} / {mySummary.totalWorkDays} Hari
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Akumulasi Terlambat</span>
                  <span className="font-mono font-bold text-amber-400 text-sm">
                    {mySummary.formattedLateTime}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Akumulasi Pulang Cepat</span>
                  <span className="font-mono font-bold text-rose-400 text-sm">
                    {mySummary.formattedEarlyTime}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Total Jam Kerja</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    {mySummary.formattedTotalWorkTime}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Personal History */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Riwayat Absensi Terakhir Anda</h3>
              <span className="text-xs font-mono text-slate-400">{myRecords.length} Catatan</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400">
                    <th className="py-2.5 px-4 font-medium">Tanggal</th>
                    <th className="py-2.5 px-3 font-medium">Waktu (WIB)</th>
                    <th className="py-2.5 px-3 font-medium">Tipe</th>
                    <th className="py-2.5 px-3 font-medium">Status</th>
                    <th className="py-2.5 px-3 font-medium">Lokasi Geofence</th>
                    <th className="py-2.5 px-3 font-medium">Metode Verifikasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {myRecords.slice(0, 5).map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-4 font-mono text-slate-300 font-medium">{r.date}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">{r.time} WIB</td>
                      <td className="py-2.5 px-3">
                        <span className={`font-semibold ${r.type === 'check_in' ? 'text-blue-400' : 'text-teal-400'}`}>
                          {r.type === 'check_in' ? 'Masuk' : 'Pulang'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={r.status === 'on_time' ? 'text-emerald-400 font-medium' : 'text-amber-400 font-medium'}>
                          {r.status === 'on_time' ? 'Tepat Waktu (<07.00)' : `Terlambat +${r.lateMinutes}m`}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {r.location.officeName} ({r.location.distanceMeters}m)
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {r.verificationMethod === 'face_recognition' ? 'Wajah AI' : 'Barcode Batang'} ({r.matchConfidence}%)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
