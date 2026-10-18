// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
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
import { api } from './api';

export default function App() {
  const [currentTab, setCurrentTab] = useState('monitor');
  const [theme, setTheme] = useState(localStorage.getItem('app_theme') || 'light');
  const [settings, setSettings] = useState(null);
  const [users, setUsers] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [shifts, setShifts] = useState([]);

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
            onPunchLogged={loadInitialData} 
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

      <Footer footerText={settings?.footer_text} />
    </div>
  );
}
