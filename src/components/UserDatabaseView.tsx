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
  Check,
  Edit3,
  Shield,
  ShieldAlert,
  GraduationCap,
  Camera,
  Phone,
  Mail,
  User,
  Sliders,
  Layers,
  RefreshCw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Employee, EmployeeCategory, UserRole, SchoolClass } from '../types/attendance';
import { StorageService } from '../services/storage';
import { BarcodeBatang, generateBarcodeSvg } from './BarcodeBatang';

interface UserDatabaseViewProps {
  employees: Employee[];
  onEmployeesChange: (updated: Employee[]) => void;
  classes?: SchoolClass[];
  onClassesChange?: (classes: SchoolClass[]) => void;
}

export const UserDatabaseView: React.FC<UserDatabaseViewProps> = ({
  employees,
  onEmployeesChange,
  classes = [],
  onClassesChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'all' | 'super_admin' | 'admin' | 'guru' | 'siswa' | 'staf'>('all');
  
  // Selection state for printing
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Employee | null>(null);

  // Edit User Form State
  const [editFormData, setEditFormData] = useState<Partial<Employee>>({});
  const [editPhotoPreview, setEditPhotoPreview] = useState<string>('');
  const [editPhotoSizeKb, setEditPhotoSizeKb] = useState<number | null>(null);
  const [editPhotoError, setEditPhotoError] = useState<string | null>(null);
  const [editSaveSuccess, setEditSaveSuccess] = useState<string | null>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

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
    role: 'guru',
    category: 'guru',
    department: 'Dewan Guru',
    position: 'Guru Mata Pelajaran',
    phone: '628',
    email: '',
    shift: '07:00 - 14:30 WIB',
    qrCodeId: '',
    isActive: true,
  });

  const departmentPresets = [
    'Dewan Guru', 
    'Tata Usaha & Administrasi', 
    'Kelas 7-A (Tahfidz & Sains)', 
    'Kelas 7-B (Bilingual & Riset)', 
    'Kelas 8-A (Tahfidz & Riset)', 
    'Kelas 8-B (Reguler Kreatif)', 
    'Kelas 9-A (Unggulan & Olimpiade)', 
    'Keamanan',
    'Manajemen Madrasah'
  ];

  // Helper to determine role match
  const matchesRoleFilter = (emp: Employee) => {
    if (selectedRoleFilter === 'all') return true;
    if (selectedRoleFilter === 'super_admin') {
      return emp.role === 'super_admin' || emp.category === 'super_admin';
    }
    if (selectedRoleFilter === 'admin') {
      return emp.role === 'admin' || emp.category === 'admin';
    }
    if (selectedRoleFilter === 'guru') {
      return emp.role === 'guru' || emp.category === 'guru' || emp.department === 'Dewan Guru';
    }
    if (selectedRoleFilter === 'siswa') {
      return emp.role === 'siswa' || emp.category === 'siswa' || emp.department.toLowerCase().includes('kelas');
    }
    if (selectedRoleFilter === 'staf') {
      return emp.role === 'staf' || emp.category === 'staf' || emp.role === 'kiosk' || emp.department.includes('Tata Usaha') || emp.department === 'Keamanan';
    }
    return true;
  };

  // Filtered employees
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.nip.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.qrCodeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.position.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === 'all' || emp.department === selectedDept;
    const matchesRole = matchesRoleFilter(emp);
    return matchesSearch && matchesDept && matchesRole;
  });

  // Calculate counts for badges
  const countAll = employees.length;
  const countSuperAdmin = employees.filter((e) => e.role === 'super_admin' || e.category === 'super_admin').length;
  const countAdmin = employees.filter((e) => e.role === 'admin' || e.category === 'admin').length;
  const countGuru = employees.filter((e) => e.role === 'guru' || e.category === 'guru' || e.department === 'Dewan Guru').length;
  const countSiswa = employees.filter((e) => e.role === 'siswa' || e.category === 'siswa' || e.department.toLowerCase().includes('kelas')).length;
  const countStaf = employees.filter((e) => e.role === 'staf' || e.category === 'staf' || e.role === 'kiosk' || e.department.includes('Tata Usaha') || e.department === 'Keamanan').length;

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

  // Quick Select Group Buttons
  const selectTeachersOnly = () => {
    const next = new Set<string>();
    employees.filter((e) => e.category === 'guru' || e.role === 'guru').forEach((e) => next.add(e.id));
    setSelectedIds(next);
  };

  const selectStudentsOnly = () => {
    const next = new Set<string>();
    employees.filter((e) => e.category === 'siswa' || e.role === 'siswa').forEach((e) => next.add(e.id));
    setSelectedIds(next);
  };

  const selectStaffOnly = () => {
    const next = new Set<string>();
    employees.filter((e) => e.category === 'staf' || e.role === 'staf' || e.role === 'kiosk').forEach((e) => next.add(e.id));
    setSelectedIds(next);
  };

  // Handle Edit Modal Open
  const handleOpenEditModal = (emp: Employee) => {
    setEditingUser(emp);
    setEditFormData({ ...emp });
    setEditPhotoPreview(emp.avatarUrl);
    setEditPhotoSizeKb(null);
    setEditPhotoError(null);
    setEditSaveSuccess(null);
  };

  // Handle Edit Photo Upload (Max 200 KB)
  const handleEditPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setEditPhotoError(null);
    const sizeInKb = Math.round(file.size / 1024);

    if (sizeInKb > 200) {
      setEditPhotoError(`Ukuran foto (${sizeInKb} KB) melebihi batas maksimal 200 KB.`);
      if (editFileInputRef.current) editFileInputRef.current.value = '';
      return;
    }

    setEditPhotoSizeKb(sizeInKb);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target?.result as string;
      setEditPhotoPreview(base64);
      setEditFormData((prev) => ({ ...prev, avatarUrl: base64 }));
    };
    reader.readAsDataURL(file);
  };

  // Save Edited User State & Handler
  const [isSavingUser, setIsSavingUser] = useState(false);

  const handleSaveEditUser = (e?: React.FormEvent | React.MouseEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!editingUser) return;

    const trimmedName = (editFormData.name || '').trim();
    const trimmedNip = (editFormData.nip || '').trim();

    if (!trimmedName) {
      setEditPhotoError('Nama lengkap pengguna wajib diisi dan tidak boleh kosong.');
      return;
    }

    if (!trimmedNip) {
      setEditPhotoError('Nomor NIP atau NISN pengguna wajib diisi.');
      return;
    }

    setIsSavingUser(true);
    setEditPhotoError(null);

    const barcode = (editFormData.qrCodeId?.trim()) || trimmedNip;

    const updatedUser: Employee = {
      ...editingUser,
      name: trimmedName,
      nip: trimmedNip,
      role: (editFormData.role as UserRole) || editingUser.role,
      category: (editFormData.category as EmployeeCategory) || editingUser.category,
      department: editFormData.department?.trim() || editingUser.department,
      position: editFormData.position?.trim() || editingUser.position,
      phone: (editFormData.phone || '').replace(/[^0-9]/g, ''),
      email: editFormData.email?.trim() || editingUser.email,
      shift: editFormData.shift || editingUser.shift,
      qrCodeId: barcode,
      isActive: editFormData.isActive !== undefined ? editFormData.isActive : editingUser.isActive,
      avatarUrl: editFormData.avatarUrl || editingUser.avatarUrl,
      notes: editFormData.notes || editingUser.notes || '',
    };

    try {
      // 1. Update in StorageService & Firestore
      StorageService.updateEmployee(updatedUser);

      // 2. Update state list
      const updatedList = employees.map((emp) => (emp.id === updatedUser.id ? updatedUser : emp));
      onEmployeesChange(updatedList);

      // 3. If this user is a student, sync to classes
      if (updatedUser.role === 'siswa' || updatedUser.category === 'siswa') {
        const currentClasses = StorageService.getClasses();
        let classModified = false;
        const updatedClasses = currentClasses.map((cls) => {
          const memberIdx = cls.members.findIndex((m) => m.id === updatedUser.id || m.nisn === updatedUser.nip);
          if (memberIdx >= 0) {
            classModified = true;
            const newMembers = [...cls.members];
            newMembers[memberIdx] = {
              ...newMembers[memberIdx],
              name: updatedUser.name,
              nisn: updatedUser.nip,
              phone: updatedUser.phone,
              qrCodeId: updatedUser.qrCodeId,
              isActive: updatedUser.isActive,
              photoUrl: updatedUser.avatarUrl,
            };
            const updatedCls = { ...cls, members: newMembers, updatedAt: new Date().toISOString() };
            StorageService.saveClass(updatedCls);
            return updatedCls;
          }
          return cls;
        });

        if (classModified && onClassesChange) {
          onClassesChange(updatedClasses);
        }
      }

      // 4. Trigger in-app Toast notification
      window.dispatchEvent(
        new CustomEvent('absensiku:toast', {
          detail: {
            title: 'Perubahan Pengguna Disimpan ✓',
            body: `Data "${updatedUser.name}" (${updatedUser.role.toUpperCase()}) berhasil disimpan dan diperbarui.`,
          },
        })
      );

      // 5. Success feedback and close modal
      setImportSuccessMsg(`Data pengguna "${updatedUser.name}" berhasil diperbarui.`);
      setEditingUser(null);
      setIsSavingUser(false);
      setTimeout(() => setImportSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error('Gagal menyimpan user:', err);
      setIsSavingUser(false);
      setEditPhotoError('Gagal menyimpan perubahan: ' + (err?.message || 'Terjadi kesalahan sistem'));
    }
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
          const nip = String(item['NIP'] || item['NISN'] || item['nip'] || `2026-${100 + idx}`);
          const name = String(item['Nama'] || item['nama'] || item['Nama_Lengkap'] || 'Pengguna Baru');
          const rawRole = String(item['Peran'] || item['Role'] || '').toLowerCase();
          const rawCat = String(item['Kategori'] || '').toLowerCase();

          let role: UserRole = 'guru';
          let cat: EmployeeCategory = 'guru';

          if (rawRole.includes('super') || rawCat.includes('super')) {
            role = 'super_admin';
            cat = 'super_admin';
          } else if (rawRole.includes('admin') || rawCat.includes('admin')) {
            role = 'admin';
            cat = 'admin';
          } else if (rawRole.includes('siswa') || rawCat.includes('siswa')) {
            role = 'siswa';
            cat = 'siswa';
          } else if (rawRole.includes('staf') || rawCat.includes('staf') || rawCat.includes('tu')) {
            role = 'staf';
            cat = 'staf';
          }

          const dept = String(
            item['Departemen'] || 
            item['Kelas'] || 
            (cat === 'siswa' ? 'Kelas 7-A (Tahfidz & Sains)' : cat === 'guru' ? 'Dewan Guru' : 'Tata Usaha & Administrasi')
          );
          const pos = String(item['Jabatan'] || (cat === 'siswa' ? 'Siswa' : cat === 'guru' ? 'Guru Mata Pelajaran' : 'Staf'));
          const phone = String(item['No_WhatsApp'] || item['Telepon'] || '628123456789').replace(/[^0-9]/g, '');
          const email = String(item['Email'] || `${nip.toLowerCase()}@sekolah.sch.id`);
          const shift = String(item['Shift'] || (cat === 'siswa' ? '07:00 - 13:30 WIB' : '07:00 - 14:30 WIB'));
          const barcode = String(item['Kode_Barcode'] || item['Barcode'] || nip);

          return {
            id: 'emp-' + Date.now() + '-' + idx,
            nip,
            name,
            role,
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

    setImportSuccessMsg(`Berhasil mengimpor ${parsedRows.length} data pengguna baru ke database.`);
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
        NIP_atau_NISN: '19870415-101',
        Nama: 'Drs. Ahmad Fauzi, M.Pd',
        Peran: 'Super Admin',
        Kategori: 'Super Admin',
        Departemen: 'Dewan Guru',
        Jabatan: 'Kepala Madrasah & Super Admin',
        No_WhatsApp: '6281234567891',
        Email: 'ahmad.fauzi@sekolah.sch.id',
        Shift: '07:00 - 15:00 WIB',
        Kode_Barcode: '19870415-101',
      },
      {
        NIP_atau_NISN: '19920820-102',
        Nama: 'Rina Kusuma, S.Pd',
        Peran: 'Admin',
        Kategori: 'Admin',
        Departemen: 'Dewan Guru',
        Jabatan: 'Admin Presensi & Guru Bahasa',
        No_WhatsApp: '6285712345672',
        Email: 'rina.kusuma@sekolah.sch.id',
        Shift: '07:00 - 14:30 WIB',
        Kode_Barcode: '19920820-102',
      },
      {
        NIP_atau_NISN: '19900215-201',
        Nama: 'Hasan Basri, S.Pd.I',
        Peran: 'Guru',
        Kategori: 'Guru',
        Departemen: 'Dewan Guru',
        Jabatan: 'Guru Fiqih & Wali Kelas 8-A',
        No_WhatsApp: '6281234567888',
        Email: 'hasan.basri@sekolah.sch.id',
        Shift: '07:00 - 14:30 WIB',
        Kode_Barcode: '19900215-201',
      },
      {
        NIP_atau_NISN: '0081928371',
        Nama: 'Ahmad Fauzan Al-Ghifari',
        Peran: 'Siswa',
        Kategori: 'Siswa',
        Departemen: 'Kelas 7-A (Tahfidz & Sains)',
        Jabatan: 'Siswa / Ketua Kelas 7-A',
        No_WhatsApp: '6281234567890',
        Email: 'fauzan@siswa.mts.sch.id',
        Shift: '07:00 - 13:30 WIB',
        Kode_Barcode: 'NISN-0081928371',
      },
      {
        NIP_atau_NISN: '19950312-103',
        Nama: 'Bambang Irawan',
        Peran: 'Staf',
        Kategori: 'Staf',
        Departemen: 'Tata Usaha & Administrasi',
        Jabatan: 'Staf Tata Usaha & Kesiswaan',
        No_WhatsApp: '6287890123456',
        Email: 'bambang.tu@sekolah.sch.id',
        Shift: '07:00 - 15:00 WIB',
        Kode_Barcode: '19950312-103',
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template_Database_Pengguna');
    XLSX.writeFile(wb, 'Template_Upload_Pengguna_AbsensiKu.xlsx');
  };

  // Add Single User Manual
  const handleAddManualEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmp.nip || !newEmp.name) return;

    const barcode = newEmp.qrCodeId?.trim() || newEmp.nip.trim();
    const created: Employee = {
      id: 'emp-' + Date.now(),
      nip: newEmp.nip.trim(),
      name: newEmp.name.trim(),
      role: (newEmp.role as UserRole) || 'guru',
      category: (newEmp.category as EmployeeCategory) || 'guru',
      department: newEmp.department?.trim() || 'Dewan Guru',
      position: newEmp.position?.trim() || (newEmp.role === 'siswa' ? 'Siswa' : 'Guru'),
      phone: (newEmp.phone || '').replace(/[^0-9]/g, ''),
      email: newEmp.email?.trim() || `${newEmp.nip?.toLowerCase()}@sekolah.sch.id`,
      avatarUrl: newEmp.avatarUrl || '/src/assets/images/avatar_reza_aditya_1793876906907.jpg',
      faceMatchScore: 98.2,
      qrCodeId: barcode,
      shift: newEmp.shift || (newEmp.role === 'siswa' ? '07:00 - 13:30 WIB' : '07:00 - 14:30 WIB'),
      isActive: true,
    };

    const updated = [created, ...employees];
    StorageService.saveEmployees(updated);
    onEmployeesChange(updated);
    setIsAddModalOpen(false);

    setNewEmp({
      nip: '',
      name: '',
      role: 'guru',
      category: 'guru',
      department: 'Dewan Guru',
      position: 'Guru Mata Pelajaran',
      phone: '628',
      email: '',
      shift: '07:00 - 14:30 WIB',
      qrCodeId: '',
      isActive: true,
    });
  };

  // Delete User
  const handleDeleteEmployee = (id: string, name: string) => {
    if (confirm(`Hapus data pengguna "${name}" dari database MTs Darul Huda?`)) {
      const updated = employees.filter((e) => e.id !== id);
      StorageService.saveEmployees(updated);
      onEmployeesChange(updated);
    }
  };

  // Print Selected ID Cards or Barcode Labels
  const handlePrintSelected = (targetEmployees: Employee[], printMode: 'id_card' | 'stickers' = 'id_card') => {
    if (targetEmployees.length === 0) {
      alert('Pilih minimal 1 orang pengguna untuk dicetak.');
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

          const isStudent = emp.role === 'siswa' || emp.category === 'siswa';

          return `
          <div class="id-card">
            <div class="card-header ${isStudent ? 'card-header-student' : ''}">
              <div class="card-inst">MTS DARUL HUDA</div>
              <div class="card-title">${isStudent ? 'KARTU IDENTITAS SISWA' : 'KARTU IDENTITAS RESMI'}</div>
              <div class="card-sub">PRESENSI BIOMETRIK & BARCODE 1D</div>
            </div>
            
            <div class="card-body">
              <div class="avatar-wrap">
                <img src="${emp.avatarUrl}" class="avatar-img" alt="${emp.name}" onerror="this.src='/src/assets/images/avatar_reza_aditya_1793876906907.jpg'" />
              </div>

              <div class="emp-name" title="${emp.name}">${emp.name}</div>
              <div class="emp-pos">${emp.position}</div>
              <div class="emp-nip">${isStudent ? 'NISN' : 'NIP'}: ${emp.nip}</div>
              <div class="emp-dept">${emp.department}</div>
              
              <div style="margin-top: 3px;">
                <span class="emp-cat ${
                  emp.role === 'super_admin' ? 'cat-superadmin' :
                  emp.role === 'admin' ? 'cat-admin' :
                  emp.role === 'siswa' ? 'cat-siswa' :
                  emp.category === 'guru' ? 'cat-guru' : 'cat-staf'
                }">
                  ${
                    emp.role === 'super_admin' ? 'SUPER ADMIN' :
                    emp.role === 'admin' ? 'ADMINISTRATOR' :
                    emp.role === 'siswa' ? 'SISWA / PESERTA DIDIK' :
                    emp.category === 'guru' ? 'DEWAN GURU' : 'STAF / TU'
                  }
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

          const isStudent = emp.role === 'siswa' || emp.category === 'siswa';

          return `
          <div class="sticker-card">
            <div class="sticker-top">
              <span class="sticker-name">${emp.name}</span>
              <span class="sticker-badge">${emp.role.toUpperCase()}</span>
            </div>
            <div class="sticker-meta">${isStudent ? 'NISN' : 'NIP'}: ${emp.nip} · ${emp.department}</div>
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
          <title>${printMode === 'id_card' ? 'Kartu_ID' : 'Stiker_Barcode'}_${targetEmployees.length}_Pengguna</title>
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
            .card-header-student {
              background: #1e1b4b;
              border-bottom: 2.5px solid #f59e0b;
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
            .cat-superadmin {
              background: #f3e8ff;
              color: #7e22ce;
              border: 1px solid #d8b4fe;
            }
            .cat-admin {
              background: #e0f2fe;
              color: #0284c7;
              border: 1px solid #7dd3fc;
            }
            .cat-guru {
              background: #ecfdf5;
              color: #047857;
              border: 1px solid #a7f3d0;
            }
            .cat-siswa {
              background: #fef3c7;
              color: #b45309;
              border: 1px solid #fde68a;
            }
            .cat-staf {
              background: #f1f5f9;
              color: #334155;
              border: 1px solid #cbd5e1;
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
                border: 1px dashed #94a3b8 !important;
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
                Total: ${targetEmployees.length} Pengguna MTs Darul Huda · Barcode berstandar Code 39 presisi tinggi
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

  // Render Role Badge
  const renderRoleBadge = (emp: Employee) => {
    if (emp.role === 'super_admin' || emp.category === 'super_admin') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
          <ShieldAlert className="w-3 h-3 text-purple-400" />
          <span>SUPER ADMIN</span>
        </span>
      );
    }
    if (emp.role === 'admin' || emp.category === 'admin') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[10px] font-bold">
          <Shield className="w-3 h-3 text-blue-400" />
          <span>ADMIN</span>
        </span>
      );
    }
    if (emp.role === 'siswa' || emp.category === 'siswa') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
          <GraduationCap className="w-3 h-3 text-amber-400" />
          <span>SISWA</span>
        </span>
      );
    }
    if (emp.role === 'guru' || emp.category === 'guru') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
          <Users className="w-3 h-3 text-emerald-400" />
          <span>DEWAN GURU</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-500/15 text-slate-300 border border-slate-600/30 text-[10px] font-bold">
        <span>STAF TU</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-white">Database Pengguna & Barcode Batang</h2>
            <span className="px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800 text-[10px] font-mono font-bold">
              {employees.length} Terdaftar
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Manajemen data, hak akses Super Admin, Admin, Guru, Siswa, serta cetak kartu barcode batang 1D resmi
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Download Template Excel */}
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shadow-sm cursor-pointer"
            title="Unduh format spreadsheet .xlsx resmi"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Format Excel</span>
          </button>

          {/* Upload Excel Modal Trigger */}
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload File Excel</span>
          </button>

          {/* Add Employee Manual */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Pengguna Baru</span>
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

      {/* Role Filter Tabs (Dedicated segmentation for Super Admin, Admin, Guru, Siswa, Staf) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setSelectedRoleFilter('all')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            selectedRoleFilter === 'all'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Semua Pengguna</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 text-slate-200 font-mono">
            {countAll}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedRoleFilter('super_admin')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            selectedRoleFilter === 'super_admin'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:text-purple-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
          <span>Super Admin</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-purple-950 text-purple-200 border border-purple-800 font-mono">
            {countSuperAdmin}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedRoleFilter('admin')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            selectedRoleFilter === 'admin'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:text-sky-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Shield className="w-3.5 h-3.5 text-sky-400" />
          <span>Admin</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-sky-950 text-sky-200 border border-sky-800 font-mono">
            {countAdmin}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedRoleFilter('guru')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            selectedRoleFilter === 'guru'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:text-emerald-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-emerald-400" />
          <span>Dewan Guru</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-950 text-emerald-200 border border-emerald-800 font-mono">
            {countGuru}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedRoleFilter('siswa')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            selectedRoleFilter === 'siswa'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:text-amber-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
          <span>Siswa / Peserta Didik</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-950 text-amber-200 border border-amber-800 font-mono">
            {countSiswa}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedRoleFilter('staf')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            selectedRoleFilter === 'staf'
              ? 'bg-slate-700 text-white shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-slate-400" />
          <span>Staf TU & Karyawan</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-950 text-slate-300 border border-slate-800 font-mono">
            {countStaf}
          </span>
        </button>
      </div>

      {/* Interactive Selection & Print Bar */}
      <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex flex-col md:flex-row gap-3 items-center justify-between text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-300 mr-1 flex items-center gap-1.5">
            <CheckSquare className="w-4 h-4 text-blue-400" />
            <span>Pilihan Cetak Barcode ({selectedIds.size} Dipilih):</span>
          </span>

          <button
            onClick={selectAllFiltered}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-medium cursor-pointer"
          >
            Pilih Semua ({filteredEmployees.length})
          </button>

          <button
            onClick={selectTeachersOnly}
            className="px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium cursor-pointer"
          >
            Khusus Guru
          </button>

          <button
            onClick={selectStudentsOnly}
            className="px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-medium cursor-pointer"
          >
            Khusus Siswa
          </button>

          <button
            onClick={selectStaffOnly}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-medium cursor-pointer"
          >
            Khusus Staf
          </button>

          {selectedIds.size > 0 && (
            <button
              onClick={clearSelection}
              className="text-slate-500 hover:text-slate-300 underline ml-1 cursor-pointer"
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
                : `Cetak ID Card (${filteredEmployees.length})`}
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

      {/* Employee & User Database Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row gap-3 justify-between items-center">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Cari nama, NIP/NISN, jabatan, atau barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">Semua Departemen / Kelas</option>
              {departmentPresets.map((d) => (
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
                <th className="py-2.5 px-4 font-medium">Nama Pengguna</th>
                <th className="py-2.5 px-3 font-medium">Peran & Kategori</th>
                <th className="py-2.5 px-3 font-medium">NIP / NISN & Departemen</th>
                <th className="py-2.5 px-3 font-medium">No. WhatsApp</th>
                <th className="py-2.5 px-3 font-medium">Shift Kehadiran</th>
                <th className="py-2.5 px-4 font-medium text-center">Barcode Batang (1D)</th>
                <th className="py-2.5 px-4 font-medium text-center">Aksi Manajemen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    <p className="font-semibold text-slate-400">Tidak ada data pengguna yang sesuai filter</p>
                    <p className="text-[11px] text-slate-500 mt-1">Coba sesuaikan kata kunci pencarian atau ganti filter peran</p>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const isSelected = selectedIds.has(emp.id);

                  return (
                    <tr key={emp.id} className={`hover:bg-slate-800/30 transition-colors ${isSelected ? 'bg-blue-950/20' : ''}`}>
                      
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleSelectOne(emp.id)}
                          className="text-slate-400 hover:text-blue-400 transition-colors cursor-pointer"
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
                            className="w-9 h-9 rounded-full object-cover border border-slate-700 shrink-0 bg-slate-800"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/src/assets/images/avatar_reza_aditya_1793876906907.jpg';
                            }}
                          />
                          <div className="truncate max-w-[170px]">
                            <span 
                              onClick={() => handleOpenEditModal(emp)}
                              className="font-semibold text-slate-200 block truncate hover:text-blue-400 cursor-pointer"
                              title="Klik untuk edit data pengguna ini"
                            >
                              {emp.name}
                            </span>
                            <span className="text-[11px] text-slate-400 block truncate">{emp.position}</span>
                          </div>
                        </div>
                      </td>

                      {/* Role & Category Badge */}
                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          {renderRoleBadge(emp)}
                          <div className="text-[10px] text-slate-400 capitalize">
                            Kat: {emp.category}
                          </div>
                        </div>
                      </td>

                      {/* NIP / NISN & Department */}
                      <td className="py-3 px-3">
                        <div className="font-mono text-slate-200 font-semibold">{emp.nip}</div>
                        <span className="text-[10px] font-medium text-slate-400 truncate block max-w-[150px]">
                          {emp.department}
                        </span>
                      </td>

                      {/* Phone */}
                      <td className="py-3 px-3 font-mono text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Smartphone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate">+{emp.phone}</span>
                        </div>
                      </td>

                      {/* Shift */}
                      <td className="py-3 px-3 font-mono text-slate-300 text-[11px]">
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

                      {/* Actions: Edit, Print, Delete */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* EDIT USER BUTTON (Dedicated trigger for Admin, Guru, Super Admin, Siswa) */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(emp)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                            title={`Edit data pengguna: ${emp.name} (${emp.role})`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          {/* Print ID Card Button */}
                          <button
                            type="button"
                            onClick={() => handlePrintSelected([emp], 'id_card')}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 border border-blue-500/20 text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                            title="Cetak Kartu ID & Barcode Batang ini"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Cetak ID</span>
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Hapus Pengguna"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* MODAL: EDIT PENGGUNA (LENGKAP: SUPER ADMIN, ADMIN, GURU, SISWA, STAF) */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-base">Edit Data Pengguna Database</h3>
                  <p className="text-xs text-slate-400">
                    Modifikasi identitas, peran ({editingUser.role}), kategori, barcode, shift, dan foto profil
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setEditingUser(null)} 
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveEditUser} noValidate className="p-6 space-y-4 text-xs overflow-y-auto">
              
              {/* Success Banner */}
              {editSaveSuccess && (
                <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 rounded-xl flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{editSaveSuccess}</span>
                </div>
              )}

              {/* Photo Error Banner */}
              {editPhotoError && (
                <div className="p-3 bg-rose-950/80 border border-rose-500/40 text-rose-200 rounded-xl flex items-center gap-2 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{editPhotoError}</span>
                </div>
              )}

              {/* SECTION 1: FOTO PROFIL (UPLOAD MAKSIMAL 200 KB & PRESET) */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                    <Camera className="w-4 h-4 text-blue-400" />
                    <span>Foto Profil Pengguna (Maksimal 200 KB)</span>
                  </label>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                    Limit: 200 KB
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative group shrink-0">
                    <img
                      src={editPhotoPreview}
                      alt={editFormData.name}
                      className="w-16 h-16 rounded-xl object-cover border-2 border-blue-500 bg-slate-800 shadow-md"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/src/assets/images/avatar_reza_aditya_1793876906907.jpg';
                      }}
                    />
                    <div 
                      onClick={() => editFileInputRef.current?.click()}
                      className="absolute inset-0 bg-slate-950/60 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer text-white"
                      title="Klik untuk ganti foto"
                    >
                      <Camera className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="space-y-2 flex-1 w-full">
                    <input
                      type="file"
                      ref={editFileInputRef}
                      accept="image/png, image/jpeg, image/jpg, image/webp"
                      onChange={handleEditPhotoChange}
                      className="hidden"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => editFileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Unggah Foto Baru</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const defaultAvatar = '/src/assets/images/avatar_reza_aditya_1793876906907.jpg';
                          setEditPhotoPreview(defaultAvatar);
                          setEditFormData((prev) => ({ ...prev, avatarUrl: defaultAvatar }));
                          setEditPhotoSizeKb(null);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        <span>Reset Foto</span>
                      </button>
                    </div>

                    {editPhotoSizeKb !== null && (
                      <div className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>Ukuran file: {editPhotoSizeKb} KB / 200 KB (Valid)</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 2: HAK AKSES & PERAN SISTEM (USER ROLE & CATEGORY) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
                    <span>Hak Akses Sistem (Role)</span>
                  </label>
                  <select
                    value={editFormData.role}
                    onChange={(e) => {
                      const newRole = e.target.value as UserRole;
                      let suggestedCat: EmployeeCategory = 'guru';
                      let suggestedShift = '07:00 - 14:30 WIB';
                      let suggestedDept = editFormData.department || 'Dewan Guru';

                      if (newRole === 'super_admin') {
                        suggestedCat = 'super_admin';
                        suggestedShift = '07:00 - 15:00 WIB';
                      } else if (newRole === 'admin') {
                        suggestedCat = 'admin';
                        suggestedShift = '07:00 - 14:30 WIB';
                      } else if (newRole === 'siswa') {
                        suggestedCat = 'siswa';
                        suggestedShift = '07:00 - 13:30 WIB';
                        suggestedDept = 'Kelas 7-A (Tahfidz & Sains)';
                      } else if (newRole === 'staf' || newRole === 'kiosk') {
                        suggestedCat = 'staf';
                        suggestedShift = '07:00 - 15:00 WIB';
                        suggestedDept = 'Tata Usaha & Administrasi';
                      }

                      setEditFormData({
                        ...editFormData,
                        role: newRole,
                        category: suggestedCat,
                        shift: suggestedShift,
                        department: suggestedDept,
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="super_admin">⭐ Super Admin (Pimpinan Utama Madrasah)</option>
                    <option value="admin">🛡️ Administrator (Admin Presensi & Data)</option>
                    <option value="guru">📚 Dewan Guru (Guru Mapel & Wali Kelas)</option>
                    <option value="siswa">🎓 Siswa / Siswi MTs (Peserta Didik)</option>
                    <option value="staf">💼 Staf Tenaga Kependidikan / Tata Usaha</option>
                    <option value="kiosk">🖥️ Terminal Kiosk Piket Gerbang</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Menentukan hak akses menu dasbor, verifikasi presensi, dan pengelolaan sistem.
                  </p>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-400" />
                    <span>Kategori Pengguna</span>
                  </label>
                  <select
                    value={editFormData.category}
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value as EmployeeCategory })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="super_admin">Super Admin / Pimpinan</option>
                    <option value="admin">Administrator Presensi</option>
                    <option value="guru">Dewan Guru</option>
                    <option value="siswa">Siswa / Peserta Didik</option>
                    <option value="staf">Staf Tata Usaha</option>
                    <option value="manajemen">Manajemen & Yayasan</option>
                  </select>
                </div>
              </div>

              {/* SECTION 3: IDENTITAS UTAMA (NAMA, NIP/NISN, DEPARTEMEN/KELAS, JABATAN) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Nama Lengkap Pengguna</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.name || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 font-medium"
                    placeholder="Contoh: Drs. H. Ahmad Fauzi / Muhammad Rizky"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    {editFormData.role === 'siswa' ? 'Nomor Induk Siswa Nasional (NISN)' : 'Nomor Induk Pegawai (NIP)'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.nip || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, nip: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                    placeholder="Contoh: 19850312-001 atau 0081928371"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Departemen / Kelas Rombel</label>
                  <input
                    type="text"
                    value={editFormData.department || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                    placeholder="Contoh: Dewan Guru / Kelas 7-A (Tahfidz & Sains)"
                    list="dept-options"
                  />
                  <datalist id="dept-options">
                    {departmentPresets.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Jabatan / Posisi Tugas</label>
                  <input
                    type="text"
                    value={editFormData.position || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, position: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                    placeholder="Contoh: Guru Matematika / Siswa / Kepala TU"
                  />
                </div>
              </div>

              {/* SECTION 4: KONTAK (WHATSAPP & EMAIL) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>No. WhatsApp (Notifikasi Otomatis)</span>
                  </label>
                  <input
                    type="text"
                    value={editFormData.phone || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                    placeholder="6281234567890 (Nomor WA guru/orang tua)"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Alamat Email</span>
                  </label>
                  <input
                    type="email"
                    value={editFormData.email || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                    placeholder="nama@sekolah.sch.id"
                  />
                </div>
              </div>

              {/* SECTION 5: SHIFT & KODE BARCODE BATANG 1D */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Shift / Jam Operasional Absensi</label>
                  <input
                    type="text"
                    value={editFormData.shift || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, shift: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                    placeholder="07:00 - 14:30 WIB"
                    list="shift-options"
                  />
                  <datalist id="shift-options">
                    <option value="07:00 - 14:30 WIB" />
                    <option value="07:00 - 13:30 WIB" />
                    <option value="07:00 - 11:30 WIB (Hari Jumat)" />
                    <option value="07:00 - 15:00 WIB" />
                    <option value="06:00 - 15:00 WIB" />
                  </datalist>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-300 font-medium">Kode Barcode Batang (Code 39)</label>
                    <button
                      type="button"
                      onClick={() => {
                        if (editFormData.nip) {
                          setEditFormData({ ...editFormData, qrCodeId: editFormData.nip.trim() });
                        }
                      }}
                      className="text-[10px] text-blue-400 hover:underline cursor-pointer"
                    >
                      Samakan dengan NIP/NISN
                    </button>
                  </div>
                  <input
                    type="text"
                    value={editFormData.qrCodeId || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, qrCodeId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                    placeholder="Kode barcode batang untuk kartu ID"
                  />
                </div>
              </div>

              {/* LIVE BARCODE PREVIEW BOX */}
              {editFormData.qrCodeId && (
                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-300 block">Pratinjau Barcode Batang 1D</span>
                    <span className="text-[10px] text-slate-400">Siap dipindai kamera Android, iPhone & scanner laser USB/Bluetooth</span>
                  </div>
                  <div className="p-1 bg-white rounded border border-slate-300 shadow-xs shrink-0">
                    <BarcodeBatang
                      value={editFormData.qrCodeId}
                      width={1.2}
                      height={26}
                      showText={true}
                    />
                  </div>
                </div>
              )}

              {/* STATUS AKTIF TOGGLE */}
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-200 block text-xs">Status Akun Pengguna</span>
                  <span className="text-[11px] text-slate-400">
                    {editFormData.isActive ? 'Akun aktif dan dapat melakukan presensi' : 'Akun dinonaktifkan sementara'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditFormData({ ...editFormData, isActive: !editFormData.isActive })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    editFormData.isActive
                      ? 'bg-emerald-600 text-white'
                      : 'bg-rose-950 text-rose-300 border border-rose-800'
                  }`}
                >
                  {editFormData.isActive ? '✓ Aktif' : '✕ Non-Aktif'}
                </button>
              </div>

              {/* Error Alert Display above Action Buttons */}
              {editPhotoError && (
                <div className="p-3 bg-rose-950/80 border border-rose-500/40 text-rose-200 rounded-xl flex items-center gap-2 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="font-medium">{editPhotoError}</span>
                </div>
              )}

              {/* ACTION BUTTONS */}
              <div className="pt-4 flex items-center justify-between border-t border-slate-800">
                <span className="text-[11px] text-slate-400">
                  Pastikan nama dan NIP/NISN terisi sebelum menyimpan
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isSavingUser}
                    onClick={() => {
                      setEditingUser(null);
                      setEditPhotoError(null);
                    }}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={isSavingUser}
                    onClick={handleSaveEditUser}
                    className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-colors disabled:opacity-60"
                  >
                    {isSavingUser ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 text-slate-950" />
                        <span>Simpan Perubahan Pengguna</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL: UPLOAD EXCEL */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-600/20 text-emerald-400 rounded-lg border border-emerald-500/20">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-100 text-base">Upload Database Pengguna via Excel</h3>
                  <p className="text-xs text-slate-400">Import dewan guru, staf, admin, dan siswa ke database AbsensiKu</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setParsedRows([]);
                  setUploadFileName(null);
                  setUploadError(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
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
                          <th className="p-2">NIP/NISN</th>
                          <th className="p-2">Nama</th>
                          <th className="p-2">Peran</th>
                          <th className="p-2">Departemen</th>
                          <th className="p-2">No. WhatsApp</th>
                          <th className="p-2">Barcode</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {parsedRows.slice(0, 10).map((r, i) => (
                          <tr key={i}>
                            <td className="p-2 font-mono font-medium">{r.nip}</td>
                            <td className="p-2 font-medium">{r.name}</td>
                            <td className="p-2 uppercase font-bold text-blue-400">{r.role}</td>
                            <td className="p-2">{r.department}</td>
                            <td className="p-2 font-mono">{r.phone}</td>
                            <td className="p-2 font-mono text-emerald-400">{r.qrCodeId}</td>
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
                  className="text-xs text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
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
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={parsedRows.length === 0 || isImporting}
                    onClick={handleCommitExcelUpload}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
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

      {/* MODAL: TAMBAH PENGGUNA MANUAL (SUPER ADMIN, ADMIN, GURU, SISWA, STAF) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-lg flex flex-col shadow-2xl overflow-hidden max-h-[90vh]">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-600/20 text-blue-400 rounded-lg">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-slate-100 text-base">Tambah Pengguna Baru</h3>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)} 
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddManualEmployee} className="p-6 space-y-3.5 text-xs overflow-y-auto">
              
              {/* Role & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Peran / Hak Akses (Role)</label>
                  <select
                    value={newEmp.role}
                    onChange={(e) => {
                      const r = e.target.value as UserRole;
                      let cat: EmployeeCategory = 'guru';
                      let shift = '07:00 - 14:30 WIB';
                      let dept = 'Dewan Guru';
                      let pos = 'Guru Mata Pelajaran';

                      if (r === 'super_admin') {
                        cat = 'super_admin';
                        shift = '07:00 - 15:00 WIB';
                        pos = 'Super Admin / Pimpinan';
                      } else if (r === 'admin') {
                        cat = 'admin';
                        shift = '07:00 - 14:30 WIB';
                        pos = 'Admin Presensi & Sistem';
                      } else if (r === 'siswa') {
                        cat = 'siswa';
                        shift = '07:00 - 13:30 WIB';
                        dept = 'Kelas 7-A (Tahfidz & Sains)';
                        pos = 'Siswa';
                      } else if (r === 'staf') {
                        cat = 'staf';
                        shift = '07:00 - 15:00 WIB';
                        dept = 'Tata Usaha & Administrasi';
                        pos = 'Staf Tata Usaha';
                      }

                      setNewEmp({
                        ...newEmp,
                        role: r,
                        category: cat,
                        shift,
                        department: dept,
                        position: pos,
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 font-semibold cursor-pointer"
                  >
                    <option value="super_admin">Super Admin</option>
                    <option value="admin">Administrator</option>
                    <option value="guru">Dewan Guru</option>
                    <option value="siswa">Siswa / Peserta Didik</option>
                    <option value="staf">Staf TU & Karyawan</option>
                    <option value="kiosk">Terminal Kiosk</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Kategori</label>
                  <select
                    value={newEmp.category}
                    onChange={(e) => setNewEmp({ ...newEmp, category: e.target.value as EmployeeCategory })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="super_admin">Super Admin</option>
                    <option value="admin">Admin</option>
                    <option value="guru">Dewan Guru</option>
                    <option value="siswa">Siswa</option>
                    <option value="staf">Staf TU</option>
                  </select>
                </div>
              </div>

              {/* NIP / NISN & Nama */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    {newEmp.role === 'siswa' ? 'NISN Siswa' : 'NIP Pegawai'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={newEmp.role === 'siswa' ? 'Contoh: 0081928371' : 'Contoh: 19850312-001'}
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
                    placeholder="Contoh: Budi Santoso / Rizky"
                    value={newEmp.name}
                    onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Departemen & Jabatan */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Departemen / Rombel</label>
                  <input
                    type="text"
                    placeholder="Contoh: Dewan Guru / Kelas 7-A"
                    value={newEmp.department}
                    onChange={(e) => setNewEmp({ ...newEmp, department: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                    list="new-dept-options"
                  />
                  <datalist id="new-dept-options">
                    {departmentPresets.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Jabatan / Posisi</label>
                  <input
                    type="text"
                    placeholder="Contoh: Guru Matematika / Siswa"
                    value={newEmp.position}
                    onChange={(e) => setNewEmp({ ...newEmp, position: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Phone & Barcode */}
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
                    placeholder="Otomatis NIP/NISN jika kosong"
                    value={newEmp.qrCodeId}
                    onChange={(e) => setNewEmp({ ...newEmp, qrCodeId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Shift */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Shift Kehadiran</label>
                <input
                  type="text"
                  placeholder="07:00 - 14:30 WIB"
                  value={newEmp.shift}
                  onChange={(e) => setNewEmp({ ...newEmp, shift: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Simpan Pengguna Baru</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
