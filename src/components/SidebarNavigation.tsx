import React from 'react';
import { 
  X, 
  Activity, 
  Users, 
  Clock, 
  FileText, 
  UserCircle2, 
  Scan, 
  MessageSquare, 
  ShieldCheck, 
  Wifi, 
  WifiOff, 
  ChevronRight,
  LogIn,
  LogOut,
  Sparkles,
  School
} from 'lucide-react';
import { UserRole, Employee } from '../types/attendance';

export type NavigationTab = 'realtime' | 'database' | 'classes' | 'time_summary' | 'audit' | 'portal';

interface SidebarNavigationProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  currentUserRole: UserRole;
  activeEmployee: Employee | null;
  onOpenScanner: () => void;
  onOpenWhatsAppSettings: () => void;
  isOffline: boolean;
  pendingSyncCount: number;
  onOpenLoginModal: () => void;
  onLogout: () => void;
  onOpenProfile?: () => void;
}

export const SidebarNavigation: React.FC<SidebarNavigationProps> = ({
  isOpen,
  onClose,
  currentTab,
  onSelectTab,
  currentUserRole,
  activeEmployee,
  onOpenScanner,
  onOpenWhatsAppSettings,
  isOffline,
  pendingSyncCount,
  onOpenLoginModal,
  onLogout,
  onOpenProfile,
}) => {
  if (!isOpen) return null;

  const userRole = activeEmployee?.role || currentUserRole;
  const userCategory = activeEmployee?.category;
  const isTeacher = userRole === 'guru' || userCategory === 'guru';
  const isStudent = userRole === 'siswa' || userCategory === 'siswa';
  const isAdminOrSuper = userRole === 'admin' || userRole === 'super_admin';

  // Role-based menu items:
  // Guru & Siswa ONLY see Dashboard and Terminal Absensi.
  // Admin & Super Admin have all management menus.
  let menuItems: Array<{
    id: NavigationTab;
    label: string;
    sublabel: string;
    icon: any;
  }> = [];

  if (isStudent) {
    menuItems = [
      {
        id: 'portal',
        label: 'Dasbor Siswa',
        sublabel: 'Kartu pelajar, barcode & riwayat kehadiran',
        icon: UserCircle2,
      },
    ];
  } else if (isTeacher) {
    menuItems = [
      {
        id: 'portal',
        label: 'Dasbor Guru',
        sublabel: 'Kehadiran pribadi, ID Card & presensi siswa',
        icon: Activity,
      },
    ];
  } else if (isAdminOrSuper) {
    menuItems = [
      {
        id: 'realtime',
        label: 'Dasbor Real-Time',
        sublabel: 'Monitoring kehadiran live & radius geofence',
        icon: Activity,
      },
      {
        id: 'database',
        label: 'Database Pengguna & Excel',
        sublabel: 'Upload massal .xlsx & cetak barcode batang',
        icon: Users,
      },
      {
        id: 'classes',
        label: 'Pengaturan Kelas & Wali',
        sublabel: 'Kelola rombel, wali kelas & anggota siswa',
        icon: School,
      },
      {
        id: 'time_summary',
        label: 'Rekap Akumulasi Waktu',
        sublabel: 'Terlambat (>07.00 WIB) & Pulang Cepat (<13.00 WIB)',
        icon: Clock,
      },
      {
        id: 'audit',
        label: 'Audit & Ekspor Data',
        sublabel: 'Ekspor laporan resmi PDF & Excel',
        icon: FileText,
      },
      {
        id: 'portal',
        label: 'Portal Guru & Karyawan',
        sublabel: 'ID Card barcode batang & jadwal shift',
        icon: UserCircle2,
      },
    ];
  } else {
    menuItems = [
      {
        id: 'realtime',
        label: 'Dasbor',
        sublabel: 'Ringkasan absensi madrasah',
        icon: Activity,
      },
      {
        id: 'portal',
        label: 'Portal Mandiri',
        sublabel: 'Kartu ID & kehadiran',
        icon: UserCircle2,
      },
    ];
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      
      {/* Dimmed backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Sidebar Panel Sliding from Left */}
      <div className="relative w-80 max-w-[85vw] bg-slate-900 border-r border-slate-800 text-slate-100 flex flex-col h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
        
        {/* Sidebar Brand Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm font-black text-sm">
              A
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-white">AbsensiKu</h2>
              <span className="text-[10px] text-slate-400 block font-mono">Sistem Presensi GPS & Wajah</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Tutup Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          
          <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Menu Navigasi
          </div>

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-xs transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <div className="truncate flex-1">
                  <span className="block truncate font-medium">{item.label}</span>
                  <span className={`block truncate text-[10px] ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                    {item.sublabel}
                  </span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-200 shrink-0" />}
              </button>
            );
          })}

          <div className="pt-3 px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-t border-slate-800/60 mt-3">
            Akses Cepat
          </div>

          {/* Quick Action: Terminal Presensi */}
          <button
            type="button"
            onClick={() => {
              onOpenScanner();
              onClose();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs text-slate-300 hover:bg-slate-800/80 transition-colors"
          >
            <Scan className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="truncate">
              <span className="block font-medium">Buka Terminal Absensi</span>
              <span className="block text-[10px] text-slate-500">Scan Wajah AI & Barcode Batang</span>
            </div>
          </button>

          {/* Quick Action: WhatsApp Gateway Settings - ONLY Admin & Super Admin */}
          {isAdminOrSuper && (
            <button
              type="button"
              onClick={() => {
                onOpenWhatsAppSettings();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs text-slate-300 hover:bg-slate-800/80 transition-colors"
            >
              <MessageSquare className="w-4 h-4 text-blue-400 shrink-0" />
              <div className="truncate">
                <span className="block font-medium">Pengaturan WhatsApp Gateway</span>
                <span className="block text-[10px] text-slate-500">Notifikasi & Pengingat Guru</span>
              </div>
            </button>
          )}

        </div>

        {/* BOTTOM SECTION: LOGIN & LOGOUT STATUS */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-xs space-y-2">
          
          {/* Network Indicator */}
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              {isOffline ? (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-400">Mode Offline</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-slate-400">Sistem Online (WIB)</span>
                </>
              )}
            </span>

            {pendingSyncCount > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-[10px]">
                {pendingSyncCount} Antrean
              </span>
            )}
          </div>

          {/* Logged in User Profile or Login Trigger */}
          {activeEmployee ? (
            <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between gap-2">
              <div 
                onClick={() => {
                  if (onOpenProfile) onOpenProfile();
                  onClose();
                }}
                className="flex items-center gap-2 truncate cursor-pointer group flex-1"
                title="Buka & Edit Profil (Upload Foto Maks 200 KB)"
              >
                <img
                  src={activeEmployee.avatarUrl}
                  alt={activeEmployee.name}
                  className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-700 group-hover:border-blue-500"
                />
                <div className="truncate">
                  <span className="font-semibold text-slate-200 block truncate text-xs group-hover:text-blue-300">
                    {activeEmployee.name}
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {activeEmployee.nip} · Edit Profil
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0 cursor-pointer"
                title="Keluar dari Akun (Logout)"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                onOpenLoginModal();
                onClose();
              }}
              className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <LogIn className="w-4 h-4" />
              <span>Masuk ke Akun (Login)</span>
            </button>
          )}

        </div>

      </div>

    </div>
  );
};
