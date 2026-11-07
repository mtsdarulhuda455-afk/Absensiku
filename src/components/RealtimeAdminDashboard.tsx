import React, { useState } from 'react';
import { 
  Users, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Search, 
  BellRing, 
  MessageSquare, 
  MapPin, 
  Scan, 
  Check, 
  Smartphone,
  ExternalLink,
  GraduationCap
} from 'lucide-react';
import { Employee, AttendanceRecord, OfficeLocation } from '../types/attendance';
import { NotificationService } from '../services/notificationService';

interface RealtimeAdminDashboardProps {
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  offices: OfficeLocation[];
  onOpenScanner: () => void;
  onRefreshData: () => void;
}

export const RealtimeAdminDashboard: React.FC<RealtimeAdminDashboardProps> = ({
  employees,
  attendanceRecords,
  offices,
  onOpenScanner,
  onRefreshData,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [reminderNotificationSent, setReminderNotificationSent] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const todayRecords = attendanceRecords.filter((r) => r.date === todayStr);
  const checkedInEmpIds = new Set(todayRecords.filter((r) => r.type === 'check_in').map((r) => r.employeeId));

  // Absent employees
  const absentEmployees = employees.filter((e) => !checkedInEmpIds.has(e.id));
  const absentTeachers = absentEmployees.filter((e) => e.category === 'guru');

  // Strict 07.00 WIB counts
  const onTimeCount = todayRecords.filter((r) => r.type === 'check_in' && r.status === 'on_time').length;
  const lateCount = todayRecords.filter((r) => r.type === 'check_in' && r.status === 'late').length;
  const attendanceRate = employees.length > 0 ? Math.round((checkedInEmpIds.size / employees.length) * 100) : 0;

  // Filtered records
  const filteredRecords = todayRecords.filter((rec) => {
    const matchesSearch =
      rec.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.employeeNip.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDepartment === 'all' || rec.department === selectedDepartment;
    const matchesStatus = selectedStatus === 'all' || rec.status === selectedStatus;
    return matchesSearch && matchesDept && matchesStatus;
  });

  const departments = ['Dewan Guru', 'Tata Usaha & Administrasi', 'Engineering', 'Operations', 'Finance', 'Keamanan'];

  // Handle Send Reminder to absent teachers
  const handleSendTeacherReminder = async () => {
    if (absentTeachers.length === 0) return;
    setIsSendingReminder(true);

    try {
      let sentCount = 0;
      for (const emp of absentTeachers) {
        const msg = NotificationService.createTeacherReminderWAMessage(emp);
        await NotificationService.dispatchWhatsAppNotification({
          phone: emp.phone,
          targetName: emp.name,
          message: msg,
          isReminder: true,
        });

        NotificationService.sendPushNotification(
          `Pengingat Guru: ${emp.name}`,
          `Pesan WhatsApp otomatis terkirim ke ${emp.phone}. Batas masuk 07.00 WIB.`
        );
        sentCount += 1;
      }

      setReminderNotificationSent(`Pesan pengingat WhatsApp berhasil dikirim ke ${sentCount} Dewan Guru.`);
      setTimeout(() => setReminderNotificationSent(null), 5000);
    } finally {
      setIsSendingReminder(false);
    }
  };

  // Handle Send Bulk Reminder to all absent employees
  const handleSendAllReminder = async () => {
    if (absentEmployees.length === 0) return;
    setIsSendingReminder(true);

    try {
      let sentCount = 0;
      for (const emp of absentEmployees) {
        const msg = NotificationService.createReminderWAMessage(emp);
        await NotificationService.dispatchWhatsAppNotification({
          phone: emp.phone,
          targetName: emp.name,
          message: msg,
          isReminder: true,
        });

        NotificationService.sendPushNotification(
          `Pengingat Masuk: ${emp.name}`,
          `Pesan WhatsApp otomatis terkirim ke ${emp.phone}. Batas masuk 07.00 WIB.`
        );
        sentCount += 1;
      }

      setReminderNotificationSent(`Pesan pengingat otomatis berhasil dikirim ke ${sentCount} pegawai & guru.`);
      setTimeout(() => setReminderNotificationSent(null), 5000);
    } finally {
      setIsSendingReminder(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Dasbor Pemantauan Kehadiran Real-Time</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Batas jam masuk 07.00 WIB (Tanpa Toleransi) · Terminal dibuka 05.30 WIB · Reset server 00.00 WIB
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {absentTeachers.length > 0 && (
            <button
              onClick={handleSendTeacherReminder}
              disabled={isSendingReminder}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-sm"
              title="Kirim pengingat WhatsApp ke semua guru yang belum hadir sebelum 07.00 WIB"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>
                {isSendingReminder ? 'Mengirim...' : `Ingatkan Guru (${absentTeachers.length} Belum Hadir)`}
              </span>
            </button>
          )}

          {absentEmployees.length > 0 && (
            <button
              onClick={handleSendAllReminder}
              disabled={isSendingReminder}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition-all shadow-sm"
            >
              <BellRing className={`w-3.5 h-3.5 ${isSendingReminder ? 'animate-bounce' : ''}`} />
              <span>Ingatkan Semua ({absentEmployees.length})</span>
            </button>
          )}

          <button
            onClick={onOpenScanner}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm"
          >
            <Scan className="w-3.5 h-3.5" />
            <span>Terminal Scan</span>
          </button>
        </div>
      </div>

      {/* Reminder notification alert */}
      {reminderNotificationSent && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs rounded-lg flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{reminderNotificationSent}</span>
          </div>
          <span className="font-mono text-[11px] text-emerald-400">WhatsApp Gateway 200 OK</span>
        </div>
      )}

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Kehadiran Hari Ini */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Hadir Hari Ini</span>
            <div className="p-1.5 bg-blue-600/10 text-blue-400 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white tabular-nums">
              {checkedInEmpIds.size}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              / {employees.length} Orang
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
            <span className="text-emerald-400 font-semibold font-mono">{attendanceRate}%</span>
            <span>tingkat kehadiran staf & guru</span>
          </div>
        </div>

        {/* KPI 2: Tepat Waktu (Sebelum 07.00 WIB) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Tepat Waktu (&lt;07.00 WIB)</span>
            <div className="p-1.5 bg-emerald-600/10 text-emerald-400 rounded-lg">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
              {onTimeCount}
            </span>
            <span className="text-xs text-slate-500 font-mono">orang</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Masuk sebelum pukul 07.00 WIB
          </div>
        </div>

        {/* KPI 3: Terlambat (Lewat 07.00 WIB) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Terlambat (&gt;07.00 WIB)</span>
            <div className="p-1.5 bg-amber-600/10 text-amber-400 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-400 tabular-nums">
              {lateCount}
            </span>
            <span className="text-xs text-slate-500 font-mono">orang</span>
          </div>
          <div className="mt-2 text-xs text-amber-400/80">
            Tanpa toleransi, menit diakumulasi
          </div>
        </div>

        {/* KPI 4: Belum Absen */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Belum Check-In</span>
            <div className="p-1.5 bg-rose-600/10 text-rose-400 rounded-lg">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-rose-400 tabular-nums">
              {absentEmployees.length}
            </span>
            <span className="text-xs text-slate-500 font-mono">
              ({absentTeachers.length} Guru)
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {absentEmployees.length > 0 ? 'Notifikasi otomatis siap dikirim' : 'Semua staf telah hadir'}
          </div>
        </div>

      </div>

      {/* Main Grid: Live Feed & Unchecked Employees Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Live Feed Table */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
          
          {/* Table Toolbar */}
          <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row gap-3 justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-sm font-semibold text-white">Live Feed Absensi Hari Ini</h3>
              <span className="text-xs font-mono text-slate-400">({filteredRecords.length} Data)</span>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-48">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari nama / NIP..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none"
              >
                <option value="all">Semua Departemen</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table Data Rows */}
          <div className="overflow-x-auto">
            {filteredRecords.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                Belum ada transaksi absensi yang cocok dengan filter.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400">
                    <th className="py-2.5 px-4 font-medium">Pegawai / Guru</th>
                    <th className="py-2.5 px-3 font-medium">Waktu (WIB)</th>
                    <th className="py-2.5 px-3 font-medium">Status Kehadiran</th>
                    <th className="py-2.5 px-3 font-medium">Lokasi & GPS</th>
                    <th className="py-2.5 px-3 font-medium">Metode Verifikasi</th>
                    <th className="py-2.5 px-3 font-medium">Notifikasi WA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2.5">
                          {r.photoSnapshot ? (
                            <img
                              src={r.photoSnapshot}
                              alt={r.employeeName}
                              className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold shrink-0">
                              {r.employeeName.charAt(0)}
                            </div>
                          )}
                          <div className="truncate max-w-[150px]">
                            <span className="font-semibold text-slate-200 block truncate">{r.employeeName}</span>
                            <span className="text-[11px] text-slate-500 block">{r.employeeNip} · {r.department}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="font-mono text-slate-200 font-medium">{r.time} WIB</div>
                        <span className={`text-[10px] uppercase font-semibold ${r.type === 'check_in' ? 'text-blue-400' : 'text-teal-400'}`}>
                          {r.type === 'check_in' ? 'Masuk' : 'Pulang'}
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold text-[11px] ${
                            r.status === 'on_time' ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {r.status === 'on_time' ? 'Tepat Waktu (<07.00)' : `Terlambat +${r.lateMinutes}m`}
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1 text-slate-300 truncate max-w-[150px]">
                          <MapPin className="w-3 h-3 text-blue-400 shrink-0" />
                          <span className="truncate">{r.location.officeName}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 block">
                          Radius {r.location.distanceMeters}m ({r.location.isWithinRadius ? 'Valid' : 'Luar Radius'})
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="text-slate-300 block truncate max-w-[120px]">
                          {r.verificationMethod === 'face_recognition'
                            ? 'Wajah AI'
                            : r.verificationMethod === 'camera_qr'
                            ? 'Kamera Barcode'
                            : 'Scanner Eksternal'}
                        </span>
                        <span className="font-mono text-emerald-400 text-[11px] font-semibold">
                          {r.matchConfidence}% Akurat
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <MessageSquare className="w-3 h-3 text-emerald-400" />
                          <span className="text-[11px] text-slate-300">
                            {r.waStatus === 'terkirim' ? 'Terkirim ✓' : 'Pending'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right 1 Col: Absent Employees List with Quick WhatsApp Alert */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Belum Melakukan Absen</h3>
              <p className="text-[11px] text-slate-400">Target jam masuk: 07.00 WIB tepat</p>
            </div>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
              {absentEmployees.length} Orang
            </span>
          </div>

          <div className="p-4 divide-y divide-slate-800/60 overflow-y-auto max-h-[480px]">
            {absentEmployees.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <Check className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                Semua dewan guru dan staf telah hadir tepat waktu.
              </div>
            ) : (
              absentEmployees.map((emp) => {
                const waUrl = `https://api.whatsapp.com/send?phone=${emp.phone}&text=${encodeURIComponent(
                  NotificationService.createTeacherReminderWAMessage(emp)
                )}`;

                return (
                  <div key={emp.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 truncate">
                      <img
                        src={emp.avatarUrl}
                        alt={emp.name}
                        className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
                      />
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-slate-200 truncate">{emp.name}</span>
                          {emp.category === 'guru' && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-blue-500/20 text-blue-300">
                              Guru
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 block truncate">{emp.position}</span>
                      </div>
                    </div>

                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs flex items-center gap-1 shrink-0 transition-colors"
                      title="Kirim pesan peringatan WhatsApp langsung"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span className="text-[11px]">Ingatkan</span>
                    </a>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-3 bg-slate-950/60 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
            <Smartphone className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>Pesan otomatis WhatsApp mencantumkan jam masuk 07.00 WIB.</span>
          </div>
        </div>

      </div>

    </div>
  );
};
