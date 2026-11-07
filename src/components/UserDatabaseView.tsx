import React, { useState, useRef } from 'react';
import { 
  Users, 
  Upload, 
  Download, 
  Printer, 
  Plus, 
  Search, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  X, 
  Smartphone, 
  CheckSquare,
  Square,
  FileCheck,
  Check
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Employee, EmployeeCategory } from '../types/attendance';
import { StorageService } from '../services/storage';
import { BarcodeBatang, generateBarcodeSvg } from './BarcodeBatang';

interface UserDatabaseViewProps {
  employees: Employee[];
  onEmployeesChange: (updated: Employee[]) => void;
}

export const UserDatabaseView: React.FC<UserDatabaseViewProps> = ({
  employees,
  onEmployeesChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'guru' | 'staf'>('all');
  
  // Selection state for printing
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Excel Upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedRows, setParsedRows] = useState<Partial<Employee>[]>([]);
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  // New Employee Form state
  const [newEmp, setNewEmp] = useState<Partial<Employee>>({
    nip: '',
    name: '',
    role: 'employee',
    category: 'guru',
    department: 'Dewan Guru',
    position: '',
    phone: '628',
    email: '',
    shift: '07:00 - 14:30 WIB',
    qrCodeId: '',
  });

  const departments = ['Dewan Guru', 'Tata Usaha & Administrasi', 'Engineering', 'Operations', 'Finance', 'Keamanan'];

  // Filtered employees
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.nip.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.qrCodeId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === 'all' || emp.department === selectedDept;
    const matchesCat = selectedCategory === 'all' || emp.category === selectedCategory;
    return matchesSearch && matchesDept && matchesCat;
  });

  // Toggle selection for a single employee
  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Select all currently filtered
  const selectAllFiltered = () => {
    const next = new Set(selectedIds);
    filteredEmployees.forEach((e) => next.add(e.id));
    setSelectedIds(next);
  };

  // Deselect all
  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Select only teachers
  const selectTeachersOnly = () => {
    const next = new Set<string>();
    employees.filter((e) => e.category === 'guru').forEach((e) => next.add(e.id));
    setSelectedIds(next);
  };

  // Select only staff
  const selectStaffOnly = () => {
    const next = new Set<string>();
    employees.filter((e) => e.category === 'staf').forEach((e) => next.add(e.id));
    setSelectedIds(next);
  };

  // Handle Excel File Selected
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFileName(file.name);
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (data.length === 0) {
          setUploadError('File Excel kosong atau format tidak sesuai.');
          return;
        }

        const rows: Partial<Employee>[] = data.map((item, idx) => {
          const nip = String(item['NIP'] || item['nip'] || `NIP-2026-${100 + idx}`);
          const name = String(item['Nama'] || item['nama'] || item['Nama_Lengkap'] || 'Pegawai Baru');
          const cat: EmployeeCategory = (String(item['Kategori'] || '').toLowerCase().includes('guru') ? 'guru' : 'staf') as EmployeeCategory;
          const dept = (item['Departemen'] || item['Divisi'] || (cat === 'guru' ? 'Dewan Guru' : 'Tata Usaha & Administrasi')) as any;
          const pos = String(item['Jabatan'] || (cat === 'guru' ? 'Guru Mata Pelajaran' : 'Staf'));
          const phone = String(item['No_WhatsApp'] || item['Telepon'] || '628123456789').replace(/[^0-9]/g, '');
          const email = String(item['Email'] || `${nip.toLowerCase()}@sekolah.sch.id`);
          const shift = String(item['Shift'] || '07:00 - 14:30 WIB');
          const barcode = String(item['Kode_Barcode'] || item['Barcode'] || nip);

          return {
            id: 'emp-' + Date.now() + '-' + idx,
            nip,
            name,
            role: 'employee',
            category: cat,
            department: dept,
            position: pos,
            phone,
            email,
            avatarUrl: '/src/assets/images/avatar_reza_aditya_1793876906907.jpg',
            faceMatchScore: 98.0,
            qrCodeId: barcode,
            shift,
            isActive: true,
          };
        });

        setParsedRows(rows);
      } catch (err) {
        console.error(err);
        setUploadError('Gagal membaca file Excel. Pastikan format file .xlsx, .xls, atau .csv valid.');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Commit Excel Upload to Database
  const handleCommitExcelUpload = () => {
    if (parsedRows.length === 0) return;
    setIsImporting(true);

    const updated = [...employees, ...(parsedRows as Employee[])];
    StorageService.saveEmployees(updated);
    onEmployeesChange(updated);

    setImportSuccessMsg(`Berhasil mengimpor ${parsedRows.length} data guru/staf baru ke database.`);
    setParsedRows([]);
    setUploadFileName(null);
    setIsImporting(false);
    setIsUploadModalOpen(false);

    setTimeout(() => setImportSuccessMsg(null), 5000);
  };

  // Download Sample Excel Template
  const handleDownloadTemplate = () => {
    const sampleData = [
      {
        NIP: '19870415-101',
        Nama: 'Drs. Ahmad Fauzi, M.Pd',
        Kategori: 'Guru',
        Departemen: 'Dewan Guru',
        Jabatan: 'Guru Fisika & Kepala Lab',
        No_WhatsApp: '6281234567891',
        Email: 'ahmad.fauzi@sekolah.sch.id',
        Shift: '07:00 - 14:30 WIB',
        Kode_Barcode: '19870415-101',
      },
      {
        NIP: '19920820-102',
        Nama: 'Rina Kusuma, S.Pd',
        Kategori: 'Guru',
        Departemen: 'Dewan Guru',
        Jabatan: 'Guru Bahasa Inggris',
        No_WhatsApp: '6285712345672',
        Email: 'rina.kusuma@sekolah.sch.id',
        Shift: '07:00 - 14:30 WIB',
        Kode_Barcode: '19920820-102',
      },
      {
        NIP: '19950312-103',
        Nama: 'Bambang Irawan',
        Kategori: 'Staf',
        Departemen: 'Tata Usaha & Administrasi',
        Jabatan: 'Staf Administrasi Kesiswaan',
        No_WhatsApp: '6287890123456',
        Email: 'bambang.tu@sekolah.sch.id',
        Shift: '07:00 - 15:00 WIB',
        Kode_Barcode: '19950312-103',
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template_Guru_Staf');
    XLSX.writeFile(wb, 'Template_Upload_Guru_Staf_AbsensiKu.xlsx');
  };

  // Add Single Employee Manual
  const handleAddManualEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmp.nip || !newEmp.name) return;

    const barcode = newEmp.qrCodeId?.trim() || newEmp.nip.trim();
    const created: Employee = {
      id: 'emp-' + Date.now(),
      nip: newEmp.nip.trim(),
      name: newEmp.name.trim(),
      role: newEmp.role as any || 'employee',
      category: newEmp.category || 'guru',
      department: (newEmp.department as any) || 'Dewan Guru',
      position: newEmp.position || 'Guru',
      phone: (newEmp.phone || '').replace(/[^0-9]/g, ''),
      email: newEmp.email || `${newEmp.nip?.toLowerCase()}@sekolah.sch.id`,
      avatarUrl: '/src/assets/images/avatar_reza_aditya_1793876906907.jpg',
      faceMatchScore: 98.2,
      qrCodeId: barcode,
      shift: newEmp.shift || '07:00 - 14:30 WIB',
      isActive: true,
    };

    const updated = [created, ...employees];
    StorageService.saveEmployees(updated);
    onEmployeesChange(updated);
    setIsAddModalOpen(false);

    setNewEmp({
      nip: '',
      name: '',
      role: 'employee',
      category: 'guru',
      department: 'Dewan Guru',
      position: '',
      phone: '628',
      email: '',
      shift: '07:00 - 14:30 WIB',
      qrCodeId: '',
    });
  };

  // Delete Employee
  const handleDeleteEmployee = (id: string, name: string) => {
    if (confirm(`Hapus data "${name}" dari database?`)) {
      const updated = employees.filter((e) => e.id !== id);
      StorageService.saveEmployees(updated);
      onEmployeesChange(updated);
    }
  };

  // Print Selected ID Cards or Barcode Labels
  const handlePrintSelected = (targetEmployees: Employee[], printMode: 'id_card' | 'stickers' = 'id_card') => {
    if (targetEmployees.length === 0) {
      alert('Pilih minimal 1 orang guru/karyawan untuk dicetak.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let itemsHtml = '';

    if (printMode === 'id_card') {
      itemsHtml = targetEmployees
        .map((emp) => {
          const barcodeSvg = generateBarcodeSvg(emp.qrCodeId, {
            width: 1.35,
            height: 38,
            showText: true,
            textColor: '#0f172a',
            fontSize: 10,
          });

          return `
          <div class="id-card">
            <div class="card-header">
              <div class="card-inst">KARTU IDENTITAS RESMI PEGAWAI</div>
              <div class="card-title">SISTEM PRESENSI ABSENSIKU</div>
              <div class="card-sub">PEMERIKSAAN BIOMETRIK & BARCODE 1D</div>
            </div>
            
            <div class="card-body">
              <div class="avatar-wrap">
                <img src="${emp.avatarUrl}" class="avatar-img" alt="${emp.name}" onerror="this.src='/src/assets/images/avatar_reza_aditya_1793876906907.jpg'" />
              </div>

              <div class="emp-name" title="${emp.name}">${emp.name}</div>
              <div class="emp-pos">${emp.position}</div>
              <div class="emp-nip">NIP: ${emp.nip}</div>
              <div class="emp-dept">${emp.department}</div>
              
              <div style="margin-top: 3px;">
                <span class="emp-cat ${emp.category === 'guru' ? 'cat-guru' : 'cat-staf'}">
                  ${emp.category === 'guru' ? 'DEWAN GURU' : 'STAF / KARYAWAN'}
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
        `;
        })
        .join('');
    } else {
      // Compact Sticker Labels Sheet
      itemsHtml = targetEmployees
        .map((emp) => {
          const barcodeSvg = generateBarcodeSvg(emp.qrCodeId, {
            width: 1.25,
            height: 32,
            showText: true,
            textColor: '#0f172a',
            fontSize: 9.5,
          });

          return `
          <div class="sticker-card">
            <div class="sticker-top">
              <span class="sticker-name">${emp.name}</span>
              <span class="sticker-badge">${emp.category.toUpperCase()}</span>
            </div>
            <div class="sticker-meta">NIP: ${emp.nip} · ${emp.department}</div>
            <div class="sticker-svg-wrap">
              ${barcodeSvg}
            </div>
          </div>
        `;
        })
        .join('');
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${printMode === 'id_card' ? 'Kartu_ID' : 'Stiker_Barcode'}_${targetEmployees.length}_Pegawai</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm;
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              padding: 16px;
              margin: 0;
              background: #f8fafc;
              color: #0f172a;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .no-print-bar {
              margin-bottom: 20px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              background: white;
              padding: 14px 20px;
              border-radius: 8px;
              border: 1px solid #cbd5e1;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
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
              display: inline-flex;
              align-items: center;
              gap: 8px;
            }
            .btn-print:hover {
              background: #1e293b;
            }
            
            /* ID Badges Grid */
            .grid-badges {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 16px;
              justify-items: center;
            }
            .id-card {
              width: 220px;
              height: 365px;
              background: #ffffff;
              border: 1.5px solid #0f172a;
              border-radius: 10px;
              overflow: hidden;
              display: flex;
              flex-direction: column;
              page-break-inside: avoid;
              break-inside: avoid;
              box-shadow: 0 2px 6px rgba(0,0,0,0.08);
            }
            .card-header {
              background: #0f172a;
              color: #ffffff;
              padding: 7px 8px;
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
              font-size: 10.5px;
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
              padding: 8px 10px 10px;
              display: flex;
              flex-direction: column;
              align-items: center;
              flex: 1;
              text-align: center;
              background: #ffffff;
            }
            .avatar-wrap {
              margin-bottom: 5px;
            }
            .avatar-img {
              width: 60px;
              height: 60px;
              border-radius: 50%;
              object-fit: cover;
              border: 2px solid #0284c7;
              display: block;
            }
            .emp-name {
              font-size: 12px;
              font-weight: 800;
              color: #0f172a;
              line-height: 1.2;
              margin-bottom: 2px;
              max-width: 100%;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .emp-pos {
              font-size: 9.5px;
              color: #0284c7;
              font-weight: 600;
              line-height: 1.2;
            }
            .emp-nip {
              font-size: 8.5px;
              font-family: 'Courier New', Courier, monospace;
              font-weight: bold;
              color: #475569;
              margin-top: 2px;
            }
            .emp-dept {
              font-size: 8px;
              color: #64748b;
              margin-top: 1px;
            }
            .emp-cat {
              display: inline-block;
              padding: 1px 6px;
              border-radius: 3px;
              font-size: 7.5px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.4px;
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
              padding: 4px;
              background: #ffffff;
              border: 1px solid #cbd5e1;
              border-radius: 6px;
              box-sizing: border-box;
            }
            .card-footer {
              background: #f8fafc;
              border-top: 1px solid #e2e8f0;
              padding: 4px 6px;
              font-size: 7px;
              color: #64748b;
              text-align: center;
              font-weight: 500;
            }

            /* Sticker Labels Grid */
            .grid-stickers {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 10px;
            }
            .sticker-card {
              background: white;
              border: 1px dashed #94a3b8;
              border-radius: 6px;
              padding: 8px 10px;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .sticker-top {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 3px;
              margin-bottom: 2px;
            }
            .sticker-name {
              font-size: 11px;
              font-weight: bold;
              color: #0f172a;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              max-width: 130px;
            }
            .sticker-badge {
              font-size: 8px;
              font-weight: bold;
              color: #0284c7;
              text-transform: uppercase;
            }
            .sticker-meta {
              font-size: 8px;
              color: #64748b;
              font-family: 'Courier New', Courier, monospace;
            }
            .sticker-svg-wrap {
              margin-top: 4px;
            }

            @media print {
              body {
                background: white !important;
                padding: 0 !important;
              }
              .no-print-bar {
                display: none !important;
              }
              .grid-badges {
                gap: 12px;
              }
              .id-card {
                box-shadow: none !important;
                border: 1px dashed #94a3b8 !important; /* Dotted line cutting guide for scissors */
              }
            }
          </style>
        </head>
        <body>
          <div class="no-print-bar">
            <div>
              <strong style="font-size: 14px; color: #0f172a;">
                ${printMode === 'id_card' ? 'Format Cetak Kartu ID & Barcode Batang 1D' : 'Format Lembar Stiker Barcode Batang'}
              </strong>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                Total: ${targetEmployees.length} Guru & Pegawai · Barcode berstandar Code 39 presisi tinggi dengan quiet zones
              </div>
            </div>
            <button onclick="window.print()" class="btn-print">
              🖨️ Cetak Sekarang (Print / Simpan PDF)
            </button>
          </div>

          <div class="${printMode === 'id_card' ? 'grid-badges' : 'grid-stickers'}">
            ${itemsHtml}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const selectedEmployeesList = employees.filter((e) => selectedIds.has(e.id));

  return (
    <div className="space-y-6">
      
      {/* Top Header & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Database Pengguna & Barcode Batang</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manajemen data dewan guru, staf, upload Excel massal, dan pemilihan kartu ID barcode batang siap cetak
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Download Template Excel */}
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shadow-sm"
            title="Unduh format spreadsheet .xlsx resmi"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Format Excel</span>
          </button>

          {/* Upload Excel Modal Trigger */}
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload File Excel</span>
          </button>

          {/* Add Employee Manual */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Pegawai Baru</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {importSuccessMsg && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs rounded-lg flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{importSuccessMsg}</span>
          </div>
          <span className="font-mono text-[11px] text-emerald-400">Database AbsensiKu Updated ✓</span>
        </div>
      )}

      {/* Interactive Selection & Print Bar */}
      <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex flex-col md:flex-row gap-3 items-center justify-between text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-300 mr-1 flex items-center gap-1.5">
            <CheckSquare className="w-4 h-4 text-blue-400" />
            <span>Pilihan Cetak Barcode ({selectedIds.size} Dipilih):</span>
          </span>

          <button
            onClick={selectAllFiltered}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-medium"
          >
            Pilih Semua ({filteredEmployees.length})
          </button>

          <button
            onClick={selectTeachersOnly}
            className="px-2.5 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 font-medium"
          >
            Pilih Khusus Guru
          </button>

          <button
            onClick={selectStaffOnly}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-medium"
          >
            Pilih Khusus Staf
          </button>

          {selectedIds.size > 0 && (
            <button
              onClick={clearSelection}
              className="text-slate-500 hover:text-slate-300 underline ml-1"
            >
              Batal Pilih
            </button>
          )}
        </div>

        {/* Print Buttons: ID Badges & Sticker Labels */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => handlePrintSelected(selectedEmployeesList.length > 0 ? selectedEmployeesList : filteredEmployees, 'id_card')}
            className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-md cursor-pointer"
            title="Cetak kartu identitas lengkap berstandar resmi dengan foto dan barcode batang"
          >
            <Printer className="w-4 h-4" />
            <span>
              {selectedIds.size > 0
                ? `Cetak ${selectedIds.size} ID Card`
                : `Cetak Semua ID Card (${filteredEmployees.length})`}
            </span>
          </button>

          <button
            onClick={() => handlePrintSelected(selectedEmployeesList.length > 0 ? selectedEmployeesList : filteredEmployees, 'stickers')}
            className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition-all shadow-sm cursor-pointer"
            title="Cetak lembar label stiker barcode batang untuk ditempel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Cetak Stiker Barcode</span>
          </button>
        </div>
      </div>

      {/* Employee Database Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row gap-3 justify-between items-center">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Cari NIP, nama guru, atau kode barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="all">Semua Kategori</option>
              <option value="guru">Khusus Guru</option>
              <option value="staf">Khusus Staf</option>
            </select>

            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="all">Semua Departemen</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400">
                <th className="py-2.5 px-3 w-10 text-center">
                  <span className="sr-only">Pilih</span>
                </th>
                <th className="py-2.5 px-4 font-medium">Pegawai / Guru</th>
                <th className="py-2.5 px-3 font-medium">NIP & Kategori</th>
                <th className="py-2.5 px-3 font-medium">No. WhatsApp</th>
                <th className="py-2.5 px-3 font-medium">Shift Kerja</th>
                <th className="py-2.5 px-4 font-medium text-center">Barcode Batang (1D)</th>
                <th className="py-2.5 px-4 font-medium text-center">Aksi & Cetak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredEmployees.map((emp) => {
                const isSelected = selectedIds.has(emp.id);

                return (
                  <tr key={emp.id} className={`hover:bg-slate-800/30 transition-colors ${isSelected ? 'bg-blue-950/20' : ''}`}>
                    
                    {/* Checkbox */}
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => toggleSelectOne(emp.id)}
                        className="text-slate-400 hover:text-blue-400 transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-blue-500" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600" />
                        )}
                      </button>
                    </td>

                    {/* Avatar & Name */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={emp.avatarUrl}
                          alt={emp.name}
                          className="w-9 h-9 rounded-full object-cover border border-slate-700 shrink-0"
                        />
                        <div className="truncate max-w-[160px]">
                          <span className="font-semibold text-slate-200 block truncate">{emp.name}</span>
                          <span className="text-[11px] text-blue-400 block truncate">{emp.position}</span>
                        </div>
                      </div>
                    </td>

                    {/* NIP & Category */}
                    <td className="py-3 px-3">
                      <div className="font-mono text-slate-200 font-semibold">{emp.nip}</div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        {emp.category} · {emp.department}
                      </span>
                    </td>

                    {/* Phone */}
                    <td className="py-3 px-3 font-mono text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                        <span>+{emp.phone}</span>
                      </div>
                    </td>

                    {/* Shift */}
                    <td className="py-3 px-3 font-mono text-slate-300">
                      {emp.shift}
                    </td>

                    {/* Vector Barcode Batang 1D */}
                    <td className="py-3 px-4 text-center">
                      <div className="inline-block p-1 bg-white rounded border border-slate-300 shadow-xs">
                        <BarcodeBatang
                          value={emp.qrCodeId}
                          width={1.2}
                          height={26}
                          showText={true}
                          className="p-1"
                        />
                      </div>
                    </td>

                    {/* Print & Delete Actions */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handlePrintSelected([emp], 'id_card')}
                          className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 text-xs font-semibold transition-colors cursor-pointer"
                          title="Cetak Kartu ID & Barcode Batang ini"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Cetak ID</span>
                        </button>

                        <button
                          onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Hapus Pegawai"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Upload Excel */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-600/20 text-emerald-400 rounded-lg border border-emerald-500/20">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-100 text-base">Upload Database Guru & Staf via Excel</h3>
                  <p className="text-xs text-slate-400">Import file .xlsx, .xls, atau .csv ke database AbsensiKu</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setParsedRows([]);
                  setUploadFileName(null);
                  setUploadError(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-xl p-8 text-center cursor-pointer transition-colors bg-slate-950/60"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <FileSpreadsheet className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <div className="font-semibold text-slate-200 text-sm">
                  {uploadFileName ? uploadFileName : 'Pilih atau Tarik File Excel ke Sini'}
                </div>
                <p className="text-slate-400 text-xs mt-1">
                  Mendukung format .xlsx, .xls, dan .csv
                </p>
              </div>

              {uploadError && (
                <div className="p-3 bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {parsedRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">
                      Pratinjau Data Terbaca ({parsedRows.length} Orang):
                    </span>
                    <span className="text-emerald-400 font-mono">Format Valid ✓</span>
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-slate-800 rounded-lg">
                    <table className="w-full text-left text-[11px] border-collapse bg-slate-950">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/60">
                          <th className="p-2">NIP</th>
                          <th className="p-2">Nama</th>
                          <th className="p-2">Kategori</th>
                          <th className="p-2">Jabatan</th>
                          <th className="p-2">No. WhatsApp</th>
                          <th className="p-2">Barcode</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {parsedRows.slice(0, 10).map((r, i) => (
                          <tr key={i}>
                            <td className="p-2 font-mono font-medium">{r.nip}</td>
                            <td className="p-2 font-medium">{r.name}</td>
                            <td className="p-2 uppercase">{r.category}</td>
                            <td className="p-2">{r.position}</td>
                            <td className="p-2 font-mono">{r.phone}</td>
                            <td className="p-2 font-mono text-blue-400">{r.qrCodeId}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-between items-center border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Format Template Excel</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUploadModalOpen(false);
                      setParsedRows([]);
                    }}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={parsedRows.length === 0 || isImporting}
                    onClick={handleCommitExcelUpload}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    <FileCheck className="w-4 h-4" />
                    <span>Import {parsedRows.length} Data ke Database</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Modal: Add Manual Employee */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-xl w-full max-w-lg flex flex-col shadow-2xl overflow-hidden">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h3 className="font-semibold text-slate-100 text-base">Tambah Pegawai / Guru Baru</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddManualEmployee} className="p-6 space-y-3 text-xs">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Nomor Induk Pegawai (NIP)</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 19850312-001"
                    value={newEmp.nip}
                    onChange={(e) => setNewEmp({ ...newEmp, nip: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso, S.Pd"
                    value={newEmp.name}
                    onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Kategori</label>
                  <select
                    value={newEmp.category}
                    onChange={(e) => {
                      const cat = e.target.value as EmployeeCategory;
                      setNewEmp({
                        ...newEmp,
                        category: cat,
                        department: cat === 'guru' ? 'Dewan Guru' : 'Tata Usaha & Administrasi',
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="guru">Dewan Guru</option>
                    <option value="staf">Staf Tata Usaha</option>
                    <option value="manajemen">Manajemen / Pimpinan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Jabatan</label>
                  <input
                    type="text"
                    placeholder="Contoh: Guru Matematika"
                    value={newEmp.position}
                    onChange={(e) => setNewEmp({ ...newEmp, position: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">No. WhatsApp</label>
                  <input
                    type="text"
                    required
                    placeholder="6281234567890"
                    value={newEmp.phone}
                    onChange={(e) => setNewEmp({ ...newEmp, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Kode Barcode Batang</label>
                  <input
                    type="text"
                    placeholder="Otomatis NIP jika kosong"
                    value={newEmp.qrCodeId}
                    onChange={(e) => setNewEmp({ ...newEmp, qrCodeId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Simpan Data</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
