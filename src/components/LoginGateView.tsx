import React, { useState, useEffect } from 'react';
import { 
  LogIn, 
  ShieldCheck, 
  User, 
  Lock, 
  Sparkles, 
  Clock, 
  MapPin, 
  Scan, 
  CheckCircle2, 
  Cloud, 
  ArrowRight,
  School,
  Wifi
} from 'lucide-react';
import { Employee, UserRole } from '../types/attendance';

interface LoginGateViewProps {
  employees: Employee[];
  onLogin: (employee: Employee) => void;
  isOffline: boolean;
}

export const LoginGateView: React.FC<LoginGateViewProps> = ({
  employees,
  onLogin,
  isOffline,
}) => {
  const [activeTab, setActiveTab] = useState<'quick' | 'manual'>('quick');
  const [nipOrEmail, setNipOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const found = employees.find(
      (emp) =>
        emp.nip.toLowerCase() === nipOrEmail.trim().toLowerCase() ||
        emp.email.toLowerCase() === nipOrEmail.trim().toLowerCase()
    );

    if (found) {
      onLogin(found);
    } else {
      setAuthError('NIP atau email tidak ditemukan dalam database MTs Darul Huda.');
    }
  };

  const handleSuperAdminLogin = () => {
    const admin = employees.find((e) => e.role === 'admin') || employees[0];
    onLogin(admin);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white font-sans relative overflow-hidden">
      
      {/* Decorative Background Lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-blue-600/15 via-indigo-600/10 to-transparent blur-3xl pointer-events-none" />

      {/* Top Bar on Login Page */}
      <header className="relative z-10 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-base shadow-sm">
            A
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white">AbsensiKu</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-950 text-blue-300 border border-blue-800">
                MTs Darul Huda
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Sistem Presensi Biometrik Wajah & Barcode Batang</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-emerald-400">
            <Clock className="w-3.5 h-3.5" />
            <span>{currentTimeStr || '07:00:00 WIB'}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
            <Cloud className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Firebase: <strong>absensi-mts-darul-huda</strong></span>
          </div>
        </div>
      </header>

      {/* Main Login Gate Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 max-w-4xl w-full mx-auto">
        <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          
          {/* Welcome Headline */}
          <div className="text-center max-w-lg mx-auto mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Halaman Masuk Pengguna Pertama Kali</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Selamat Datang di AbsensiKu
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1.5">
              Silakan pilih profil akun Anda atau gunakan form NIP untuk masuk ke dasbor dan portal presensi.
            </p>
          </div>

          {/* Quick Direct Admin Entry Banner */}
          <div className="mb-6 p-3.5 bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-blue-900/40 border border-blue-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="font-bold text-slate-100 text-xs sm:text-sm block">Akses Cepat Pengawas / Administrator</span>
                <span className="text-[11px] text-slate-300 block">Masuk langsung dengan hak akses Super Admin tanpa perlu mengetik kata sandi.</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSuperAdminLogin}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-md cursor-pointer shrink-0"
            >
              <span>Masuk Super Admin</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Tabs: Quick Select vs Manual Form */}
          <div className="flex border-b border-slate-800 mb-6">
            <button
              type="button"
              onClick={() => setActiveTab('quick')}
              className={`flex-1 pb-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'quick'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Pilih Akun Guru & Staf ({employees.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('manual')}
              className={`flex-1 pb-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'manual'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Masuk dengan NIP & Sandi</span>
            </button>
          </div>

          {/* Tab 1: Quick Account Cards */}
          {activeTab === 'quick' && (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
                {employees.map((emp) => (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => onLogin(emp)}
                    className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70 hover:bg-slate-800/90 hover:border-blue-500 transition-all text-left flex items-start gap-3 group cursor-pointer"
                  >
                    <img
                      src={emp.avatarUrl}
                      alt={emp.name}
                      className="w-11 h-11 rounded-xl object-cover shrink-0 border border-slate-700 group-hover:border-blue-500 transition-colors"
                    />
                    <div className="truncate flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-slate-200 text-xs truncate group-hover:text-blue-300 transition-colors">
                          {emp.name}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 block truncate mt-0.5">
                        {emp.position}
                      </span>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                          emp.category === 'guru'
                            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40'
                            : emp.category === 'manajemen'
                            ? 'bg-purple-950/80 text-purple-400 border border-purple-800/40'
                            : 'bg-blue-950/80 text-blue-400 border border-blue-800/40'
                        }`}>
                          {emp.category.toUpperCase()}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {emp.nip.replace('NIP-', '')}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span>Klik kartu nama untuk langsung masuk ke sesi akun Anda.</span>
                <span className="text-blue-400 font-medium">Bisa diedit di Menu Profil Pojok Kanan Atas</span>
              </div>
            </div>
          )}

          {/* Tab 2: Manual Credentials Form */}
          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="max-w-md mx-auto space-y-4 text-xs py-2">
              {authError && (
                <div className="p-3 bg-rose-950/80 border border-rose-500/40 text-rose-200 rounded-xl">
                  {authError}
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Nomor Induk Pegawai (NIP) atau Email</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: NIP-19850312-001 atau budi.santoso@sekolah.sch.id"
                    value={nipOrEmail}
                    onChange={(e) => setNipOrEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Kata Sandi / PIN</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500 text-xs"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Gunakan kata sandi akun madrasah Anda.</p>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Masuk Sekarang</span>
              </button>
            </form>
          )}

        </div>
      </main>

      {/* Footer Info */}
      <footer className="relative z-10 border-t border-slate-900 bg-slate-950/80 px-4 py-3 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; 2026 MTs Darul Huda — Sistem AbsensiKu Terintegrasi</span>
          <div className="flex items-center gap-3">
            <span>Masuk: 07.00 WIB Tepat</span>
            <span>·</span>
            <span>Pulang: 13.00 WIB</span>
            <span>·</span>
            <span>Toleransi: 0 Menit</span>
          </div>
        </div>
      </footer>

    </div>
  );
};
