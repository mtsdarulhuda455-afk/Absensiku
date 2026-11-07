import * as XLSX from 'xlsx';
import { AttendanceRecord, MonthlyTimeAccumulation, WorkScheduleConfig } from '../types/attendance';

export const ExportService = {
  // Export Monthly Time Summary to a neat, structured Excel (.xlsx) file
  exportMonthlySummaryToExcel(
    accumulations: MonthlyTimeAccumulation[],
    monthName: string,
    year: number,
    schedule?: WorkScheduleConfig
  ) {
    const defaultPulang = schedule?.todayCheckOutTime || '13:00';
    const note = schedule?.customDayNote || 'Hari Normal';

    // 1. Title Banner Rows
    const data: any[][] = [
      ['ABSENSIKU — SISTEM PRESENSI BIOMETRIK & BARCODE BATANG'],
      ['REKAPITULASI AKUMULASI WAKTU KEHADIRAN, KETERLAMBATAN & PULANG CEPAT'],
      [`Periode: ${monthName} ${year}`, '', '', `Dicetak Pada: ${new Date().toLocaleString('id-ID')} WIB`],
      [
        `Kebijakan Jam: Masuk 07.00 WIB (Tanpa Toleransi) | Jam Pulang: ${defaultPulang} WIB (${note}) | Buka: 05.30 WIB | Reset: 00.00 WIB`,
      ],
      [], // Blank line
      // Table Header Row
      [
        'No',
        'NIP',
        'Nama Pegawai / Guru',
        'Kategori',
        'Departemen',
        'Jabatan',
        'Hari Kerja',
        'Hadir (Hari)',
        'Tidak Hadir (Hari)',
        'Terlambat (Kali)',
        'Total Menit Terlambat',
        'Akumulasi Terlambat',
        'Pulang Cepat (Kali)',
        'Total Menit Pulang Cepat',
        'Akumulasi Pulang Cepat',
        'Total Jam Kerja Efektif',
        'Status Disiplin',
      ],
    ];

    let sumWorkDays = 0;
    let sumAttended = 0;
    let sumAbsent = 0;
    let sumLateCount = 0;
    let sumLateMinutes = 0;
    let sumEarlyCount = 0;
    let sumEarlyMinutes = 0;

    // 2. Data Rows
    accumulations.forEach((item, idx) => {
      sumWorkDays += item.totalWorkDays;
      sumAttended += item.attendedDays;
      sumAbsent += item.absentDays;
      sumLateCount += item.lateCount;
      sumLateMinutes += item.totalLateMinutes;
      sumEarlyCount += item.earlyLeaveCount;
      sumEarlyMinutes += item.totalEarlyLeaveMinutes;

      const discipline =
        item.totalLateMinutes === 0 && item.totalEarlyLeaveMinutes === 0
          ? 'Sangat Disiplin'
          : item.totalLateMinutes > 60
          ? 'Perlu Evaluasi'
          : 'Standar';

      data.push([
        idx + 1,
        item.employeeNip,
        item.employeeName,
        item.category.toUpperCase(),
        item.department,
        item.position,
        item.totalWorkDays,
        item.attendedDays,
        item.absentDays,
        item.lateCount,
        item.totalLateMinutes,
        item.formattedLateTime,
        item.earlyLeaveCount,
        item.totalEarlyLeaveMinutes,
        item.formattedEarlyTime,
        item.formattedTotalWorkTime,
        discipline,
      ]);
    });

    // 3. Summary / Totals Row
    data.push([
      'TOTAL',
      '',
      `${accumulations.length} Pegawai Terdaftar`,
      '',
      '',
      '',
      sumWorkDays,
      sumAttended,
      sumAbsent,
      sumLateCount,
      sumLateMinutes,
      `${Math.floor(sumLateMinutes / 60)} Jam ${sumLateMinutes % 60} Menit`,
      sumEarlyCount,
      sumEarlyMinutes,
      `${Math.floor(sumEarlyMinutes / 60)} Jam ${sumEarlyMinutes % 60} Menit`,
      '',
      '',
    ]);

    // Create Worksheet
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Set Column Widths for neat viewing in Excel
    ws['!cols'] = [
      { wch: 6 },  // No
      { wch: 22 }, // NIP
      { wch: 32 }, // Nama
      { wch: 12 }, // Kategori
      { wch: 28 }, // Departemen
      { wch: 32 }, // Jabatan
      { wch: 12 }, // Hari Kerja
      { wch: 14 }, // Hadir
      { wch: 18 }, // Tidak Hadir
      { wch: 16 }, // Terlambat Kali
      { wch: 20 }, // Menit Terlambat
      { wch: 22 }, // Akumulasi Terlambat
      { wch: 18 }, // Pulang Cepat Kali
      { wch: 24 }, // Menit Pulang Cepat
      { wch: 24 }, // Akumulasi Pulang Cepat
      { wch: 24 }, // Total Jam Kerja
      { wch: 16 }, // Status
    ];

    // Create Workbook and append sheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Rekap ${monthName}`);

    // Trigger Download of genuine .xlsx file
    const filename = `Rekap_Akumulasi_Waktu_${monthName}_${year}.xlsx`;
    XLSX.writeFile(wb, filename);
  },

  // Export Detailed Attendance Records to a neat Excel (.xlsx) file
  exportAttendanceLogToExcel(records: AttendanceRecord[], filename = 'Laporan_Presensi_AbsensiKu.xlsx') {
    const data: any[][] = [
      ['ABSENSIKU — LOG TRANSAKSI PRESENSI BIOMETRIK & HARDWARE SCANNER'],
      [`Tanggal Ekspor: ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')} WIB`],
      ['Total Data: ' + records.length + ' Transaksi Terekam'],
      [], // Blank line
      [
        'No',
        'ID Transaksi',
        'NIP',
        'Nama Pegawai / Guru',
        'Departemen',
        'Tanggal',
        'Jam Absensi (WIB)',
        'Tipe Absensi',
        'Status Kehadiran',
        'Terlambat (Menit)',
        'Pulang Cepat (Menit)',
        'Metode Verifikasi',
        'Akurasi Biometrik (%)',
        'Lokasi Kantor / Sekolah',
        'Jarak GPS (Meter)',
        'Geofence Valid',
        'Status Sinkronisasi',
        'Status WhatsApp',
        'Perangkat Scanner',
      ],
    ];

    records.forEach((r, idx) => {
      data.push([
        idx + 1,
        r.id,
        r.employeeNip,
        r.employeeName,
        r.department,
        r.date,
        r.time,
        r.type === 'check_in' ? 'Masuk (Check-In)' : 'Pulang (Check-Out)',
        r.status === 'on_time'
          ? 'Tepat Waktu'
          : r.status === 'late'
          ? `Terlambat (${r.lateMinutes}m)`
          : r.status === 'early_leave'
          ? `Pulang Cepat (${r.earlyMinutes}m)`
          : 'Lembur',
        r.lateMinutes || 0,
        r.earlyMinutes || 0,
        r.verificationMethod === 'face_recognition'
          ? 'Wajah AI Biometrik'
          : r.verificationMethod === 'camera_qr'
          ? 'Kamera QR/Barcode'
          : 'Scanner Eksternal (USB/Bluetooth)',
        r.matchConfidence,
        r.location.officeName,
        r.location.distanceMeters,
        r.location.isWithinRadius ? 'Dalam Radius' : 'Luar Radius',
        r.syncStatus === 'synced' ? 'Tersinkron' : 'Antrean Offline',
        r.waStatus === 'terkirim' ? 'Terkirim' : 'Pending',
        r.deviceInfo || '-',
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);

    ws['!cols'] = [
      { wch: 6 },  // No
      { wch: 14 }, // ID
      { wch: 22 }, // NIP
      { wch: 30 }, // Nama
      { wch: 26 }, // Dept
      { wch: 14 }, // Tanggal
      { wch: 18 }, // Jam
      { wch: 20 }, // Tipe
      { wch: 22 }, // Status
      { wch: 18 }, // Terlambat
      { wch: 20 }, // Pulang Cepat
      { wch: 28 }, // Metode
      { wch: 20 }, // Akurasi
      { wch: 32 }, // Lokasi
      { wch: 16 }, // Jarak
      { wch: 16 }, // Geofence
      { wch: 18 }, // Sync
      { wch: 16 }, // WA
      { wch: 36 }, // Device
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Log Presensi');

    const finalFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    XLSX.writeFile(wb, finalFilename);
  },

  // Export Attendance Records to CSV (Legacy fallback)
  exportAttendanceToCSV(records: AttendanceRecord[], filename = 'Laporan_Absensi_Pegawai.csv') {
    this.exportAttendanceLogToExcel(records, filename.replace('.csv', '.xlsx'));
  },

  // Generate printable audit PDF report for Attendance
  printAttendanceAuditPDF(records: AttendanceRecord[], monthName: string, year: number) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const rowsHtml = records
      .map(
        (r, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <td style="padding: 6px 8px; text-align: center;">${idx + 1}</td>
          <td style="padding: 6px 8px; font-weight: 600;">${r.date} ${r.time} WIB</td>
          <td style="padding: 6px 8px;">
            <div style="font-weight: 600;">${r.employeeName}</div>
            <div style="color: #64748b; font-size: 10px;">${r.employeeNip} · ${r.department}</div>
          </td>
          <td style="padding: 6px 8px; text-align: center;">
            <span style="font-weight: 600; color: ${r.type === 'check_in' ? '#0284c7' : '#0d9488'};">
              ${r.type === 'check_in' ? 'Masuk' : 'Pulang'}
            </span>
          </td>
          <td style="padding: 6px 8px; text-align: center;">
            <span style="color: ${r.status === 'on_time' ? '#16a34a' : '#d97706'}; font-weight: 600;">
              ${r.status === 'on_time' ? 'Tepat Waktu' : r.status === 'late' ? `Terlambat (${r.lateMinutes}m)` : `Pulang Cepat (${r.earlyMinutes}m)`}
            </span>
          </td>
          <td style="padding: 6px 8px;">
            ${r.location.officeName}
            <div style="font-size: 10px; color: #64748b;">${r.location.distanceMeters}m (${r.location.isWithinRadius ? 'Valid' : 'Luar Radius'})</div>
          </td>
          <td style="padding: 6px 8px; text-align: center;">
            <div>${r.verificationMethod === 'face_recognition' ? 'Wajah AI' : r.verificationMethod === 'camera_qr' ? 'QR Code' : 'Scanner USB/BT'}</div>
            <div style="font-size: 10px; font-weight: 600; color: #16a34a;">${r.matchConfidence}%</div>
          </td>
          <td style="padding: 6px 8px; text-align: center; font-size: 10px;">
            ${r.syncStatus === 'synced' ? '✓ Sinkron' : '⏳ Pending'}
          </td>
        </tr>
      `
      )
      .join('');

    const onTimeCount = records.filter((r) => r.status === 'on_time').length;
    const lateCount = records.filter((r) => r.status === 'late').length;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Laporan_Audit_Absensi_${monthName}_${year}</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #0f172a; margin: 24px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th { background-color: #f1f5f9; padding: 8px; font-size: 11px; text-align: left; border-bottom: 2px solid #cbd5e1; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 12px; }
            .kpi-box { display: inline-block; background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 16px; border-radius: 6px; margin-right: 12px; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 16px; text-align: right;">
            <button onclick="window.print()" style="padding: 8px 16px; background: #0f172a; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">
              Cetak / Simpan PDF
            </button>
          </div>

          <div class="header">
            <div>
              <h2 style="margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 0.5px;">SISTEM ABSENSIKU RESMI</h2>
              <p style="margin: 4px 0 0; font-size: 12px; color: #475569;">Laporan Resmi Audit Presensi & Rekapitulasi Kehadiran Pegawai & Dewan Guru</p>
              <p style="margin: 2px 0 0; font-size: 11px; color: #64748b;">Aturan: Masuk 07.00 WIB (Tanpa Toleransi) | Pulang 13.00 - 15.00 WIB | Buka 05.30 WIB | Reset 00.00 WIB</p>
            </div>
            <div style="text-align: right; font-size: 11px; color: #475569;">
              <div><strong>Periode:</strong> ${monthName} ${year}</div>
              <div><strong>Dicetak Pada:</strong> ${new Date().toLocaleString('id-ID')} WIB</div>
              <div><strong>Status Audit:</strong> TERVERIFIKASI SISTEM</div>
            </div>
          </div>

          <div style="margin-top: 16px;">
            <div class="kpi-box">
              <div style="font-size: 10px; color: #64748b;">TOTAL TRANSAKSI</div>
              <div style="font-size: 18px; font-weight: bold;">${records.length}</div>
            </div>
            <div class="kpi-box">
              <div style="font-size: 10px; color: #16a34a;">TEPAT WAKTU (&lt;07.00)</div>
              <div style="font-size: 18px; font-weight: bold; color: #16a34a;">${onTimeCount}</div>
            </div>
            <div class="kpi-box">
              <div style="font-size: 10px; color: #d97706;">TERLAMBAT (&gt;07.00)</div>
              <div style="font-size: 18px; font-weight: bold; color: #d97706;">${lateCount}</div>
            </div>
            <div class="kpi-box">
              <div style="font-size: 10px; color: #64748b;">TINGKAT KEPATUHAN</div>
              <div style="font-size: 18px; font-weight: bold;">${records.length > 0 ? Math.round((onTimeCount / records.length) * 100) : 0}%</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="text-align: center; width: 30px;">No</th>
                <th style="width: 130px;">Waktu & Tanggal</th>
                <th>Pegawai/Guru & Divisi</th>
                <th style="text-align: center; width: 60px;">Tipe</th>
                <th style="text-align: center; width: 110px;">Status</th>
                <th>Lokasi Geofence</th>
                <th style="text-align: center; width: 110px;">Metode & Akurasi</th>
                <th style="text-align: center; width: 70px;">Sinkron</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div style="margin-top: 40px; display: flex; justify-content: space-between; page-break-inside: avoid;">
            <div style="font-size: 11px; color: #64748b; max-width: 320px;">
              Dokumen ini dihasilkan secara otomatis oleh sistem AbsensiKu dengan tanda tangan digital biometrik GPS geofencing Waktu Indonesia Barat.
            </div>
            <div style="text-align: center; width: 220px;">
              <div style="font-size: 11px; margin-bottom: 50px;">Mengetahui,<br><strong>Kepala Sekolah / Pimpinan</strong></div>
              <div style="font-weight: 600; text-decoration: underline; font-size: 12px;">Dra. Hj. Siti Rahmawati, M.Pd</div>
              <div style="font-size: 10px; color: #64748b;">NIP: 19880724-002</div>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  }
};
