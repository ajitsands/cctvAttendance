import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import LiveMonitorView from './views/LiveMonitorView';
import DashboardView from './views/DashboardView';
import TimesheetView from './views/TimesheetView';
import UsersView from './views/UsersView';
import CamerasView from './views/CamerasView';
import ShiftsView from './views/ShiftsView';
import HrSyncView from './views/HrSyncView';
import ReportsView from './views/ReportsView';
import SettingsView from './views/SettingsView';
import LivePunchPopup from './components/LivePunchPopup';
import { api } from './api';

export default function App() {
  const [currentTab, setCurrentTab] = useState('monitor');
  const [theme, setTheme] = useState(localStorage.getItem('app_theme') || 'light');
  const [settings, setSettings] = useState(null);
  const [users, setUsers] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [activePopupPunch, setActivePopupPunch] = useState(null);
  const lastSeenPunchIdRef = React.useRef(null);
  const isInitialLoadRef = React.useRef(true);

  // Load initial system data
  const loadInitialData = async () => {
    try {
      const [settingsRes, usersRes, camerasRes, shiftsRes] = await Promise.all([
        api.getSettings(),
        api.getUsers(),
        api.getCameras(),
        api.getShifts()
      ]);

      const loadedSettings = settingsRes.data?.settings;
      if (loadedSettings) {
        setSettings(loadedSettings);
        
        // Apply theme color tokens
        if (loadedSettings.theme_header_color) {
          document.documentElement.style.setProperty('--header-bg', loadedSettings.theme_header_color);
        }
        if (loadedSettings.theme_menu_color) {
          document.documentElement.style.setProperty('--menu-accent', loadedSettings.theme_menu_color);
        }
      }

      setUsers(usersRes.data || []);
      setCameras(camerasRes.data || []);
      setShifts(shiftsRes.data || []);
    } catch (err) {
      console.error('Initialization error:', err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Handle theme toggle
  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('app_theme', nextTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Real-Time Facial Identification Event Stream Polling for Right Corner Popup
  useEffect(() => {
    let timer;
    const checkLivePunches = async () => {
      try {
        const res = await api.getDashboardStats();
        const recent = res.data?.recent_punches;
        if (recent && recent.length > 0) {
          const newest = recent[0];
          if (isInitialLoadRef.current) {
            lastSeenPunchIdRef.current = newest.id;
            isInitialLoadRef.current = false;
          } else if (lastSeenPunchIdRef.current && newest.id > lastSeenPunchIdRef.current) {
            lastSeenPunchIdRef.current = newest.id;
            // Admin setting check: '1' = Show, '0' = Do not show
            const isPopupAllowed = settings?.show_live_popup !== '0' && settings?.show_live_popup !== false;
            if (isPopupAllowed) {
              setActivePopupPunch(newest);
            }
          }
        }
      } catch (e) {
        // silent
      }
    };

    checkLivePunches();
    timer = setInterval(checkLivePunches, 2500);
    return () => clearInterval(timer);
  }, [settings?.show_live_popup]);

  const handlePunchLogged = (punchData) => {
    loadInitialData();
    if (punchData) {
      const isPopupAllowed = settings?.show_live_popup !== '0' && settings?.show_live_popup !== false;
      if (isPopupAllowed) {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10);
        const timeStr = now.toLocaleTimeString();
        setActivePopupPunch({
          id: Date.now(),
          full_name: punchData.user?.full_name || 'Staff Member',
          user_code: punchData.user?.user_code || 'EMP',
          department: punchData.user?.department || 'Staff',
          profile_photo: punchData.user?.profile_photo || '',
          direction: punchData.direction,
          confidence_score: punchData.confidence_score || 96.8,
          punch_time: punchData.punch_time ? punchData.punch_time : `${dateStr} ${timeStr}`,
          camera_name: punchData.gate_name || 'Main Gate Camera'
        });
      }
    }
  };

  const onlineCamerasCount = cameras.filter(c => c.status === 'Online').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        theme={theme} 
        toggleTheme={toggleTheme} 
        settings={settings}
        onlineCameras={onlineCamerasCount}
        totalCameras={cameras.length}
      />

      <main className="app-main">
        {currentTab === 'monitor' && (
          <LiveMonitorView 
            users={users} 
            cameras={cameras} 
            onPunchLogged={handlePunchLogged} 
          />
        )}
        {currentTab === 'dashboard' && (
          <DashboardView onNavigate={(tab) => setCurrentTab(tab)} />
        )}
        {currentTab === 'timesheet' && (
          <TimesheetView />
        )}
        {currentTab === 'users' && (
          <UsersView shifts={shifts} onUsersChanged={loadInitialData} />
        )}
        {currentTab === 'cameras' && (
          <CamerasView onCamerasChanged={loadInitialData} />
        )}
        {currentTab === 'shifts' && (
          <ShiftsView onShiftsChanged={loadInitialData} />
        )}
        {currentTab === 'hr_sync' && (
          <HrSyncView onDataSynced={loadInitialData} />
        )}
        {currentTab === 'reports' && (
          <ReportsView />
        )}
        {currentTab === 'settings' && (
          <SettingsView onSettingsSaved={(newSettings) => setSettings(newSettings)} />
        )}
      </main>

      {/* Real-Time Facial Identification Popup Toast */}
      {activePopupPunch && (
        <LivePunchPopup 
          punch={activePopupPunch} 
          onClose={() => setActivePopupPunch(null)} 
        />
      )}

      <Footer footerText={settings?.footer_text} />
    </div>
  );
}
