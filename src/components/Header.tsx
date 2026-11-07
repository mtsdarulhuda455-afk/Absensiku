import React, { useState, useRef, useEffect } from 'react';
import { 
  Menu, 
  Scan, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  ChevronDown,
  Cloud,
  User,
  Edit3,
  LogOut,
  Sparkles,
  Barcode
} from 'lucide-react';
import { UserRole, Employee } from '../types/attendance';
import { NavigationTab } from './SidebarNavigation';
import { isQuotaExceeded } from '../services/firebase';

interface HeaderProps {
  currentTab: NavigationTab;
  onOpenMenu: () => void;
  currentUserRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  activeEmployee: Employee | null;
  onOpenScanner: () => void;
  isOffline: boolean;
  onToggleOffline: () => void;
  pendingSyncCount: number;
  onSyncOffline: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onOpenMenu,
  currentUserRole,
  onRoleChange,
  activeEmployee,
  onOpenScanner,
  isOffline,
  onToggleOffline,
  pendingSyncCount,
  onSyncOffline,
  onOpenProfile,
  onLogout,
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node)
      ) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const getTabTitle = (tab: NavigationTab) => {
    switch (tab) {
      case 'realtime':
        return 'Dasbor Real-Time';
      case 'database':
        return 'Database Pengguna & Excel';
      case 'classes':
        return 'Pengaturan Kelas & Wali';
      case 'time_summary':
        return 'Rekap Akumulasi Waktu';
      case 'audit':
        return 'Audit & Ekspor';
      case 'portal':
        return activeEmployee?.role === 'siswa' || activeEmployee?.category === 'siswa'
          ? 'Dasbor Siswa'
          : activeEmployee?.role === 'guru' || activeEmployee?.category === 'guru'
          ? 'Dasbor Guru'
          : 'Portal Guru & Karyawan';
      default:
        return 'Dasbor';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Left Section: 3-line Hamburger Menu Button + Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenMenu}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            title="Buka Menu Navigasi (Garis 3)"
            aria-label="Buka Menu Navigasi"
          >
            <Menu className="w-5 h-5 text-slate-100" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm font-black text-sm">
              A
            </div>
            <span className="text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap">
              AbsensiKu
            </span>
          </div>

          <div className="hidden sm:flex items-center pl-3 ml-2 border-l border-slate-800 text-xs text-slate-400 font-medium">
            <span className="text-blue-400">{getTabTitle(currentTab)}</span>
          </div>

          <div 
            className={`hidden lg:flex items-center gap-1.5 px-2 py-1 rounded border text-[11px] font-medium ml-2 shadow-xs ${
              isQuotaExceeded()
                ? 'bg-amber-950/80 border-amber-600/60 text-amber-300'
                : 'bg-slate-800/90 border-slate-700/70 text-amber-300'
            }`} 
            title={isQuotaExceeded() ? "Batas kuota harian Firebase tercapai (reset besok). Mode penyimpanan offline lokal aktif." : "Database Cloud Firebase Terhubung"}
          >
            <Cloud className="w-3.5 h-3.5 text-amber-400" />
            <span>
              Firebase: <strong className="text-slate-100 font-semibold">absensi-mts-darul-huda</strong>
              {isQuotaExceeded() && <span className="ml-1 text-[10px] text-amber-400 font-bold">(Mode Lokal)</span>}
            </span>
          </div>
        </div>

        {/* Right Section: Network Status, Role Switcher & Primary Action */}
        <div className="flex items-center gap-2.5 shrink-0">
          
          <button
            onClick={onToggleOffline}
            title="Klik untuk simulasi online / offline area susah sinyal"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isOffline
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}
          >
            {isOffline ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{isOffline ? 'Offline Area' : 'Online (WIB)'}</span>
          </button>

          {pendingSyncCount > 0 && (
            <button
              onClick={onSyncOffline}
              title="Sinkronkan antrean data offline sekarang"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span className="hidden sm:inline">Sync {pendingSyncCount}</span>
            </button>
          )}

          <div className="relative flex items-center">
            <select
              value={currentUserRole}
              onChange={(e) => onRoleChange(e.target.value as UserRole)}
              className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg pl-2.5 pr-7 py-1.5 focus:outline-none focus:border-blue-500 appearance-none font-medium cursor-pointer"
            >
              <option value="super_admin">Super Admin</option>
              <option value="admin">Administrator</option>
              <option value="guru">Dewan Guru</option>
              <option value="siswa">Siswa MTs</option>
              <option value="staf">Staf Tata Usaha</option>
              <option value="manager">Kepala Sekolah / Manajer</option>
              <option value="kiosk">Kiosk Piket</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 pointer-events-none" />
          </div>

          <button
            onClick={onOpenScanner}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-sm whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Scan className="w-4 h-4" />
            <span className="hidden sm:inline">Presensi</span>
          </button>

          {/* Menu Profil di Pojok Kanan Atas */}
          <div className="relative" ref={profileDropdownRef}>
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-xl bg-slate-800 hover:bg-slate-700/90 border border-slate-700 hover:border-slate-600 transition-all text-left cursor-pointer group focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Menu Profil & Identitas Pengguna"
              aria-label="Menu Profil Pengguna"
            >
              <img
                src={activeEmployee?.avatarUrl || '/src/assets/images/avatar_budi_santoso_1793876906414.jpg'}
                alt={activeEmployee?.name || 'Profil'}
                className="w-7 h-7 rounded-lg object-cover border border-blue-500/60 group-hover:border-blue-400 shrink-0"
              />
              <div className="hidden lg:flex flex-col truncate max-w-[120px]">
                <span className="text-[11px] font-semibold text-slate-100 truncate group-hover:text-blue-300">
                  {activeEmployee?.name ? activeEmployee.name.split(',')[0] : 'Profil'}
                </span>
                <span className="text-[9px] text-slate-400 truncate">
                  {activeEmployee?.position || 'Pengguna'}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200 transition-transform ${isProfileMenuOpen ? 'rotate-180 text-blue-400' : ''}`} />
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-2.5 z-50 text-xs animate-in fade-in slide-in-from-top-2">
                
                {/* User Card Header */}
                <div className="px-3.5 pb-3 pt-1 border-b border-slate-800 flex items-start gap-3">
                  <img
                    src={activeEmployee?.avatarUrl || '/src/assets/images/avatar_budi_santoso_1793876906414.jpg'}
                    alt={activeEmployee?.name}
                    className="w-12 h-12 rounded-xl object-cover border-2 border-blue-500 shrink-0 shadow-sm"
                  />
                  <div className="truncate flex-1">
                    <span className="font-bold text-slate-100 text-xs block truncate">
                      {activeEmployee?.name || 'Pengguna AbsensiKu'}
                    </span>
                    <span className="text-[11px] text-slate-400 block truncate font-mono mt-0.5">
                      {activeEmployee?.nip || '-'}
                    </span>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase bg-blue-950 text-blue-300 border border-blue-800">
                        {activeEmployee?.category || 'GURU'}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-medium">● Aktif</span>
                    </div>
                  </div>
                </div>

                {/* Profile Actions */}
                <div className="py-1 px-1.5 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onOpenProfile();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-200 text-left transition-colors cursor-pointer group"
                  >
                    <div className="p-1.5 rounded-lg bg-blue-600/10 text-blue-400 border border-blue-500/20 group-hover:bg-blue-600/20">
                      <Edit3 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-semibold text-slate-100 block">Edit Identitas & Foto</span>
                      <span className="text-[10px] text-slate-400 block">Upload foto maks 200 KB & ubah data</span>
                    </div>
                  </button>
                </div>

                {/* Divider & Logout */}
                <div className="pt-1 mt-1 border-t border-slate-800 px-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-950/40 text-rose-300 text-left transition-colors cursor-pointer group"
                  >
                    <div className="p-1.5 rounded-lg bg-rose-600/10 text-rose-400 border border-rose-500/20 group-hover:bg-rose-600/20">
                      <LogOut className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-semibold text-rose-300 block">Keluar dari Akun</span>
                      <span className="text-[10px] text-rose-400/80 block">Kembali ke halaman login awal</span>
                    </div>
                  </button>
                </div>

              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};
