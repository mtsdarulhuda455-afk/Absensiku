import React, { useState, useId, useRef } from 'react';
import { 
  GraduationCap, 
  Users, 
  UserPlus, 
  Edit3, 
  Trash2, 
  Search, 
  Plus, 
  Phone, 
  MessageSquare, 
  FileSpreadsheet, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  ArrowRightLeft, 
  Building2, 
  Sparkles,
  School,
  IdCard,
  UserCheck,
  ChevronRight,
  Filter
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { SchoolClass, ClassMember, Employee } from '../types/attendance';
import { StorageService } from '../services/storage';

interface ClassSettingsViewProps {
  classes: SchoolClass[];
  employees: Employee[];
  onClassesChange: (updatedClasses: SchoolClass[]) => void;
}

export const ClassSettingsView: React.FC<ClassSettingsViewProps> = ({
  classes,
  employees,
  onClassesChange,
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(classes[0]?.id || null);
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);

  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<ClassMember | null>(null);

  const [isMoveStudentModalOpen, setIsMoveStudentModalOpen] = useState(false);
  const [movingStudent, setMovingStudent] = useState<{ student: ClassMember; sourceClassId: string } | null>(null);
  const [targetMoveClassId, setTargetMoveClassId] = useState<string>('');

  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Filtered classes
  const filteredClasses = classes.filter((cls) => {
    const matchesGrade = gradeFilter === 'all' || cls.gradeLevel === gradeFilter;
    const matchesSearch = 
      cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cls.homeroomTeacherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cls.roomName && cls.roomName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesGrade && matchesSearch;
  });

  // Currently active selected class for member management
  const activeClass = classes.find((c) => c.id === selectedClassId) || classes[0] || null;

  // Stats calculation
  const totalClasses = classes.length;
  const totalStudents = classes.reduce((sum, c) => sum + (c.members?.length || 0), 0);
  const teachersList = employees.filter((e) => e.category === 'guru' || e.role === 'admin' || e.role === 'manager');
  const totalWaliAssigned = new Set(classes.map((c) => c.homeroomTeacherId).filter(Boolean)).size;

  // -------------------------------------------------------------
  // Class CRUD Handlers
  // -------------------------------------------------------------
  const handleOpenAddClass = () => {
    setEditingClass(null);
    setIsClassModalOpen(true);
  };

  const handleOpenEditClass = (cls: SchoolClass, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingClass(cls);
    setIsClassModalOpen(true);
  };

  const handleSaveClass = (formData: Partial<SchoolClass>) => {
    if (!formData.name || !formData.gradeLevel || !formData.homeroomTeacherId) {
      showFeedback('error', 'Harap isi nama kelas, tingkat, dan pilih wali kelas.');
      return;
    }

    const teacher = employees.find((e) => e.id === formData.homeroomTeacherId);
    const homeroomTeacherName = teacher ? teacher.name : formData.homeroomTeacherName || 'Wali Kelas';
    const homeroomTeacherNip = teacher?.nip || '';
    const homeroomTeacherPhone = teacher?.phone || '';

    if (editingClass) {
      // Update
      const updated: SchoolClass = {
        ...editingClass,
        ...formData,
        name: formData.name!,
        gradeLevel: formData.gradeLevel!,
        academicYear: formData.academicYear || editingClass.academicYear || '2025/2026',
        homeroomTeacherId: formData.homeroomTeacherId!,
        homeroomTeacherName,
        homeroomTeacherNip,
        homeroomTeacherPhone,
        capacity: Number(formData.capacity) || 32,
      };
      StorageService.saveClass(updated);
      const updatedList = classes.map((c) => (c.id === updated.id ? updated : c));
      onClassesChange(updatedList);
      showFeedback('success', `Rombel ${updated.name} berhasil diperbarui.`);
    } else {
      // Create new
      const newId = `cls-${Date.now().toString().slice(-6)}`;
      const newClass: SchoolClass = {
        id: newId,
        name: formData.name!,
        gradeLevel: formData.gradeLevel!,
        academicYear: formData.academicYear || '2025/2026',
        homeroomTeacherId: formData.homeroomTeacherId!,
        homeroomTeacherName,
        homeroomTeacherNip,
        homeroomTeacherPhone,
        roomName: formData.roomName || 'Ruang Kelas',
        capacity: Number(formData.capacity) || 32,
        members: [],
        createdAt: new Date().toISOString(),
      };
      StorageService.saveClass(newClass);
      const updatedList = [newClass, ...classes];
      onClassesChange(updatedList);
      setSelectedClassId(newId);
      showFeedback('success', `Rombel ${newClass.name} berhasil ditambahkan.`);
    }

    setIsClassModalOpen(false);
  };

  const handleDeleteClass = (cls: SchoolClass, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm(`Apakah Anda yakin ingin menghapus rombel ${cls.name}? Seluruh data ${cls.members.length} anggota di kelas ini akan dihapus.`)) {
      StorageService.deleteClass(cls.id);
      const updatedList = classes.filter((c) => c.id !== cls.id);
      onClassesChange(updatedList);
      if (selectedClassId === cls.id) {
        setSelectedClassId(updatedList[0]?.id || null);
      }
      showFeedback('success', `Rombel ${cls.name} berhasil dihapus.`);
    }
  };

  // -------------------------------------------------------------
  // Student Member CRUD Handlers
  // -------------------------------------------------------------
  const handleOpenAddStudent = () => {
    if (!activeClass) {
      showFeedback('error', 'Pilih kelas terlebih dahulu.');
      return;
    }
    setEditingStudent(null);
    setIsStudentModalOpen(true);
  };

  const handleOpenEditStudent = (student: ClassMember) => {
    setEditingStudent(student);
    setIsStudentModalOpen(true);
  };

  const handleSaveStudent = (studentData: Partial<ClassMember>) => {
    if (!activeClass) return;
    if (!studentData.name || !studentData.nisn) {
      showFeedback('error', 'Nama siswa dan NISN wajib diisi.');
      return;
    }

    if (editingStudent) {
      // Update student
      const updatedStudent: ClassMember = {
        ...editingStudent,
        ...studentData,
        name: studentData.name!,
        nisn: studentData.nisn!,
        gender: studentData.gender || 'L',
        parentName: studentData.parentName || '',
        phone: studentData.phone || '',
        address: studentData.address || '',
        qrCodeId: `NISN-${studentData.nisn}`,
        isActive: studentData.isActive !== false,
      };
      StorageService.updateStudentInClass(activeClass.id, updatedStudent);
      const updatedList = StorageService.getClasses();
      onClassesChange(updatedList);
      showFeedback('success', `Data siswa ${updatedStudent.name} berhasil diperbarui.`);
    } else {
      // Add new student
      const newStudentId = `std-${Date.now().toString().slice(-6)}`;
      const newStudent: ClassMember = {
        id: newStudentId,
        nisn: studentData.nisn!,
        name: studentData.name!,
        gender: studentData.gender || 'L',
        parentName: studentData.parentName || '',
        phone: studentData.phone || '',
        address: studentData.address || '',
        qrCodeId: `NISN-${studentData.nisn}`,
        isActive: true,
        joinedAt: new Date().toISOString().split('T')[0],
        notes: studentData.notes || '',
      };
      StorageService.addStudentToClass(activeClass.id, newStudent);
      const updatedList = StorageService.getClasses();
      onClassesChange(updatedList);
      showFeedback('success', `Siswa ${newStudent.name} berhasil ditambahkan ke ${activeClass.name}.`);
    }

    setIsStudentModalOpen(false);
  };

  const handleDeleteStudent = (student: ClassMember) => {
    if (!activeClass) return;
    if (confirm(`Keluarkan ${student.name} (NISN: ${student.nisn}) dari ${activeClass.name}?`)) {
      StorageService.removeStudentFromClass(activeClass.id, student.id);
      const updatedList = StorageService.getClasses();
      onClassesChange(updatedList);
      showFeedback('success', `Siswa ${student.name} berhasil dikeluarkan dari kelas.`);
    }
  };

  // Move student to another class
  const handleOpenMoveStudent = (student: ClassMember) => {
    if (!activeClass) return;
    setMovingStudent({ student, sourceClassId: activeClass.id });
    const otherClasses = classes.filter((c) => c.id !== activeClass.id);
    setTargetMoveClassId(otherClasses[0]?.id || '');
    setIsMoveStudentModalOpen(true);
  };

  const handleExecuteMoveStudent = () => {
    if (!movingStudent || !targetMoveClassId) return;
    const targetClass = classes.find((c) => c.id === targetMoveClassId);
    if (!targetClass) return;

    // Remove from source class
    StorageService.removeStudentFromClass(movingStudent.sourceClassId, movingStudent.student.id);
    // Add to target class
    StorageService.addStudentToClass(targetMoveClassId, movingStudent.student);

    const updatedList = StorageService.getClasses();
    onClassesChange(updatedList);
    setIsMoveStudentModalOpen(false);
    showFeedback('success', `Siswa ${movingStudent.student.name} berhasil dipindahkan ke ${targetClass.name}.`);
  };

  // -------------------------------------------------------------
  // Excel Export & Import for Class Members
  // -------------------------------------------------------------
  const handleDownloadExcelTemplate = () => {
    if (!activeClass) return;

    const data = [
      {
        No: 1,
        NISN: '0098712991',
        'Nama Lengkap Siswa': 'Fathur Rahman Robbani',
        'Jenis Kelamin (L/P)': 'L',
        'Nama Orang Tua / Wali': 'H. Robbani Al-Mansyur',
        'No WhatsApp Orang Tua': '6281234567890',
        'Alamat Lengkap': 'Jl. Madrasah Indah No. 10, Jakarta Selatan',
        Catatan: 'Santri Baru',
      },
      {
        No: 2,
        NISN: '0098712992',
        'Nama Lengkap Siswa': 'Aisyah Humaira Putri',
        'Jenis Kelamin (L/P)': 'P',
        'Nama Orang Tua / Wali': 'M. Syarifuddin',
        'No WhatsApp Orang Tua': '6281234567891',
        'Alamat Lengkap': 'Komplek Griya Pesantren B2',
        Catatan: '',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Anggota Kelas');

    XLSX.writeFile(wb, `Template_Siswa_${activeClass.name.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
    showFeedback('success', 'Template Excel siswa berhasil diunduh.');
  };

  const handleExportClassStudentsExcel = () => {
    if (!activeClass || activeClass.members.length === 0) {
      showFeedback('error', 'Tidak ada data siswa untuk diekspor.');
      return;
    }

    const data = activeClass.members.map((std, idx) => ({
      No: idx + 1,
      NISN: std.nisn,
      'Nama Lengkap Siswa': std.name,
      'Jenis Kelamin': std.gender === 'L' ? 'Laki-laki' : 'Perempuan',
      'Wali Kelas': activeClass.homeroomTeacherName,
      'Nama Orang Tua': std.parentName || '-',
      'No WhatsApp Ortu': std.phone || '-',
      Alamat: std.address || '-',
      Status: std.isActive ? 'Aktif' : 'Non-Aktif',
      Catatan: std.notes || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeClass.name.slice(0, 30));

    XLSX.writeFile(wb, `Data_Siswa_${activeClass.name.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
    showFeedback('success', `Berhasil mengekspor ${data.length} siswa kelas ${activeClass.name} ke Excel.`);
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeClass) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws);

        if (!data || data.length === 0) {
          showFeedback('error', 'File Excel kosong atau format tidak sesuai.');
          return;
        }

        let importedCount = 0;
        data.forEach((row, i) => {
          const nisn = String(row['NISN'] || row['nisn'] || `009${Date.now().toString().slice(-7)}${i}`);
          const name = String(row['Nama Lengkap Siswa'] || row['Nama Siswa'] || row['Nama'] || row['name'] || '').trim();
          if (name) {
            const rawGender = String(row['Jenis Kelamin (L/P)'] || row['Jenis Kelamin'] || row['Gender'] || 'L').trim().toUpperCase();
            const gender: 'L' | 'P' = rawGender.startsWith('P') ? 'P' : 'L';
            const parentName = String(row['Nama Orang Tua / Wali'] || row['Nama Orang Tua'] || row['Orang Tua'] || '').trim();
            const rawPhone = String(row['No WhatsApp Orang Tua'] || row['No WhatsApp'] || row['WhatsApp'] || row['Telepon'] || '').replace(/[^0-9]/g, '');
            const phone = rawPhone ? (rawPhone.startsWith('0') ? '62' + rawPhone.slice(1) : rawPhone) : '';
            const address = String(row['Alamat Lengkap'] || row['Alamat'] || '').trim();
            const notes = String(row['Catatan'] || '').trim();

            const student: ClassMember = {
              id: `std-imp-${Date.now().toString().slice(-6)}-${i}`,
              nisn,
              name,
              gender,
              parentName,
              phone,
              address,
              qrCodeId: `NISN-${nisn}`,
              isActive: true,
              joinedAt: new Date().toISOString().split('T')[0],
              notes,
            };

            StorageService.addStudentToClass(activeClass.id, student);
            importedCount++;
          }
        });

        const updatedList = StorageService.getClasses();
        onClassesChange(updatedList);
        showFeedback('success', `Berhasil mengimpor ${importedCount} siswa ke ${activeClass.name}!`);
      } catch (err) {
        showFeedback('error', 'Gagal memproses file Excel. Pastikan format tabel sesuai template.');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  // WhatsApp reminder test for parents
  const handleSendWaTest = (student: ClassMember) => {
    if (!student.phone) {
      showFeedback('error', `Nomor WhatsApp orang tua ${student.name} belum terdaftar.`);
      return;
    }
    const cleanPhone = student.phone.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(
      `Assalamu'alaikum Wr. Wb. Yth. Orang Tua/Wali dari ananda *${student.name}* (NISN: ${student.nisn}, ${activeClass?.name}).\n\nInformasi kehadiran madrasah MTs Darul Huda dapat dipantau melalui kartu barcode & portal presensi.\nWali Kelas: *${activeClass?.homeroomTeacherName}*.\nTerima kasih.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Heading */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold shadow-sm">
              <School className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">Pengaturan Kelas & Wali Kelas</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-950 text-blue-300 border border-blue-800">
                  MTs Darul Huda
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Kelola rombongan belajar (rombel), penugasan wali kelas, serta pendataan & edit anggota siswa per kelas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleOpenAddClass}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Rombel Kelas</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert Banner */}
        {feedbackMessage && (
          <div className={`mt-4 p-3 rounded-xl border flex items-center gap-2.5 text-xs animate-in fade-in ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/80 border-rose-500/40 text-rose-200'
          }`}>
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800/80">
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
            <span className="text-[11px] text-slate-400 block">Total Rombel Kelas</span>
            <span className="text-xl font-bold text-slate-100 block mt-0.5">{totalClasses} Kelas</span>
            <span className="text-[10px] text-blue-400 block mt-0.5">Tingkat 7, 8 & 9 MTs</span>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
            <span className="text-[11px] text-slate-400 block">Total Siswa Terdaftar</span>
            <span className="text-xl font-bold text-emerald-400 block mt-0.5">{totalStudents} Siswa</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Tersinkron ke Cloud</span>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
            <span className="text-[11px] text-slate-400 block">Wali Kelas Ditugaskan</span>
            <span className="text-xl font-bold text-purple-400 block mt-0.5">{totalWaliAssigned} Guru</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Penanggung Jawab Rombel</span>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
            <span className="text-[11px] text-slate-400 block">Rata-rata Kapasitas</span>
            <span className="text-xl font-bold text-amber-400 block mt-0.5">
              {totalClasses > 0 ? Math.round(totalStudents / totalClasses) : 0} Siswa
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Per Rombongan Belajar</span>
          </div>
        </div>
      </div>

      {/* Filter & Selector Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Grade Pills Filter */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
          {[
            { id: 'all', label: 'Semua Tingkat' },
            { id: '7', label: 'Kelas 7' },
            { id: '8', label: 'Kelas 8' },
            { id: '9', label: 'Kelas 9' },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setGradeFilter(pill.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                gradeFilter === pill.id
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Cari nama kelas atau wali kelas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Section 1: Grid Kartu Rombel Kelas & Wali Kelas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClasses.map((cls) => {
          const isSelected = cls.id === selectedClassId;
          const memberCount = cls.members?.length || 0;
          const capacity = cls.capacity || 32;
          const percentage = Math.min(100, Math.round((memberCount / capacity) * 100));
          const homeroomTeacher = employees.find((e) => e.id === cls.homeroomTeacherId);

          return (
            <div
              key={cls.id}
              onClick={() => setSelectedClassId(cls.id)}
              className={`rounded-2xl p-4.5 border transition-all cursor-pointer flex flex-col justify-between group ${
                isSelected
                  ? 'bg-slate-900/95 border-blue-500 shadow-md ring-1 ring-blue-500/50'
                  : 'bg-slate-900/60 border-slate-800/90 hover:bg-slate-900 hover:border-slate-700'
              }`}
            >
              <div>
                {/* Header Card: Badges and Action menu */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600/20 text-blue-300 border border-blue-500/30">
                      Tingkat {cls.gradeLevel}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] text-slate-400 bg-slate-800 font-mono">
                      {cls.academicYear || '2025/2026'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => handleOpenEditClass(cls, e)}
                      className="p-1 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Edit Pengaturan Rombel & Wali Kelas"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteClass(cls, e)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Hapus Kelas"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Class Title & Room */}
                <h3 className="font-bold text-slate-100 text-sm group-hover:text-blue-300 transition-colors">
                  {cls.name}
                </h3>
                <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <Building2 className="w-3 h-3 text-slate-500" />
                  <span>{cls.roomName || 'Gedung Madrasah'}</span>
                </p>

                {/* Wali Kelas Box */}
                <div className="mt-3 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 truncate">
                    <img
                      src={homeroomTeacher?.avatarUrl || '/src/assets/images/avatar_budi_santoso_1793876906414.jpg'}
                      alt={cls.homeroomTeacherName}
                      className="w-8 h-8 rounded-lg object-cover border border-slate-700 shrink-0"
                    />
                    <div className="truncate">
                      <span className="text-[10px] text-slate-400 block uppercase font-mono">Wali Kelas</span>
                      <span className="text-xs font-semibold text-slate-200 block truncate">
                        {cls.homeroomTeacherName}
                      </span>
                    </div>
                  </div>

                  {cls.homeroomTeacherPhone && (
                    <a
                      href={`https://wa.me/${cls.homeroomTeacherPhone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded-lg bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600/20 border border-emerald-500/20 transition-colors shrink-0"
                      title="Chat WhatsApp Wali Kelas"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>

              {/* Progress & Bottom Action */}
              <div className="mt-4 pt-3 border-t border-slate-800/70">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                  <span>Kapasitas Rombel</span>
                  <span className="font-semibold text-slate-200">
                    {memberCount} / {capacity} Siswa ({percentage}%)
                  </span>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      percentage >= 90 ? 'bg-amber-500' : 'bg-blue-600'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className={`text-[10px] font-semibold ${isSelected ? 'text-blue-400' : 'text-slate-500'}`}>
                    {isSelected ? '● Sedang Dikelola' : 'Klik untuk kelola anggota'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedClassId(cls.id)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <span>Anggota Siswa</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Section 2: Panel Pengelolaan Anggota Kelas yang Dipilih */}
      {activeClass && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          
          {/* Header Panel Anggota */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">
                    Anggota Siswa: {activeClass.name}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                    {activeClass.members.length} Siswa
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Wali Kelas: <strong className="text-slate-200">{activeClass.homeroomTeacherName}</strong> ({activeClass.homeroomTeacherNip || 'NIP Terdaftar'}) · Ruang: {activeClass.roomName}
                </p>
              </div>
            </div>

            {/* Action Buttons for Members */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx, .xls"
                onChange={handleImportExcel}
                className="hidden"
              />

              <button
                type="button"
                onClick={handleDownloadExcelTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-colors cursor-pointer"
                title="Download Template Excel Import Siswa"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>Template Excel</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-colors cursor-pointer"
                title="Upload Daftar Siswa dari File Excel (.xlsx)"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>Upload Excel</span>
              </button>

              <button
                type="button"
                onClick={handleExportClassStudentsExcel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-colors cursor-pointer"
                title="Ekspor Seluruh Siswa Kelas Ini ke Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
                <span>Ekspor Excel</span>
              </button>

              <button
                type="button"
                onClick={handleOpenAddStudent}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-sm cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Tambah Siswa</span>
              </button>
            </div>
          </div>

          {/* Quick Demographics */}
          <div className="flex items-center gap-4 text-xs text-slate-400 px-1">
            <span>
              Laki-laki (L): <strong className="text-blue-400">{activeClass.members.filter((m) => m.gender === 'L').length}</strong>
            </span>
            <span>·</span>
            <span>
              Perempuan (P): <strong className="text-pink-400">{activeClass.members.filter((m) => m.gender === 'P').length}</strong>
            </span>
            <span>·</span>
            <span>
              Kapasitas Tersedia: <strong className="text-slate-200">{Math.max(0, (activeClass.capacity || 32) - activeClass.members.length)} Kursi</strong>
            </span>
          </div>

          {/* Students Table */}
          {activeClass.members.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
              <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-slate-300">Belum ada anggota siswa di {activeClass.name}</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Tambahkan siswa secara manual menggunakan tombol "Tambah Siswa" atau unggah data massal dengan format Excel.
              </p>
              <div className="flex items-center justify-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={handleOpenAddStudent}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-500 transition-colors"
                >
                  Tambah Siswa Manual
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium hover:bg-slate-700 transition-colors"
                >
                  Upload File Excel
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">No</th>
                    <th className="py-3 px-3">NISN / Barcode</th>
                    <th className="py-3 px-4">Nama Siswa</th>
                    <th className="py-3 px-3 text-center">L/P</th>
                    <th className="py-3 px-3">Orang Tua / Wali</th>
                    <th className="py-3 px-3">WhatsApp Ortu</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {activeClass.members.map((std, idx) => (
                    <tr key={std.id} className="hover:bg-slate-850/60 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-200">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[11px] border border-slate-700">
                          {std.nisn}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-100">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${
                            std.gender === 'L' ? 'bg-blue-600' : 'bg-pink-600'
                          }`}>
                            {std.name.charAt(0)}
                          </div>
                          <span className="truncate">{std.name}</span>
                          {std.notes && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              {std.notes}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          std.gender === 'L'
                            ? 'bg-blue-950 text-blue-400 border border-blue-800'
                            : 'bg-pink-950 text-pink-400 border border-pink-800'
                        }`}>
                          {std.gender}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 truncate max-w-[140px]">
                        {std.parentName || '-'}
                      </td>
                      <td className="py-2.5 px-3">
                        {std.phone ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] text-slate-300">{std.phone}</span>
                            <button
                              type="button"
                              onClick={() => handleSendWaTest(std)}
                              className="p-1 rounded bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600/20 transition-colors"
                              title="Kirim Pesan WhatsApp Langsung"
                            >
                              <MessageSquare className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          std.isActive
                            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                            : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                        }`}>
                          {std.isActive ? 'Aktif' : 'Non-Aktif'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenMoveStudent(std)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Pindahkan Siswa ke Rombel Lain"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditStudent(std)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Edit Data Siswa"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStudent(std)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Keluarkan dari Kelas"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

      {/* ============================================================ */}
      {/* Modal 1: Tambah / Edit Rombel Kelas & Wali Kelas             */}
      {/* ============================================================ */}
      {isClassModalOpen && (
        <ClassFormModal
          isOpen={isClassModalOpen}
          onClose={() => setIsClassModalOpen(false)}
          initialData={editingClass}
          teachers={teachersList}
          onSave={handleSaveClass}
        />
      )}

      {/* ============================================================ */}
      {/* Modal 2: Tambah / Edit Anggota Siswa                         */}
      {/* ============================================================ */}
      {isStudentModalOpen && (
        <StudentFormModal
          isOpen={isStudentModalOpen}
          onClose={() => setIsStudentModalOpen(false)}
          initialData={editingStudent}
          className={activeClass?.name || 'Kelas'}
          onSave={handleSaveStudent}
        />
      )}

      {/* ============================================================ */}
      {/* Modal 3: Pindahkan Siswa Antar Kelas                         */}
      {/* ============================================================ */}
      {isMoveStudentModalOpen && movingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl text-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-amber-400" />
                <span>Pindahkan Siswa ke Kelas Lain</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsMoveStudentModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-300">
              Pindahkan siswa <strong className="text-white">{movingStudent.student.name}</strong> (NISN: {movingStudent.student.nisn}) ke rombel tujuan:
            </p>

            <div>
              <label className="block text-slate-300 font-medium mb-1.5">Pilih Rombel Kelas Tujuan</label>
              <select
                value={targetMoveClassId}
                onChange={(e) => setTargetMoveClassId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
              >
                {classes
                  .filter((c) => c.id !== movingStudent.sourceClassId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — Wali: {c.homeroomTeacherName} ({c.members.length}/{c.capacity} Siswa)
                    </option>
                  ))}
              </select>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsMoveStudentModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteMoveStudent}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold cursor-pointer shadow-sm"
              >
                Konfirmasi Pindah Kelas
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// ============================================================
// Sub-component: Modal Form Kelas & Wali Kelas
// ============================================================
interface ClassFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: SchoolClass | null;
  teachers: Employee[];
  onSave: (data: Partial<SchoolClass>) => void;
}

const ClassFormModal: React.FC<ClassFormModalProps> = ({
  isOpen,
  onClose,
  initialData,
  teachers,
  onSave,
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [gradeLevel, setGradeLevel] = useState(initialData?.gradeLevel || '7');
  const [academicYear, setAcademicYear] = useState(initialData?.academicYear || '2025/2026');
  const [homeroomTeacherId, setHomeroomTeacherId] = useState(initialData?.homeroomTeacherId || teachers[0]?.id || '');
  const [roomName, setRoomName] = useState(initialData?.roomName || '');
  const [capacity, setCapacity] = useState(initialData?.capacity || 32);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      gradeLevel,
      academicYear,
      homeroomTeacherId,
      roomName,
      capacity: Number(capacity),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-xs">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
              <School className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">
                {initialData ? 'Edit Pengaturan Rombel & Wali' : 'Tambah Rombel Kelas Baru'}
              </h3>
              <p className="text-[11px] text-slate-400">Atur rombongan belajar dan tentukan guru wali kelas</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Nama Rombel Kelas *</label>
            <input
              type="text"
              required
              placeholder="Contoh: Kelas 7-A (Tahfidz & Sains)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Tingkat Kelas *</label>
              <select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="7">Kelas 7 MTs</option>
                <option value="8">Kelas 8 MTs</option>
                <option value="9">Kelas 9 MTs</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Tahun Ajaran</label>
              <input
                type="text"
                placeholder="2025/2026"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          {/* Wali Kelas Selector */}
          <div>
            <label className="block text-slate-300 font-medium mb-1 flex items-center justify-between">
              <span>Wali Kelas (Penanggung Jawab) *</span>
              <span className="text-[10px] text-blue-400">Dewan Guru MTs</span>
            </label>
            <select
              required
              value={homeroomTeacherId}
              onChange={(e) => setHomeroomTeacherId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
            >
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.nip}) — {t.position}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Ruang Kelas / Gedung</label>
              <input
                type="text"
                placeholder="Contoh: Ruang 101 - Gedung Utama"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Kapasitas Maksimal</label>
              <input
                type="number"
                min="10"
                max="50"
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors shadow-sm cursor-pointer"
            >
              {initialData ? 'Simpan Perubahan' : 'Buat Kelas'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================
// Sub-component: Modal Form Anggota Siswa
// ============================================================
interface StudentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: ClassMember | null;
  className: string;
  onSave: (data: Partial<ClassMember>) => void;
}

const StudentFormModal: React.FC<StudentFormModalProps> = ({
  isOpen,
  onClose,
  initialData,
  className,
  onSave,
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [nisn, setNisn] = useState(initialData?.nisn || '');
  const [gender, setGender] = useState<'L' | 'P'>(initialData?.gender || 'L');
  const [parentName, setParentName] = useState(initialData?.parentName || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [isActive, setIsActive] = useState<boolean>(initialData ? initialData.isActive : true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      nisn,
      gender,
      parentName,
      phone,
      address,
      notes,
      isActive,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-xs">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">
                {initialData ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
              </h3>
              <p className="text-[11px] text-slate-400">Rombel: <strong className="text-slate-200">{className}</strong></p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-3.5">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-slate-300 font-medium mb-1">Nama Lengkap Siswa *</label>
              <input
                type="text"
                required
                placeholder="Contoh: Ahmad Fauzan Al-Ghifari"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Jenis Kelamin</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as 'L' | 'P')}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="L">Laki-laki (L)</option>
                <option value="P">Perempuan (P)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">NISN Siswa *</label>
              <input
                type="text"
                required
                placeholder="0098712301"
                value={nisn}
                onChange={(e) => setNisn(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Nama Orang Tua / Wali</label>
              <input
                type="text"
                placeholder="Contoh: H. Supriyadi"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1">
                <Phone className="w-3 h-3 text-emerald-400" />
                <span>WhatsApp Orang Tua</span>
              </label>
              <input
                type="text"
                placeholder="6281298765431"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Catatan / Tugas Kelas</label>
              <input
                type="text"
                placeholder="Ketua Kelas / Santri Baru"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Alamat Tempat Tinggal</label>
            <input
              type="text"
              placeholder="Contoh: Jl. Pesantren No. 14, Jakarta Selatan"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-between">
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-0"
              />
              <span>Status Siswa Aktif Mengikuti KBM</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors shadow-sm cursor-pointer"
              >
                {initialData ? 'Simpan Siswa' : 'Tambah ke Kelas'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
