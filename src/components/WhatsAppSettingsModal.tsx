import React, { useState } from 'react';
import { 
  X, 
  MessageSquare, 
  Check, 
  Save, 
  Key, 
  Send, 
  ExternalLink,
  ShieldAlert,
  Smartphone
} from 'lucide-react';
import { WhatsAppConfig } from '../types/attendance';
import { StorageService } from '../services/storage';
import { NotificationService } from '../services/notificationService';

interface WhatsAppSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: WhatsAppConfig;
  onSaveConfig: (newConfig: WhatsAppConfig) => void;
}

export const WhatsAppSettingsModal: React.FC<WhatsAppSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [provider, setProvider] = useState(config.provider);
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [senderNumber, setSenderNumber] = useState(config.senderNumber);
  const [endpointUrl, setEndpointUrl] = useState(config.endpointUrl);
  const [autoSendCheckIn, setAutoSendCheckIn] = useState(config.autoSendCheckIn);
  const [autoSendReminder, setAutoSendReminder] = useState(config.autoSendReminder);

  const [testPhone, setTestPhone] = useState('6281289345120');
  const [testResult, setTestResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: WhatsAppConfig = {
      provider,
      apiKey,
      senderNumber,
      endpointUrl,
      autoSendCheckIn,
      autoSendReminder,
    };
    StorageService.saveWhatsAppConfig(updated);
    onSaveConfig(updated);
    onClose();
  };

  const handleSendTestMessage = async () => {
    const testMsg = `🔔 *TES KONEKSI GATEWAY PRESENSIKU ENTERPRISE*\nKoneksi API WhatsApp berhasil diverifikasi pada ${new Date().toLocaleTimeString('id-ID')} WIB.`;
    const res = await NotificationService.dispatchWhatsAppNotification({
      phone: testPhone,
      targetName: 'Akun Penguji',
      message: testMsg,
    });
    setTestResult(`Pesan uji berhasil digenerate! URL: ${res.directUrl}`);
    setTimeout(() => setTestResult(null), 6000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-xl w-full max-w-xl flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600/20 text-emerald-400 rounded-lg border border-emerald-500/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-base">Konfigurasi Gateway WhatsApp Pihak Ketiga</h3>
              <p className="text-xs text-slate-400">Pengiriman otomatis bukti transaksi presensi & pengingat keterlambatan</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
          
          <div>
            <label className="block text-slate-300 font-medium mb-1">Provider WhatsApp Gateway</label>
            <select
              value={provider}
              onChange={(e) => {
                const val = e.target.value as any;
                setProvider(val);
                if (val === 'fonnte') setEndpointUrl('https://api.fonnte.com/send');
                if (val === 'wablas') setEndpointUrl('https://api.wablas.com/api/send-message');
                if (val === 'twilio') setEndpointUrl('https://api.twilio.com/2010-04-01/Accounts');
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="fonnte">Fonnte WhatsApp API (Indonesia)</option>
              <option value="wablas">Wablas Gateway API (Indonesia)</option>
              <option value="twilio">Twilio Programmable Messaging</option>
              <option value="direct_gateway">Custom Webhook / Internal Server Gateway</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">API Key / Token Otentikasi</label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-blue-500"
              placeholder="Masukkan API key gateway..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Nomor Pengirim (Sender ID)</label>
              <input
                type="text"
                value={senderNumber}
                onChange={(e) => setSenderNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                placeholder="6281234567890"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">API Endpoint URL</label>
              <input
                type="text"
                value={endpointUrl}
                onChange={(e) => setEndpointUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Automations Checklist */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
            <span className="font-semibold text-slate-300 block mb-1">Otomasi Notifikasi:</span>
            
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSendCheckIn}
                onChange={(e) => setAutoSendCheckIn(e.target.checked)}
                className="rounded border-slate-700 text-blue-600 focus:ring-0"
              />
              <span>Kirim pesan WhatsApp otomatis setiap transaksi Check-In / Check-Out sukses</span>
            </label>

            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSendReminder}
                onChange={(e) => setAutoSendReminder(e.target.checked)}
                className="rounded border-slate-700 text-blue-600 focus:ring-0"
              />
              <span>Kirim pengingat otomatis pada pukul 08:30 WIB bagi karyawan yang belum check-in</span>
            </label>
          </div>

          {/* Test Dispatch Area */}
          <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg space-y-2">
            <span className="font-semibold text-slate-400 block text-[11px]">Uji Coba Pengiriman Pesan API:</span>
            <div className="flex gap-2">
              <input
                type="text"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="Nomor WA (contoh: 62812...)"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono"
              />
              <button
                type="button"
                onClick={handleSendTestMessage}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirim Tes</span>
              </button>
            </div>
            {testResult && (
              <span className="text-emerald-400 text-[11px] block">{testResult}</span>
            )}
          </div>

          {/* Footer CTAs */}
          <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Konfigurasi</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
