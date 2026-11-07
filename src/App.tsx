/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Scan, 
  MapPin, 
  ShieldCheck, 
  Wifi, 
  WifiOff, 
  MessageSquare, 
  Settings, 
  CheckCircle2, 
  AlertTriangle, 
  Smartphone, 
  ExternalLink, 
  RefreshCw, 
  Bell, 
  Menu 
} from 'lucide-react';
import { 
  Employee, 
  OfficeLocation, 
  AttendanceRecord, 
  UserRole, 
  WhatsAppConfig,
  SchoolClass
} from './types/attendance';
import { StorageService } from './services/storage';
import { NotificationService } from './services/notificationService';
import { Header } from './components/Header';
import { SidebarNavigation, NavigationTab } from './components/SidebarNavigation';
import { RealtimeAdminDashboard } from './components/RealtimeAdminDashboard';
import { UserDatabaseView } from './components/UserDatabaseView';
import { ClassSettingsView } from './components/ClassSettingsView';
import { MonthlyTimeSummaryView } from './components/MonthlyTimeSummaryView';
import { AuditExportView } from './components/AuditExportView';
import { EmployeePortalView } from './components/EmployeePortalView';
import { AttendanceScannerModal } from './components/AttendanceScannerModal';
import { WhatsAppSettingsModal } from './components/WhatsAppSettingsModal';
import { LoginModal } from './components/LoginModal';
import { LoginGateView } from './components/LoginGateView';
import { UserProfileModal } from './components/UserProfileModal';

export default function App() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [offices, setOffices] = useState<OfficeLocation[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [offlineQueue, setOfflineQueue] = useState<AttendanceRecord[]>([]);
  const [waConfig, setWaConfig] = useState<WhatsAppConfig>(StorageService.getWhatsAppConfig());
  const [classes, setClasses] = useState<SchoolClass[]>([]);

  // UI Navigation & Auth
  const [currentTab, setCurrentTab] = useState<NavigationTab>('realtime');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('admin');
  const [activeEmployee, setActiveEmployee] = useState<Employee | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Modals & States
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isWaSettingsOpen, setIsWaSettingsOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // In-App Toast Alert Feed
  const [toasts, setToasts] = useState<Array<{ id: string; title: string; body: string }>>([]);

  // Load Initial Data
  useEffect(() => {
    const emps = StorageService.getEmployees();
    const offs = StorageService.getOffices();
    const records = StorageService.getAttendanceRecords();
    const queue = StorageService.getOfflineQueue();
    const authUser = StorageService.getAuthUser();
    const clsList = StorageService.getClasses();

    setEmployees(emps);
    setOffices(offs);
    setAttendanceRecords(records);
    setOfflineQueue(queue);
    setClasses(clsList);
    setActiveEmployee(authUser);
    if (authUser) {
      setCurrentUserRole(authUser.role);
    }

    // Initialize Firebase Firestore cloud synchronization
    StorageService.initFirestoreSync({
      onEmployees: (remoteEmps) => setEmployees(remoteEmps),
      onAttendance: (remoteRecs) => setAttendanceRecords(remoteRecs),
      onClasses: (remoteClasses) => setClasses(remoteClasses),
    });

    // Real-time Firestore subscriptions for instant multi-device attendance & class sync
    const unsubAttendance = StorageService.subscribeToAttendance((liveRecords) => {
      setAttendanceRecords(liveRecords);
    });

    const unsubEmployees = StorageService.subscribeToEmployees((liveEmployees) => {
      setEmployees(liveEmployees);
    });

    const unsubClasses = StorageService.subscribeToClasses((liveClasses) => {
      setClasses(liveClasses);
    });

    NotificationService.requestPushPermission();

    const handleToastEvent = (e: any) => {
      if (e.detail) {
        const id = 'toast-' + Date.now();
        setToasts((prev) => [{ id, title: e.detail.title, body: e.detail.body }, ...prev.slice(0, 3)]);
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 5000);
      }
    };
    window.addEventListener('absensiku:toast', handleToastEvent);

    const handleOnline = () => {
      setIsOffline(false);
      handleSyncOfflineQueue();
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (typeof unsubAttendance === 'function') unsubAttendance();
      if (typeof unsubEmployees === 'function') unsubEmployees();
      if (typeof unsubClasses === 'function') unsubClasses();
      window.removeEventListener('absensiku:toast', handleToastEvent);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRoleChange = (role: UserRole) => {
    setCurrentUserRole(role);
    if (role === 'employee') {
      const emp = employees.find((e) => e.category === 'guru') || employees[0];
      setActiveEmployee(emp);
      setCurrentTab('portal');
    } else if (role === 'kiosk') {
      setIsScannerOpen(true);
    } else {
      if (currentTab === 'portal') setCurrentTab('realtime');
    }
  };

  const handleLogin = (user: Employee) => {
    setActiveEmployee(user);
    setCurrentUserRole(user.role);
    StorageService.setAuthUser(user);
    NotificationService.sendPushNotification(
      'Login Berhasil',
      `Selamat datang, ${user.name} (${user.position}).`
    );
  };

  const handleLogout = () => {
    StorageService.setAuthUser(null);
    setActiveEmployee(null);
    NotificationService.sendPushNotification(
      'Logout Berhasil',
      'Anda telah keluar dari sesi akun AbsensiKu.'
    );
  };

  const handleSaveProfile = (updated: Employee) => {
    StorageService.updateEmployee(updated);
    setActiveEmployee(updated);
    setEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    NotificationService.sendPushNotification(
      'Profil Berhasil Diperbarui',
      `Identitas dan foto profil ${updated.name} berhasil disimpan ke Firebase Cloud.`
    );
  };

  const handleSyncOfflineQueue = () => {
    const { count } = StorageService.syncOfflineQueue();
    if (count > 0) {
      setAttendanceRecords(StorageService.getAttendanceRecords());
      setOfflineQueue([]);
      setSyncFeedback(`Berhasil menyinkronkan ${count} data presensi offline ke database server.`);
      setTimeout(() => setSyncFeedback(null), 5000);
    }
  };

  const handleAttendanceSuccess = (record: AttendanceRecord) => {
    setAttendanceRecords(StorageService.getAttendanceRecords());
    setOfflineQueue(StorageService.getOfflineQueue());
  };

  // Tampilkan Halaman Login pada saat pertama kali aplikasi dibuka / belum login
  if (!activeEmployee) {
    return (
      <LoginGateView
        employees={employees}
        onLogin={handleLogin}
        isOffline={isOffline}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      
      {/* Top Header (3-Line Menu in top-left, Menu Profil di Pojok Kanan Atas) */}
      <Header
        currentTab={currentTab}
        onOpenMenu={() => setIsSidebarOpen(true)}
        currentUserRole={currentUserRole}
        onRoleChange={handleRoleChange}
        activeEmployee={activeEmployee}
        onOpenScanner={() => setIsScannerOpen(true)}
        isOffline={isOffline}
        onToggleOffline={() => setIsOffline((prev) => !prev)}
        pendingSyncCount={offlineQueue.length}
        onSyncOffline={handleSyncOfflineQueue}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Slide-out Sidebar Drawer Navigation (Triggered by 3-Line Hamburger Menu) */}
      <SidebarNavigation
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        currentUserRole={currentUserRole}
        activeEmployee={activeEmployee}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenWhatsAppSettings={() => setIsWaSettingsOpen(true)}
        isOffline={isOffline}
        pendingSyncCount={offlineQueue.length}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        onOpenProfile={() => setIsProfileModalOpen(true)}
      />

      {/* Sync Banner if triggered */}
      {syncFeedback && (
        <div className="bg-emerald-600 text-white text-xs py-2 px-4 text-center font-medium animate-in fade-in flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* Offline Mode Alert Banner */}
      {isOffline && (
        <div className="bg-amber-600/90 text-amber-50 text-xs py-2 px-4 text-center font-medium flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" />
          <span>
            Mode Area Susah Sinyal Aktif: Seluruh transaksi absensi disimpan secara aman di memori lokal & akan otomatis tersinkron saat koneksi pulih.
          </span>
        </div>
      )}

      {/* Main Container Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Breadcrumb & Navigation Bar */}
        <div className="mb-4 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2 pb-2 border-b border-slate-900">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors cursor-pointer"
            >
              <Menu className="w-3.5 h-3.5 text-blue-400" />
              <span>Menu Navigasi</span>
            </button>
            <span className="text-slate-600">/</span>
            <span className="font-semibold text-slate-200">
              {currentTab === 'realtime'
                ? 'Dasbor Real-Time'
                : currentTab === 'database'
                ? 'Database Pengguna & Excel'
                : currentTab === 'classes'
                ? 'Pengaturan Kelas & Wali Kelas'
                : currentTab === 'time_summary'
                ? 'Rekap Akumulasi Waktu Bulanan'
                : currentTab === 'audit'
                ? 'Audit & Ekspor Data'
                : 'Portal Guru & Karyawan'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsWaSettingsOpen(true)}
              className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>Pengaturan WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Real-time Live Dashboard */}
        {currentTab === 'realtime' && (
          <RealtimeAdminDashboard
            employees={employees}
            attendanceRecords={attendanceRecords}
            offices={offices}
            onOpenScanner={() => setIsScannerOpen(true)}
            onRefreshData={() => setAttendanceRecords(StorageService.getAttendanceRecords())}
          />
        )}

        {/* Tab 2: User Database & Excel Upload View */}
        {currentTab === 'database' && (
          <UserDatabaseView
            employees={employees}
            onEmployeesChange={setEmployees}
          />
        )}

        {/* Tab 3: Pengaturan Kelas, Wali Kelas & Anggota Siswa */}
        {currentTab === 'classes' && (
          <ClassSettingsView
            classes={classes}
            employees={employees}
            onClassesChange={setClasses}
          />
        )}

        {/* Tab 3: Monthly Time Accumulation Summary (Strict 07.00 WIB & 13.00 WIB rules) */}
        {currentTab === 'time_summary' && (
          <MonthlyTimeSummaryView
            employees={employees}
            attendanceRecords={attendanceRecords}
          />
        )}

        {/* Tab 4: Audit & Export View */}
        {currentTab === 'audit' && (
          <AuditExportView
            attendanceRecords={attendanceRecords}
            employees={employees}
            offices={offices}
          />
        )}

        {/* Tab 5: Employee & Teacher Self-Service Portal */}
        {currentTab === 'portal' && activeEmployee && (
          <EmployeePortalView
            employee={activeEmployee}
            attendanceRecords={attendanceRecords}
            offices={offices}
            onOpenScanner={() => setIsScannerOpen(true)}
          />
        )}

      </main>

      {/* Floating In-App Toast Stack */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="p-3 bg-slate-900 border border-slate-700 text-slate-100 rounded-lg shadow-xl text-xs pointer-events-auto flex items-start gap-2.5 animate-in slide-in-from-bottom-2 duration-200"
          >
            <div className="p-1 bg-blue-600/20 text-blue-400 rounded">
              <Bell className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-semibold text-slate-200 block">{toast.title}</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">{toast.body}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Attendance Scanner Modal (Camera, AI Face, GPS, Barcode Batang) */}
      <AttendanceScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        employees={employees}
        offices={offices}
        onAttendanceSuccess={handleAttendanceSuccess}
        isOfflineMode={isOffline}
        activeEmployee={activeEmployee}
      />

      {/* WhatsApp Configuration Modal */}
      <WhatsAppSettingsModal
        isOpen={isWaSettingsOpen}
        onClose={() => setIsWaSettingsOpen(false)}
        config={waConfig}
        onSaveConfig={setWaConfig}
      />

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        employees={employees}
        onLogin={handleLogin}
      />

      {/* User Profile Modal with identity editor & max 200kb photo upload */}
      {isProfileModalOpen && activeEmployee && (
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          employee={activeEmployee}
          onSaveProfile={handleSaveProfile}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; 2026 AbsensiKu Platform — Sistem Kehadiran Biometrik & Barcode Batang WIB</span>
          <div className="flex items-center gap-4 text-slate-500">
            <span>Masuk: 07.00 WIB Tepat</span>
            <span>·</span>
            <span>Pulang: 13.00 - 15.00 WIB</span>
            <span>·</span>
            <span>Buka: 05.30 WIB</span>
            <span>·</span>
            <span>Reset: 00.00 WIB</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
