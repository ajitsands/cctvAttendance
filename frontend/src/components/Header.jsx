// frontend/src/components/Header.jsx
import React from 'react';
import { 
  Camera, 
  LayoutDashboard, 
  Clock, 
  Users, 
  Video, 
  CalendarClock, 
  RefreshCw, 
  FileBarChart, 
  Settings, 
  Sun, 
  Moon,
  Sparkles
} from 'lucide-react';

export default function Header({ 
  currentTab, 
  setCurrentTab, 
  theme, 
  toggleTheme, 
  settings, 
  onlineCameras = 1,
  totalCameras = 2
}) {
  const navItems = [
    { id: 'monitor', label: 'Live Monitor', icon: Camera },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'timesheet', label: 'Daily Timesheet', icon: Clock },
    { id: 'users', label: 'Staff & Faces', icon: Users },
    { id: 'cameras', label: 'Cameras & Gates', icon: Video },
    { id: 'shifts', label: 'Shifts & Hours', icon: CalendarClock },
    { id: 'hr_sync', label: 'HR Solution Sync', icon: RefreshCw },
    { id: 'reports', label: 'Reports', icon: FileBarChart },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const logoSrc = settings?.logo_url || '/logos/SaNDSLab-LogoNewUpdated copy.png';

  return (
    <header className="app-header">
      {/* Top Brand Bar */}
      <div className="header-topbar">
        <div className="brand-section">
          <div className="brand-logo-container">
            <img 
              src={logoSrc} 
              alt="SaNDS Lab" 
              className="brand-logo"
              onError={(e) => {
                e.target.src = '/logos/SaNDSLab-LogoNewUpdatedWhite.png';
              }}
            />
          </div>
          <div className="brand-meta">
            <h1 className="brand-title">
              <span className="pink-gradient-text">{settings?.company_name || 'SaNDS Lab Middle East W.L.L'}</span>
              <span className="live-indicator">
                <span className="live-dot"></span>
                AI OFFLINE ACTIVE
              </span>
            </h1>
            <span className="brand-subtitle">
              CCTVAttendance V2.0 • AI Multi-Gate Face Attendance System • CCTV Live Feed: 192.168.100.113
            </span>
          </div>
        </div>

        <div className="header-actions">
          <div className="camera-badge-pill">
            <Video size={13} />
            <span>CCTV: {onlineCameras}/{totalCameras} Online</span>
          </div>

          <button 
            className="theme-toggle-btn" 
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
            <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
          </button>
        </div>
      </div>

      {/* Recreated Horizontal Navigation Menu Bar */}
      <div className="menu-container">
        <nav className="horizontal-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                className={`nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setCurrentTab(item.id)}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
