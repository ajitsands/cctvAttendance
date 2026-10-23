// frontend/src/components/Header.jsx
import React, { useState, useEffect, useRef } from 'react';
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
  Sparkles,
  ShieldAlert,
  UserCheck,
  ShieldX,
  ChevronDown,
  UserCheck2,
  Shield
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
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const attendanceRef = useRef(null);
  const securityRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (attendanceRef.current && !attendanceRef.current.contains(e.target)) {
        setAttendanceOpen(false);
      }
      if (securityRef.current && !securityRef.current.contains(e.target)) {
        setSecurityOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 1. Sub-items grouped under "Attendance"
  const attendanceSubItems = [
    { 
      id: 'timesheet', 
      label: 'Daily Timesheet', 
      desc: 'Attendance logs & multi-trip daily punch calculations', 
      icon: Clock 
    },
    { 
      id: 'users', 
      label: 'Staff & Faces', 
      desc: 'Employee directory & biometric photo enrollment', 
      icon: Users 
    },
    { 
      id: 'shifts', 
      label: 'Shifts & Hours', 
      desc: 'Work rosters, late grace periods & overtime rules', 
      icon: CalendarClock 
    },
    { 
      id: 'hr_sync', 
      label: 'HR Solution Sync', 
      desc: 'Seamless HRMS / ERP bi-directional sync', 
      icon: RefreshCw 
    },
  ];

  // 2. Sub-items grouped under "Security & Visitors"
  const securitySubItems = [
    { 
      id: 'guests', 
      label: 'Guests & Customers', 
      desc: 'Visitor auto-enrollment, customer visits & movement logs', 
      icon: UserCheck 
    },
    { 
      id: 'blacklist', 
      label: 'Security & Blacklist', 
      desc: 'Restricted persons registry & instant security breach alarms', 
      icon: ShieldAlert 
    },
    { 
      id: 'tamper', 
      label: 'Try to Tamper Area', 
      desc: 'Photo presentation attacks & full-frame camera evidence', 
      icon: ShieldX 
    },
  ];

  const isAttendanceActive = attendanceSubItems.some(item => item.id === currentTab);
  const isSecurityActive = securitySubItems.some(item => item.id === currentTab);

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
              CCTVAttendance V2.1 • AI Multi-Gate Face Attendance System • CCTV Live Feed: 192.168.100.113
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

      {/* Horizontal Navigation Menu Bar */}
      <div className="menu-container">
        <nav className="horizontal-nav">
          
          {/* 1. Live Monitor */}
          <button
            className={`nav-link ${currentTab === 'monitor' ? 'active' : ''}`}
            onClick={() => setCurrentTab('monitor')}
          >
            <Camera size={16} />
            <span>Live Monitor</span>
          </button>

          {/* 2. Dashboard */}
          <button
            className={`nav-link ${currentTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentTab('dashboard')}
          >
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </button>

          {/* 3. ATTENDANCE DROPDOWN MENU */}
          <div 
            className={`nav-dropdown ${attendanceOpen ? 'is-open' : ''}`} 
            ref={attendanceRef}
            onMouseEnter={() => setAttendanceOpen(true)}
            onMouseLeave={() => setAttendanceOpen(false)}
          >
            <button
              className={`nav-dropdown-toggle ${isAttendanceActive ? 'active' : ''} ${attendanceOpen ? 'open' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setAttendanceOpen(prev => !prev);
                setSecurityOpen(false);
              }}
              type="button"
            >
              <UserCheck2 size={16} />
              <span>Attendance</span>
              <ChevronDown size={14} className="nav-dropdown-chevron" />
            </button>

            <div className="nav-dropdown-menu">
              {attendanceSubItems.map((subItem) => {
                const SubIcon = subItem.icon;
                const isSubActive = currentTab === subItem.id;
                return (
                  <button
                    key={subItem.id}
                    className={`nav-dropdown-item ${isSubActive ? 'active' : ''}`}
                    onClick={() => {
                      setCurrentTab(subItem.id);
                      setAttendanceOpen(false);
                    }}
                    type="button"
                  >
                    <div className="dropdown-item-icon">
                      <SubIcon size={17} />
                    </div>
                    <div className="dropdown-item-content">
                      <span className="dropdown-item-title">{subItem.label}</span>
                      <span className="dropdown-item-desc">{subItem.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. SECURITY & VISITORS DROPDOWN MENU */}
          <div 
            className={`nav-dropdown ${securityOpen ? 'is-open' : ''}`} 
            ref={securityRef}
            onMouseEnter={() => setSecurityOpen(true)}
            onMouseLeave={() => setSecurityOpen(false)}
          >
            <button
              className={`nav-dropdown-toggle ${isSecurityActive ? 'active' : ''} ${securityOpen ? 'open' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setSecurityOpen(prev => !prev);
                setAttendanceOpen(false);
              }}
              type="button"
            >
              <Shield size={16} />
              <span>Security & Visitors</span>
              <ChevronDown size={14} className="nav-dropdown-chevron" />
            </button>

            <div className="nav-dropdown-menu">
              {securitySubItems.map((subItem) => {
                const SubIcon = subItem.icon;
                const isSubActive = currentTab === subItem.id;
                return (
                  <button
                    key={subItem.id}
                    className={`nav-dropdown-item ${isSubActive ? 'active' : ''}`}
                    onClick={() => {
                      setCurrentTab(subItem.id);
                      setSecurityOpen(false);
                    }}
                    type="button"
                  >
                    <div className="dropdown-item-icon">
                      <SubIcon size={17} />
                    </div>
                    <div className="dropdown-item-content">
                      <span className="dropdown-item-title">{subItem.label}</span>
                      <span className="dropdown-item-desc">{subItem.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Cameras & Gates */}
          <button
            className={`nav-link ${currentTab === 'cameras' ? 'active' : ''}`}
            onClick={() => setCurrentTab('cameras')}
          >
            <Video size={16} />
            <span>Cameras & Gates</span>
          </button>

          {/* 6. Reports */}
          <button
            className={`nav-link ${currentTab === 'reports' ? 'active' : ''}`}
            onClick={() => setCurrentTab('reports')}
          >
            <FileBarChart size={16} />
            <span>Reports</span>
          </button>

          {/* 7. Settings */}
          <button
            className={`nav-link ${currentTab === 'settings' ? 'active' : ''}`}
            onClick={() => setCurrentTab('settings')}
          >
            <Settings size={16} />
            <span>Settings</span>
          </button>

        </nav>
      </div>
    </header>
  );
}
