import React, { useState, useRef } from 'react';
import { 
  X, 
  User, 
  Upload, 
  Camera, 
  CheckCircle2, 
  AlertTriangle, 
  Phone, 
  Mail, 
  Briefcase, 
  ShieldCheck, 
  Clock, 
  Barcode, 
  FileCheck,
  Save,
  Trash2,
  Cloud
} from 'lucide-react';
import { Employee, EmployeeCategory, UserRole } from '../types/attendance';
import { StorageService } from '../services/storage';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
  onSaveProfile: (updated: Employee) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  employee,
  onSaveProfile,
}) => {
  const [formData, setFormData] = useState<Employee>({ ...employee });
  const [photoPreview, setPhotoPreview] = useState<string>(employee.avatarUrl);
  const [photoSizeKb, setPhotoSizeKb] = useState<number | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const MAX_FILE_SIZE_BYTES = 200 * 1024; // Maksimal 200 KB

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    setSaveSuccess(false);
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict validation: maksimal 200 KB
    const fileSizeKb = Math.round((file.size / 1024) * 10) / 10;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError(
        `Ukuran file foto melebihi batas maksimal 200 KB! (Terdeteksi: ${fileSizeKb} KB). Silakan pilih foto dengan resolusi lebih kecil atau kompres terlebih dahulu.`
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (!file.type.startsWith('image/')) {
      setFileError('Format file tidak didukung! Harap unggah gambar bertipe JPG, PNG, atau WEBP.');
      return;
    }

    // Read and convert to Data URL Base64 for instant preview and local/Firestore persistence
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPhotoPreview(dataUrl);
      setPhotoSizeKb(fileSizeKb);
      setFormData((prev) => ({ ...prev, avatarUrl: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const handleResetPhoto = () => {
    const defaultAvatar = '/src/assets/images/avatar_budi_santoso_1793876906414.jpg';
    setPhotoPreview(defaultAvatar);
    setPhotoSizeKb(null);
    setFileError(null);
    setFormData((prev) => ({ ...prev, avatarUrl: defaultAvatar }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const updated: Employee = {
        ...formData,
        avatarUrl: photoPreview,
      };

      onSaveProfile(updated);
      setSaveSuccess(true);
      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 900);
    } catch (err) {
      setIsSaving(false);
      setFileError('Gagal menyimpan profil ke database.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden my-6">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">Profil Pengguna & Identitas Lengkap</h3>
              <p className="text-xs text-slate-400">Edit data identitas guru/karyawan dan unggah foto profil (Maks. 200 KB)</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 text-xs max-h-[80vh] overflow-y-auto">
          
          {/* Success Banner */}
          {saveSuccess && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 rounded-xl flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Profil dan foto berhasil diperbarui dan tersimpan ke Firebase Firestore!</span>
            </div>
          )}

          {/* Error Banner */}
          {fileError && (
            <div className="p-3 bg-rose-950/80 border border-rose-500/40 text-rose-200 rounded-xl flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{fileError}</span>
            </div>
          )}

          {/* Section 1: Upload Foto Profil (Maksimal 200 KB) */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <Camera className="w-4 h-4 text-blue-400" />
                <span>Foto Profil Pengguna (Maksimal 200 KB)</span>
              </label>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                Limit: 200 KB
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-5 pt-1">
              {/* Photo Preview Container */}
              <div className="relative group shrink-0">
                <img
                  src={photoPreview}
                  alt={formData.name}
                  className="w-24 h-24 rounded-2xl object-cover border-2 border-blue-500 shadow-md bg-slate-800"
                />
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-slate-950/60 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer text-white"
                  title="Klik untuk ganti foto"
                >
                  <Camera className="w-6 h-6" />
                </div>
              </div>

              {/* Upload Action & Specs */}
              <div className="space-y-2 flex-1 w-full">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors shadow-sm cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Pilih Foto Baru</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetPhoto}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Reset Foto</span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-400 space-y-1">
                  <p>Mendukung format JPG, PNG, atau WEBP. Batas file terverifikasi sistem: <strong>200 KB</strong>.</p>
                  {photoSizeKb !== null && (
                    <p className="text-emerald-400 font-mono flex items-center gap-1">
                      <FileCheck className="w-3.5 h-3.5" />
                      Ukuran foto terpilih: <strong>{photoSizeKb} KB</strong> / 200 KB (Valid)
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Form Identitas Lengkap */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
              <span>Identitas Kepegawaian & Tugas</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nama Lengkap */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Nama Lengkap & Gelar *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                  placeholder="Contoh: Budi Santoso, S.Pd"
                />
              </div>

              {/* NIP */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">NIP (Nomor Induk Pegawai) *</label>
                <input
                  type="text"
                  required
                  value={formData.nip}
                  onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                  placeholder="Contoh: NIP-19850312-001"
                />
              </div>

              {/* Jabatan */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Jabatan / Posisi *</label>
                <input
                  type="text"
                  required
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                  placeholder="Contoh: Guru Matematika & Waka Kurikulum"
                />
              </div>

              {/* Departemen */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Departemen / Unit Kerja</label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="Dewan Guru">Dewan Guru</option>
                  <option value="Tata Usaha & Administrasi">Tata Usaha & Administrasi</option>
                  <option value="Keamanan">Keamanan & Ketertiban</option>
                  <option value="Engineering">Teknisi & IT Lab</option>
                  <option value="Operations">Operasional Sekolah</option>
                  <option value="Finance">Keuangan & Bendahara</option>
                </select>
              </div>

              {/* Kategori Kepegawaian */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Kategori Pengguna</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as EmployeeCategory })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="super_admin">Super Admin / Pimpinan Madrasah</option>
                  <option value="admin">Administrator Presensi</option>
                  <option value="guru">Dewan Guru / Wali Kelas</option>
                  <option value="siswa">Siswa / Peserta Didik</option>
                  <option value="staf">Staf Tenaga Kependidikan / TU</option>
                  <option value="manajemen">Manajemen & Kepala Sekolah</option>
                </select>
              </div>

              {/* Peran Sistem (Role) */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Hak Akses Sistem (Role)</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="super_admin">⭐ Super Admin (Akses Penuh Seluruh Sistem)</option>
                  <option value="admin">🛡️ Administrator Presensi & Data</option>
                  <option value="guru">📚 Dewan Guru (Portal & Absensi)</option>
                  <option value="siswa">🎓 Siswa / Peserta Didik MTs</option>
                  <option value="staf">💼 Staf Tata Usaha</option>
                  <option value="manager">Kepala Sekolah / Manajer</option>
                  <option value="kiosk">🖥️ Kiosk Piket Gerbang</option>
                </select>
              </div>

              {/* Nomor WhatsApp */}
              <div>
                <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Nomor WhatsApp (Notifikasi Otomatis)</span>
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                  placeholder="Contoh: 6281289345120"
                />
              </div>

              {/* Email Resmi */}
              <div>
                <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-400" />
                  <span>Email Resmi Madrasah</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                  placeholder="nama@sekolah.sch.id"
                />
              </div>

              {/* Shift Kerja */}
              <div>
                <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Jadwal Shift Kerja</span>
                </label>
                <input
                  type="text"
                  value={formData.shift}
                  onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                  placeholder="07:00 - 14:30 WIB"
                />
              </div>

              {/* Barcode ID */}
              <div>
                <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1.5">
                  <Barcode className="w-3.5 h-3.5 text-purple-400" />
                  <span>Kode ID Barcode Batang (Code 39)</span>
                </label>
                <input
                  type="text"
                  value={formData.qrCodeId}
                  onChange={(e) => setFormData({ ...formData, qrCodeId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                  placeholder="19850312-001"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Status & Biometrik Info */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Akurasi Biometrik Wajah: <strong className="text-slate-200">{formData.faceMatchScore || 98.5}%</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-amber-400" />
              <span>Sinkronisasi Otomatis: <strong className="text-slate-200">Firebase Firestore</strong></span>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Menyimpan ke Cloud...' : 'Simpan Perubahan'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
