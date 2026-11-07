import React from 'react';
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
  MessageSquare
} from 'lucide-react';
import { Employee, AttendanceRecord, OfficeLocation } from '../types/attendance';
import { StorageService, formatMinutes } from '../services/storage';
import { BarcodeBatang, generateBarcodeSvg } from './BarcodeBatang';

interface EmployeePortalViewProps {
  employee: Employee;
  attendanceRecords: AttendanceRecord[];
  offices: OfficeLocation[];
  onOpenScanner: () => void;
}

export const EmployeePortalView: React.FC<EmployeePortalViewProps> = ({
  employee,
  attendanceRecords,
  offices,
  onOpenScanner,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  
  // Records for this employee
  const myRecords = attendanceRecords.filter((r) => r.employeeId === employee.id);
  const todayCheckIn = myRecords.find((r) => r.date === todayStr && r.type === 'check_in');
  const todayCheckOut = myRecords.find((r) => r.date === todayStr && r.type === 'check_out');

  // Calculate monthly time accumulation for this employee
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const accumulations = StorageService.getMonthlyAccumulations([employee], attendanceRecords, currentMonth, currentYear);
  const mySummary = accumulations[0];

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
              <h2 className="text-xl font-bold tracking-tight text-white">{employee.name}</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/20 text-blue-300">
                {employee.category}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              NIP: {employee.nip} · {employee.position} ({employee.department})
            </p>
          </div>
        </div>

        <button
          onClick={onOpenScanner}
          className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md shrink-0"
        >
          <Scan className="w-4 h-4" />
          <span>Lakukan Presensi Sekarang</span>
        </button>
      </div>

      {/* Main Grid: ID Card & Status */}
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
          <span className="text-[11px] font-mono text-slate-400 mt-0.5">{employee.nip}</span>

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
                        gap: 12px;
                        align-items: center;
                      }
                      .btn-print {
                        padding: 9px 22px;
                        background: #0f172a;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: bold;
                        font-size: 13px;
                      }
                      .id-card {
                        width: 240px;
                        height: 380px;
                        background: #ffffff;
                        border: 1.5px solid #0f172a;
                        border-radius: 12px;
                        overflow: hidden;
                        display: flex;
                        flex-direction: column;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                        page-break-inside: avoid;
                        break-inside: avoid;
                      }
                      .card-header {
                        background: #0f172a;
                        color: #ffffff;
                        padding: 9px 10px;
                        text-align: center;
                        border-bottom: 2.5px solid #0284c7;
                      }
                      .card-inst {
                        font-size: 8px;
                        font-weight: 700;
                        color: #94a3b8;
                        text-transform: uppercase;
                        letter-spacing: 0.8px;
                      }
                      .card-title {
                        font-size: 11px;
                        font-weight: 800;
                        letter-spacing: 0.5px;
                        margin-top: 1px;
                      }
                      .card-sub {
                        font-size: 7.5px;
                        color: #38bdf8;
                        margin-top: 1px;
                      }
                      .card-body {
                        padding: 10px 12px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        flex: 1;
                        text-align: center;
                        background: #ffffff;
                      }
                      .avatar-wrap {
                        margin-bottom: 6px;
                      }
                      .avatar-img {
                        width: 68px;
                        height: 68px;
                        border-radius: 50%;
                        object-fit: cover;
                        border: 2px solid #0284c7;
                        display: block;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                      }
                      .emp-name {
                        font-size: 13px;
                        font-weight: 800;
                        color: #0f172a;
                        line-height: 1.25;
                        margin-bottom: 2px;
                      }
                      .emp-pos {
                        font-size: 10px;
                        color: #0284c7;
                        font-weight: 600;
                        line-height: 1.2;
                      }
                      .emp-nip {
                        font-size: 9px;
                        font-family: 'Courier New', Courier, monospace;
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
                          border: 1px dashed #94a3b8 !important; /* Dotted line cut guide */
                        }
                      }
                    </style>
                  </head>
                  <body>
                    <div class="no-print">
                      <button onclick="window.print()" class="btn-print">
                        🖨️ Cetak Kartu ID Pegawai (Print / PDF)
                      </button>
                      <span style="font-size: 11px; color: #64748b;">
                        Format kartu ID resmi siap cetak dengan barcode batang 1D terkalibrasi
                      </span>
                    </div>

                    <div class="id-card">
                      <div class="card-header">
                        <div class="card-inst">KARTU IDENTITAS RESMI PEGAWAI</div>
                        <div class="card-title">SISTEM PRESENSI ABSENSIKU</div>
                        <div class="card-sub">PEMERIKSAAN BIOMETRIK & BARCODE 1D</div>
                      </div>
                      
                      <div class="card-body">
                        <div class="avatar-wrap">
                          <img src="${employee.avatarUrl}" class="avatar-img" alt="${employee.name}" onerror="this.src='/src/assets/images/avatar_reza_aditya_1793876906907.jpg'" />
                        </div>

                        <div class="emp-name">${employee.name}</div>
                        <div class="emp-pos">${employee.position}</div>
                        <div class="emp-nip">NIP: ${employee.nip}</div>
                        <div class="emp-dept">${employee.department}</div>
                        
                        <div style="margin-top: 3px;">
                          <span class="emp-cat ${employee.category === 'guru' ? 'cat-guru' : 'cat-staf'}">
                            ${employee.category === 'guru' ? 'DEWAN GURU' : 'STAF / KARYAWAN'}
                          </span>
                        </div>

                        <!-- Real Vector Barcode Batang 1D Container -->
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
                <h3 className="text-sm font-semibold text-white">Status Kehadiran Hari Ini</h3>
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
                      onClick={onOpenScanner}
                      className="w-full py-1.5 px-3 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
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
                      onClick={onOpenScanner}
                      className="w-full py-1.5 px-3 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
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
