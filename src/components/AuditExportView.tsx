import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  FileText, 
  Printer, 
  Download, 
  Search, 
  Filter, 
  ShieldCheck, 
  MessageSquare,
  MapPin,
  ExternalLink,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { AttendanceRecord, Employee, OfficeLocation, NotificationLog } from '../types/attendance';
import { ExportService } from '../services/exportService';
import { StorageService } from '../services/storage';

interface AuditExportViewProps {
  attendanceRecords: AttendanceRecord[];
  employees: Employee[];
  offices: OfficeLocation[];
}

export const AuditExportView: React.FC<AuditExportViewProps> = ({
  attendanceRecords,
  employees,
  offices,
}) => {
  const [activeTab, setActiveTab] = useState<'attendance' | 'notifications'>('attendance');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('all');
  const [selectedDept, setSelectedDept] = useState('all');
  const [notificationLogs] = useState<NotificationLog[]>(StorageService.getNotificationLogs());

  // Filter attendance records
  const filteredRecords = attendanceRecords.filter((r) => {
    const matchesSearch =
      r.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.employeeNip.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMethod = selectedMethod === 'all' || r.verificationMethod === selectedMethod;
    const matchesDept = selectedDept === 'all' || r.department === selectedDept;
    return matchesSearch && matchesMethod && matchesDept;
  });

  const handleExportPDF = () => {
    ExportService.printAttendanceAuditPDF(filteredRecords, 'November', 2026);
  };

  const handleExportExcel = () => {
    ExportService.exportAttendanceLogToExcel(
      filteredRecords,
      `Laporan_Presensi_AbsensiKu_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & Export CTAs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Pusat Audit Kehadiran & Ekspor Data</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Ekspor laporan resmi berstandar audit kepatuhan ISO/HRIS dalam format PDF dan Excel (.xlsx)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm cursor-pointer"
            title="Download file spreadsheet Excel .xlsx resmi dengan tabel dan kolom rapi"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Ekspor Tabel Excel (.xlsx)</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Laporan PDF</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'attendance'
              ? 'border-blue-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Rekam Jejak Presensi & Biometrik ({attendanceRecords.length})
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'notifications'
              ? 'border-blue-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Log Transmisi WhatsApp Gateway ({notificationLogs.length})
        </button>
      </div>

      {activeTab === 'attendance' ? (
        /* Tab 1: Attendance Audit Table */
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          
          {/* Filter Bar */}
          <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row gap-3 justify-between items-center">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Cari ID transaksi, nama, NIP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
              >
                <option value="all">Semua Metode Verifikasi</option>
                <option value="face_recognition">Wajah AI</option>
                <option value="camera_qr">Kamera QR</option>
                <option value="external_hardware_scanner">Scanner Eksternal</option>
              </select>

              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
              >
                <option value="all">Semua Departemen</option>
                <option value="Engineering">Engineering</option>
                <option value="Finance & Accounting">Finance & Accounting</option>
                <option value="Human Resources">Human Resources</option>
                <option value="Operations">Operations</option>
                <option value="Marketing">Marketing</option>
                <option value="Security">Security</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 px-4 font-medium">ID Transaksi</th>
                  <th className="py-2.5 px-4 font-medium">Karyawan</th>
                  <th className="py-2.5 px-3 font-medium">Tanggal & Waktu</th>
                  <th className="py-2.5 px-3 font-medium">Tipe</th>
                  <th className="py-2.5 px-3 font-medium">Status & Pinalti</th>
                  <th className="py-2.5 px-3 font-medium">Metode Verifikasi</th>
                  <th className="py-2.5 px-3 font-medium">Lokasi Geofence</th>
                  <th className="py-2.5 px-3 font-medium">Keamanan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                    
                    {/* TRX ID */}
                    <td className="py-2.5 px-4 font-mono text-slate-300 font-semibold">
                      #{r.id}
                    </td>

                    {/* Employee */}
                    <td className="py-2.5 px-4">
                      <span className="font-semibold text-slate-200 block truncate max-w-[150px]">{r.employeeName}</span>
                      <span className="text-[11px] text-slate-500 block">{r.employeeNip} · {r.department}</span>
                    </td>

                    {/* Timestamp */}
                    <td className="py-2.5 px-3 font-mono text-slate-300">
                      <div>{r.date}</div>
                      <div className="text-slate-500 text-[11px]">{r.time} WIB</div>
                    </td>

                    {/* Type */}
                    <td className="py-2.5 px-3">
                      <span className={`font-semibold ${r.type === 'check_in' ? 'text-blue-400' : 'text-teal-400'}`}>
                        {r.type === 'check_in' ? 'Check-In' : 'Check-Out'}
                      </span>
                    </td>

                    {/* Status & Penalty */}
                    <td className="py-2.5 px-3">
                      <span className={r.status === 'on_time' ? 'text-emerald-400 font-medium' : 'text-amber-400 font-medium'}>
                        {r.status === 'on_time' ? 'Tepat Waktu' : `Terlambat ${r.lateMinutes}m`}
                      </span>
                    </td>

                    {/* Method */}
                    <td className="py-2.5 px-3">
                      <div className="text-slate-300">
                        {r.verificationMethod === 'face_recognition' ? 'Wajah Biometrik AI' : r.verificationMethod === 'camera_qr' ? 'QR Code' : 'Scanner Eksternal'}
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                        {r.matchConfidence}% Akurasi
                      </span>
                    </td>

                    {/* Location */}
                    <td className="py-2.5 px-3">
                      <div className="text-slate-300 truncate max-w-[140px]">{r.location.officeName}</div>
                      <span className="text-[10px] font-mono text-slate-500 block">
                        Jarak {r.location.distanceMeters}m ({r.location.isWithinRadius ? 'Valid' : 'Luar Radius'})
                      </span>
                    </td>

                    {/* Security & Sync */}
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" />
                        {r.syncStatus === 'synced' ? 'Tervalidasi' : 'Pending Sync'}
                      </span>
                      <span className="text-[10px] text-slate-500 block font-mono">
                        {r.deviceInfo.split('(')[0].trim()}
                      </span>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Tab 2: WhatsApp Notification Logs */
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">Log Riwayat Pesan WhatsApp Terkirim</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">Gateway API Fonnte / Wablas</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 px-4 font-medium">Waktu Transmisi</th>
                  <th className="py-2.5 px-4 font-medium">Penerima</th>
                  <th className="py-2.5 px-3 font-medium">Nomor WhatsApp</th>
                  <th className="py-2.5 px-4 font-medium">Subjek & Isi Notifikasi</th>
                  <th className="py-2.5 px-3 font-medium">Status API</th>
                  <th className="py-2.5 px-3 font-medium text-center">Tautan Chat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {notificationLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      Belum ada log pesan WhatsApp yang dicatat. Lakukan absensi atau kirim pengingat untuk melihat aktivitas.
                    </td>
                  </tr>
                ) : (
                  notificationLogs.map((log) => {
                    const directUrl = `https://api.whatsapp.com/send?phone=${log.targetPhoneOrDevice}&text=${encodeURIComponent(log.message)}`;

                    return (
                      <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-4 font-mono text-slate-300">
                          {new Date(log.timestamp).toLocaleTimeString('id-ID')} WIB
                        </td>
                        <td className="py-2.5 px-4 font-medium text-slate-200">
                          {log.targetName}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">
                          +{log.targetPhoneOrDevice}
                        </td>
                        <td className="py-2.5 px-4 max-w-xs">
                          <span className="font-semibold text-slate-300 block">{log.title}</span>
                          <span className="text-[11px] text-slate-500 block truncate">{log.message.replace(/\n/g, ' ')}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            TERKIRIM (200 OK)
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <a
                            href={directUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:underline"
                          >
                            <span>Buka WA</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
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

    </div>
  );
};
