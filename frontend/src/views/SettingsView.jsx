// frontend/src/views/SettingsView.jsx
import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Globe, 
  Palette, 
  Shield, 
  Save, 
  CheckCircle2, 
  Building2, 
  Database,
  Cpu
} from 'lucide-react';
import { api } from '../api';
import { useDialog } from '../context/DialogContext';

export default function SettingsView({ onSettingsSaved }) {
  const { toast } = useDialog();
  const [settings, setSettings] = useState({
    company_name: 'SaNDS Lab Middle East W.L.L',
    logo_url: '/logos/SaNDSLab-LogoNewUpdated copy.png',
    footer_text: 'Powerd & Enginered By SaNDS Lab Middle East W.L.L All right Reserved',
    timezone: 'Asia/Bahrain',
    currency: 'BHD',
    date_format: 'DD/MM/YYYY',
    time_format: '12h',
    theme_header_color: '#1e3a8a',
    theme_menu_color: '#ec4899',
    theme_mode: 'light',
    app_mode: 'office',
    face_match_threshold: '0.65',
    punch_cooldown_seconds: '60',
    show_live_popup: '1',
    hr_sync_enabled: '1',
    hr_db_host: '127.0.0.1',
    hr_db_name: 'hr_solution_db',
    hr_db_user: 'root',
    hr_db_pass: 'S@nds1@b'
  });

  const [options, setOptions] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.getSettings();
        if (res.data?.settings) {
          setSettings(prev => ({ ...prev, ...res.data.settings }));
        }
        if (res.data?.options) {
          setOptions(res.data.options);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (key, val) => {
    setSettings(prev => ({ ...prev, [key]: val }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    try {
      await api.saveSettings(settings);
      setSaveMsg('Settings and brand customization saved successfully!');
      
      // Update CSS variables immediately in runtime
      document.documentElement.style.setProperty('--header-bg', settings.theme_header_color);
      document.documentElement.style.setProperty('--menu-accent', settings.theme_menu_color);

      if (onSettingsSaved) onSettingsSaved(settings);
      toast.success('Settings and brand customization saved successfully!');
    } catch (err) {
      toast.error('Error saving settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">
            <Settings size={26} color="var(--menu-accent)" />
            System Configuration & Branding Customization
          </h2>
          <p className="page-desc">
            Configure GCC & India localization, custom Blue & Pink theme accents, organization logos, and HR Solution bridge.
          </p>
        </div>
        <div>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            <Save size={16} />
            {saving ? 'Saving Settings...' : 'Save All Settings'}
          </button>
        </div>
      </div>

      {saveMsg && (
        <div style={{
          padding: '0.85rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          background: 'var(--status-present-bg)',
          color: 'var(--status-present)',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <CheckCircle2 size={18} />
          <span>{saveMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Section 1: GCC & India Localization */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Globe size={18} color="var(--menu-accent)" />
              GCC & India Regional Settings
            </h3>

            <div className="form-group">
              <label className="form-label">Active Timezone</label>
              <select 
                className="select" 
                value={settings.timezone}
                onChange={e => handleChange('timezone', e.target.value)}
              >
                <optgroup label="GCC Countries">
                  <option value="Asia/Bahrain">Bahrain (UTC+3) - Asia/Bahrain</option>
                  <option value="Asia/Dubai">United Arab Emirates (UTC+4) - Asia/Dubai</option>
                  <option value="Asia/Riyadh">Saudi Arabia (UTC+3) - Asia/Riyadh</option>
                  <option value="Asia/Qatar">Qatar (UTC+3) - Asia/Qatar</option>
                  <option value="Asia/Kuwait">Kuwait (UTC+3) - Asia/Kuwait</option>
                  <option value="Asia/Muscat">Oman (UTC+4) - Asia/Muscat</option>
                </optgroup>
                <optgroup label="India">
                  <option value="Asia/Kolkata">India Standard Time (IST UTC+5:30) - Asia/Kolkata</option>
                </optgroup>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Default Currency</label>
                <select 
                  className="select" 
                  value={settings.currency}
                  onChange={e => handleChange('currency', e.target.value)}
                >
                  <option value="BHD">BHD - Bahraini Dinar (BD)</option>
                  <option value="SAR">SAR - Saudi Riyal (SR)</option>
                  <option value="AED">AED - UAE Dirham (AED)</option>
                  <option value="QAR">QAR - Qatari Riyal (QR)</option>
                  <option value="KWD">KWD - Kuwaiti Dinar (KD)</option>
                  <option value="OMR">OMR - Omani Rial (OMR)</option>
                  <option value="INR">INR - Indian Rupee (₹)</option>
                  <option value="USD">USD - US Dollar ($)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Time Display Format</label>
                <select 
                  className="select" 
                  value={settings.time_format}
                  onChange={e => handleChange('time_format', e.target.value)}
                >
                  <option value="12h">12-Hour (08:30 AM)</option>
                  <option value="24h">24-Hour (08:30:00)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Date Format</label>
              <select 
                className="select" 
                value={settings.date_format}
                onChange={e => handleChange('date_format', e.target.value)}
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 19/10/2026)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-10-19)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 10/19/2026)</option>
              </select>
            </div>
          </div>

          {/* Section 2: Header & Menu Color Customization */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Palette size={18} color="var(--menu-accent)" />
              Theme & Color Customization (Default: Blue & Pink)
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Header Background Color</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input 
                    type="color" 
                    value={settings.theme_header_color}
                    onChange={e => handleChange('theme_header_color', e.target.value)}
                    style={{ width: '40px', height: '40px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                  />
                  <input 
                    type="text" 
                    className="input" 
                    value={settings.theme_header_color}
                    onChange={e => handleChange('theme_header_color', e.target.value)}
                  />
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Default: #1e3a8a (Deep Royal Blue)</span>
              </div>

              <div className="form-group">
                <label className="form-label">Menu Accent Color</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input 
                    type="color" 
                    value={settings.theme_menu_color}
                    onChange={e => handleChange('theme_menu_color', e.target.value)}
                    style={{ width: '40px', height: '40px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                  />
                  <input 
                    type="text" 
                    className="input" 
                    value={settings.theme_menu_color}
                    onChange={e => handleChange('theme_menu_color', e.target.value)}
                  />
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Default: #ec4899 (Pink)</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Default Theme Mode</label>
              <select 
                className="select" 
                value={settings.theme_mode}
                onChange={e => handleChange('theme_mode', e.target.value)}
              >
                <option value="light">Light Mode (Default with clean white surfaces)</option>
                <option value="dark">Dark Mode (Sleek dark background)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Active Operating Mode</label>
              <select 
                className="select" 
                value={settings.app_mode}
                onChange={e => handleChange('app_mode', e.target.value)}
              >
                <option value="office">Office Mode (Employees, Departments, Work Shifts)</option>
                <option value="school">School Mode (Students, Class Periods, Grades)</option>
              </select>
            </div>
          </div>

          {/* Section 3: Branding & Logo */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={18} color="var(--menu-accent)" />
              Organization Branding & Logos
            </h3>

            <div className="form-group">
              <label className="form-label">Organization Name</label>
              <input 
                type="text" 
                className="input" 
                value={settings.company_name}
                onChange={e => handleChange('company_name', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Header Logo File</label>
              <select 
                className="select" 
                value={settings.logo_url}
                onChange={e => handleChange('logo_url', e.target.value)}
              >
                <option value="/logos/SaNDSLab-LogoNewUpdated copy.png">SaNDS Lab Standard Logo (/logos/...copy.png)</option>
                <option value="/logos/SaNDSLab-LogoNewUpdatedWhite.png">SaNDS Lab White Accent Logo (/logos/...White.png)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Mandated Footer Text</label>
              <textarea 
                className="input" 
                rows="2"
                value={settings.footer_text}
                onChange={e => handleChange('footer_text', e.target.value)}
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Shows on bottom of every screen: "Powerd & Enginered By SaNDS Lab Middle East W.L.L All right Reserved"
              </span>
            </div>
          </div>

          {/* Section 4: Offline Face AI & Anti-Spam */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Cpu size={18} color="var(--menu-accent)" />
              Offline Face AI Engine Parameters
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Face Match Threshold (Cosine)</label>
                <input 
                  type="number" 
                  step="0.05" 
                  min="0.30" 
                  max="0.95" 
                  className="input" 
                  value={settings.face_match_threshold}
                  onChange={e => handleChange('face_match_threshold', e.target.value)}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Default 0.65 (OpenCV SFace standard)</span>
              </div>

              <div className="form-group">
                <label className="form-label">Punch Cooldown (Seconds)</label>
                <input 
                  type="number" 
                  min="5" 
                  max="600" 
                  className="input" 
                  value={settings.punch_cooldown_seconds}
                  onChange={e => handleChange('punch_cooldown_seconds', e.target.value)}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Prevents spam if user lingers in frame</span>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700 }}>Real-Time Face Identification Popup Toast</span>
                <span style={{ fontSize: '0.75rem', color: (settings.show_live_popup === '1' || settings.show_live_popup === true) ? '#10b981' : '#f43f5e', fontWeight: 800 }}>
                  {(settings.show_live_popup === '1' || settings.show_live_popup === true) ? '● POPUP ENABLED (YES)' : '○ POPUP DISABLED (NO)'}
                </span>
              </label>
              <select 
                className="select" 
                value={settings.show_live_popup ?? '1'}
                onChange={e => handleChange('show_live_popup', e.target.value)}
              >
                <option value="1">Yes - Show Attractive Identification Popup on Right Screen Corner (Recommended)</option>
                <option value="0">No - Disable Popup Toast (Silent / Feed Stream Only)</option>
              </select>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                When enabled, a floating identification card displays the person's photo, name, IN/OUT direction, date/time, and camera gate in the bottom-right corner.
              </span>
            </div>

            <div style={{ marginTop: '0.75rem', padding: '0.85rem', background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <strong>Offline AI Status:</strong> OpenCV DNN YuNet (Face Detector) and SFace (Face Recognizer) are installed locally in <code>e:\faceAttendance\engine\models\</code>. No cloud subscriptions or internet connection required.
            </div>
          </div>
        </div>

        <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
          <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 2rem' }} disabled={saving}>
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
}
