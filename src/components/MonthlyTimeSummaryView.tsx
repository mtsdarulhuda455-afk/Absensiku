import React, { useState } from 'react';
import { 
  Clock, 
  Calendar, 
  AlertTriangle, 
  Download, 
  Printer, 
  FileSpreadsheet, 
  Users, 
  Search, 
  Filter,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { Employee, AttendanceRecord, MonthlyTimeAccumulation, WorkScheduleConfig } from '../types/attendance';
import { StorageService, formatMinutes } from '../services/storage';
import { ExportService } from '../services/exportService';

interface MonthlyTimeSummaryViewProps {
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
}

export const MonthlyTimeSummaryView: React.FC<MonthlyTimeSummaryViewProps> = ({
  employees,
  attendanceRecords,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'guru' | 'staf'>('all');
  const [schedule, setSchedule] = useState<WorkScheduleConfig>(StorageService.getSchedule());
  const [customPulangInput, setCustomPulangInput] = useState<string>(schedule.todayCheckOutTime || '13:00');

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const monthName = months[selectedMonth - 1];

  // Calculate monthly time accumulations
  const accumulations = StorageService.getMonthlyAccumulations(
    employees,
    attendanceRecords,
    selectedMonth,
    selectedYear
  );

  // Filtered
  const filtered = accumulations.filter((item) => {
    const matchesSearch =
      item.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employeeNip.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  // Aggregates
  const totalLateMinutes = accumulations.reduce((acc, curr) => acc + curr.totalLateMinutes, 0);
  const totalEarlyLeaveMinutes = accumulations.reduce((acc, curr) => acc + curr.totalEarlyLeaveMinutes, 0);
  const totalLateCases = accumulations.reduce((acc, curr) => acc + curr.lateCount, 0);
  const totalEarlyCases = accumulations.reduce((acc, curr) => acc + curr.earlyLeaveCount, 0);

  // Export neat structured Excel (.xlsx) file
  const handleExportExcel = () => {
    ExportService.exportMonthlySummaryToExcel(filtered, monthName, selectedYear, schedule);
  };

  const handleUpdateSchedule = (newTime: string, note: string) => {
    const updated = StorageService.setTodayCheckOutTime(newTime, note);
    setSchedule(updated);
    setCustomPulangInput(newTime);
  };

  // Print PDF Audit Sheet
  const handlePrintPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rowsHtml = filtered
      .map(
        (item, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <td style="padding: 6px 8px; text-align: center;">${idx + 1}</td>
          <td style="padding: 6px 8px;">
            <div style="font-weight: bold; color: #0f172a;">${item.employeeName}</div>
            <div style="color: #64748b; font-size: 10px;">${item.employeeNip} · ${item.position}</div>
          </td>
          <td style="padding: 6px 8px; text-align: center; text-transform: uppercase; font-size: 10px; font-weight: bold;">
            ${item.category}
          </td>
          <td style="padding: 6px 8px; text-align: center;">
            <strong>${item.attendedDays}</strong> / ${item.totalWorkDays} hari
          </td>
          <td style="padding: 6px 8px; text-align: center; color: ${item.lateCount > 0 ? '#b45309' : '#16a34a'};">
            <strong>${item.lateCount} kali</strong>
            <div style="font-size: 10px; font-weight: bold;">${item.formattedLateTime}</div>
          </td>
          <td style="padding: 6px 8px; text-align: center; color: ${item.earlyLeaveCount > 0 ? '#b91c1c' : '#64748b'};">
            <strong>${item.earlyLeaveCount} kali</strong>
            <div style="font-size: 10px; font-weight: bold;">${item.formattedEarlyTime}</div>
          </td>
          <td style="padding: 6px 8px; text-align: right; font-weight: bold;">
            ${item.formattedTotalWorkTime}
          </td>
        </tr>
      `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Rekap_Akumulasi_Waktu_Absensi_${monthName}_${selectedYear}</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 24px; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-top: 14px; }
            th { background: #f8fafc; border-bottom: 2px solid #cbd5e1; padding: 8px; text-align: left; font-size: 11px; }
            .kpi-row { display: flex; gap: 12px; margin: 16px 0; }
            .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 6px; flex: 1; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 16px; text-align: right;">
            <button onclick="window.print()" style="padding: 8px 16px; background: #0f172a; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">
              Cetak / Simpan PDF
            </button>
          </div>

          <div style="border-bottom: 2px solid #0f172a; padding-bottom: 10px;">
            <h2 style="margin: 0; font-size: 18px; text-transform: uppercase;">LAPORAN REKAPITULASI AKUMULASI WAKTU KEHADIRAN</h2>
            <p style="margin: 4px 0 0; font-size: 12px; color: #475569;">Sistem AbsensiKu — Jam Masuk: 07.00 WIB (Tanpa Toleransi) | Jam Pulang: 13.00 - 15.00 WIB</p>
            <p style="margin: 2px 0 0; font-size: 11px; color: #64748b;">Periode: ${monthName} ${selectedYear} · Dicetak: ${new Date().toLocaleString('id-ID')} WIB</p>
          </div>

          <div class="kpi-row">
            <div class="kpi-card">
              <div style="font-size: 10px; color: #64748b;">TOTAL AKUMULASI TERLAMBAT</div>
              <div style="font-size: 16px; font-weight: bold; color: #b45309;">${formatMinutes(totalLateMinutes)} (${totalLateCases} kasus)</div>
            </div>
            <div class="kpi-card">
              <div style="font-size: 10px; color: #64748b;">TOTAL AKUMULASI PULANG CEPAT</div>
              <div style="font-size: 16px; font-weight: bold; color: #b91c1c;">${formatMinutes(totalEarlyLeaveMinutes)} (${totalEarlyCases} kasus)</div>
            </div>
            <div class="kpi-card">
              <div style="font-size: 10px; color: #64748b;">TOTAL PEGAWAI & GURU</div>
              <div style="font-size: 16px; font-weight: bold;">${filtered.length} Orang</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 30px; text-align: center;">No</th>
                <th>Nama Pegawai / Guru</th>
                <th style="width: 80px; text-align: center;">Kategori</th>
                <th style="width: 100px; text-align: center;">Kehadiran</th>
                <th style="width: 150px; text-align: center;">Akumulasi Terlambat</th>
                <th style="width: 150px; text-align: center;">Akumulasi Pulang Cepat</th>
                <th style="width: 130px; text-align: right;">Total Jam Kerja</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div style="margin-top: 36px; display: flex; justify-content: space-between; page-break-inside: avoid;">
            <div style="font-size: 11px; color: #64748b; max-width: 350px;">
              Catatan: Terlambat dihitung per menit setelah jam 07.00.00 WIB tanpa toleransi. Pulang cepat dihitung per menit sebelum jam 13.00.00 WIB.
            </div>
            <div style="text-align: center; width: 220px;">
              <div style="font-size: 11px; margin-bottom: 50px;">Mengetahui,<br><strong>Kepala Sekolah / Pimpinan</strong></div>
              <div style="font-weight: bold; text-decoration: underline; font-size: 12px;">Dra. Hj. Siti Rahmawati, M.Pd</div>
              <div style="font-size: 10px; color: #64748b;">NIP: 19880724-002</div>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Rekapitulasi Akumulasi Waktu Kehadiran</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Akumulasi keterlambatan (lewat 07.00 WIB tanpa toleransi) dan pulang cepat (sebelum 13.00 WIB) dalam 1 bulan
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg p-1 text-xs">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-slate-200 px-2 py-1 font-medium focus:outline-none"
            >
              {months.map((m, idx) => (
                <option key={m} value={idx + 1} className="bg-slate-900">
                  {m}
                </option>
              ))}
            </select>
            <span className="text-slate-600">/</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-slate-200 px-2 py-1 font-medium focus:outline-none"
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y} className="bg-slate-900">
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Export to Excel (.xlsx) */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm cursor-pointer"
            title="Download file spreadsheet Excel .xlsx resmi dengan tabel dan kolom rapi"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Ekspor Tabel Excel (.xlsx)</span>
          </button>

          {/* Print PDF */}
          <button
            onClick={handlePrintPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-sm cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Rekap PDF</span>
          </button>
        </div>
      </div>

      {/* Strict Work Hours Policy & Interactive Dismissal Time Settings */}
      <div className="p-4 bg-slate-900/90 border border-blue-500/30 rounded-xl text-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-blue-400 font-semibold">
            <Clock className="w-4 h-4" />
            <span>Aturan Resmi Jam Kerja & Siklus Absensi Waktu Indonesia Barat (WIB):</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">Jam Pulang Aktif Hari Ini:</span>
            <span className="px-2 py-0.5 rounded font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30">
              {schedule.todayCheckOutTime} WIB {schedule.isCustomDay && `(${schedule.customDayNote})`}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-slate-300 pt-1 text-[11px] border-b border-slate-800/80 pb-3">
          <div>
            <span className="text-slate-500 block">Jam Masuk Resmi:</span>
            <span className="font-bold text-amber-400">Pukul 07.00 WIB (TIDAK ADA TOLERANSI)</span>
          </div>
          <div>
            <span className="text-slate-500 block">Jam Pulang Standar:</span>
            <span className="font-bold text-slate-200">13.00 - 15.00 WIB (Fleksibel Manual)</span>
          </div>
          <div>
            <span className="text-slate-500 block">Buka Terminal Absensi:</span>
            <span className="font-bold text-emerald-400">Mulai Pukul 05.30 WIB Pagi</span>
          </div>
          <div>
            <span className="text-slate-500 block">Reset Harian Server:</span>
            <span className="font-bold text-slate-200">Pukul 00.00 WIB Tengah Malam</span>
          </div>
        </div>

        {/* Quick Manual Dismissal Hour Preset Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-2 text-slate-300 text-[11px]">
            <span className="font-semibold text-amber-300">Ubah Jam Pulang Khusus:</span>
            <span className="text-slate-500 hidden sm:inline">(untuk hari Jumat / kepulangan di bawah jam 13.00 WIB)</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleUpdateSchedule('13:00', 'Hari Normal')}
              className={`px-2.5 py-1 text-[11px] rounded font-medium border transition-colors ${
                schedule.todayCheckOutTime === '13:00'
                  ? 'bg-blue-600 text-white border-blue-500 font-semibold'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
            >
              Normal (13:00)
            </button>
            <button
              type="button"
              onClick={() => handleUpdateSchedule('11:30', 'Hari Jumat')}
              className={`px-2.5 py-1 text-[11px] rounded font-medium border transition-colors ${
                schedule.todayCheckOutTime === '11:30'
                  ? 'bg-amber-600 text-white border-amber-500 font-semibold'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
            >
              Jumat (11:30)
            </button>
            <button
              type="button"
              onClick={() => handleUpdateSchedule('12:00', 'Hari Ujian')}
              className={`px-2.5 py-1 text-[11px] rounded font-medium border transition-colors ${
                schedule.todayCheckOutTime === '12:00'
                  ? 'bg-amber-600 text-white border-amber-500 font-semibold'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
            >
              Ujian (12:00)
            </button>
            
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded px-2 py-0.5">
              <span className="text-[10px] text-slate-400">Kustom:</span>
              <input
                type="time"
                value={customPulangInput}
                onChange={(e) => setCustomPulangInput(e.target.value)}
                className="bg-transparent text-[11px] text-white focus:outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => handleUpdateSchedule(customPulangInput, 'Jam Pulang Kustom')}
                className="px-2 py-0.5 text-[10px] bg-blue-600 hover:bg-blue-500 text-white rounded font-medium"
              >
                Set
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* KPI 1: Akumulasi Terlambat */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Akumulasi Keterlambatan</span>
            <div className="p-1.5 bg-amber-600/10 text-amber-400 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-amber-400">
            {formatMinutes(totalLateMinutes)}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Terjadi dalam <span className="font-semibold text-white">{totalLateCases}</span> kali insiden keterlambatan
          </div>
        </div>

        {/* KPI 2: Akumulasi Pulang Cepat */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Akumulasi Pulang Cepat</span>
            <div className="p-1.5 bg-rose-600/10 text-rose-400 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-rose-400">
            {formatMinutes(totalEarlyLeaveMinutes)}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Check-out sebelum pukul 13.00 WIB (<span className="font-semibold text-white">{totalEarlyCases}</span> kali)
          </div>
        </div>

        {/* KPI 3: Karyawan & Guru */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Guru & Staf Terdata</span>
            <div className="p-1.5 bg-blue-600/10 text-blue-400 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white">
            {filtered.length} Pegawai
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Periode bulan {monthName} {selectedYear}
          </div>
        </div>

      </div>

      {/* Main Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row gap-3 justify-between items-center">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Cari nama guru atau NIP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="all">Semua Kategori (Guru & Staf)</option>
              <option value="guru">Khusus Dewan Guru</option>
              <option value="staf">Khusus Staf Tata Usaha</option>
            </select>
          </div>
        </div>

        {/* Table Data */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400">
                <th className="py-3 px-4 font-medium">Pegawai / Guru</th>
                <th className="py-3 px-3 font-medium text-center">Kategori</th>
                <th className="py-3 px-3 font-medium text-center">Kehadiran</th>
                <th className="py-3 px-3 font-medium text-center text-amber-400 font-semibold">
                  Akumulasi Terlambat (&gt;07.00 WIB)
                </th>
                <th className="py-3 px-3 font-medium text-center text-rose-400 font-semibold">
                  Akumulasi Pulang Cepat (&lt;13.00 WIB)
                </th>
                <th className="py-3 px-3 font-medium text-right">Total Jam Kerja</th>
                <th className="py-3 px-4 font-medium text-center">Status Disiplin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((item) => (
                <tr key={item.employeeId} className="hover:bg-slate-800/30 transition-colors">
                  
                  {/* Name & NIP */}
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-200 block truncate max-w-[180px]">
                      {item.employeeName}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      {item.employeeNip} · {item.position}
                    </span>
                  </td>

                  {/* Category */}
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        item.category === 'guru'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {item.category}
                    </span>
                  </td>

                  {/* Attendance Days */}
                  <td className="py-3 px-3 text-center font-mono">
                    <span className="font-bold text-slate-200">{item.attendedDays}</span>
                    <span className="text-slate-500 text-[11px]"> / {item.totalWorkDays} hr</span>
                  </td>

                  {/* Late Accumulation */}
                  <td className="py-3 px-3 text-center">
                    {item.lateCount > 0 ? (
                      <div>
                        <span className="font-mono font-bold text-amber-400 block text-xs">
                          {item.formattedLateTime}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {item.lateCount}x terlambat ({item.totalLateMinutes}m)
                        </span>
                      </div>
                    ) : (
                      <span className="text-emerald-400 font-mono font-semibold">0 Menit ✓</span>
                    )}
                  </td>

                  {/* Early Leave Accumulation */}
                  <td className="py-3 px-3 text-center">
                    {item.earlyLeaveCount > 0 ? (
                      <div>
                        <span className="font-mono font-bold text-rose-400 block text-xs">
                          {item.formattedEarlyTime}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {item.earlyLeaveCount}x pulang awal ({item.totalEarlyLeaveMinutes}m)
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-500 font-mono">-</span>
                    )}
                  </td>

                  {/* Total Work Minutes */}
                  <td className="py-3 px-3 text-right font-mono font-semibold text-slate-200">
                    {item.formattedTotalWorkTime}
                  </td>

                  {/* Discipline Status */}
                  <td className="py-3 px-4 text-center">
                    {item.totalLateMinutes === 0 && item.totalEarlyLeaveMinutes === 0 ? (
                      <span className="text-emerald-400 font-semibold text-[11px] inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Sangat Disiplin
                      </span>
                    ) : item.totalLateMinutes > 60 ? (
                      <span className="text-rose-400 font-semibold text-[11px]">
                        Perlu Evaluasi
                      </span>
                    ) : (
                      <span className="text-amber-400 font-semibold text-[11px]">
                        Standar
                      </span>
                    )}
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};
