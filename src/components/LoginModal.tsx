import React, { useState } from 'react';
import { 
  X, 
  LogIn, 
  ShieldCheck, 
  User, 
  Lock, 
  Check, 
  Sparkles,
  School
} from 'lucide-react';
import { Employee } from '../types/attendance';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  onLogin: (employee: Employee) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  employees,
  onLogin,
}) => {
  const [selectedEmpId, setSelectedEmpId] = useState(employees[0]?.id || '');
  const [nipInput, setNipInput] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const found = employees.find(
      (emp) =>
        emp.nip.toLowerCase() === nipInput.trim().toLowerCase() ||
        emp.email.toLowerCase() === nipInput.trim().toLowerCase()
    );

    if (found) {
      onLogin(found);
      onClose();
    } else {
      setAuthError('NIP atau email tidak ditemukan di database.');
    }
  };

  const handleQuickLogin = (emp: Employee) => {
    onLogin(emp);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
              <LogIn className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-sm">Masuk ke Akun AbsensiKu</h3>
              <p className="text-[11px] text-slate-400">Portal Guru, Staf & Administrator</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs">
          
          {/* Quick Profile Selector for Evaluation */}
          <div>
            <label className="block text-slate-300 font-semibold mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Pilih Akun Cepat (Quick Login):</span>
            </label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {employees.slice(0, 5).map((emp) => (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => handleQuickLogin(emp)}
                  className="w-full flex items-center justify-between p-2 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800/80 hover:border-blue-500 transition-all text-left"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <img
                      src={emp.avatarUrl}
                      alt={emp.name}
                      className="w-7 h-7 rounded-full object-cover shrink-0"
                    />
                    <div className="truncate">
                      <span className="font-semibold text-slate-200 block truncate">{emp.name}</span>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {emp.position} · {emp.category.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-600/10 text-blue-400 border border-blue-500/20 shrink-0">
                    Masuk
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-3 text-slate-500 text-[10px] uppercase font-mono">atau NIP Akun</span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          {/* Form */}
          <form onSubmit={handleManualLogin} className="space-y-3">
            {authError && (
              <div className="p-2.5 bg-rose-950/60 border border-rose-500/30 text-rose-300 rounded-lg text-[11px]">
                {authError}
              </div>
            )}

            <div>
              <label className="block text-slate-300 font-medium mb-1">NIP atau Email</label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="Contoh: NIP-19850312-001"
                  value={nipInput}
                  onChange={(e) => setNipInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Kata Sandi</label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-sm mt-2"
            >
              Masuk Sekarang
            </button>
          </form>

        </div>

      </div>
    </div>
  );
};
