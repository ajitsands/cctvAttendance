// frontend/src/components/MonthlyMatrixReport.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Printer, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  LogIn, 
  LogOut, 
  Users, 
  Search, 
  Building, 
  Sparkles,
  Info
} from 'lucide-react';
import { api } from '../api';

export default function MonthlyMatrixReport() {
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1); // 1-12
  const [department, setDepartment] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [matrixData, setMatrixData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch Matrix Data from API
  const fetchMatrix = async () => {
    try {
      setLoading(true);
      const res = await api.getMonthlyMatrixReport({
        year: selectedYear,
        month: selectedMonth,
        department
      });
      if (res.data) {
        setMatrixData(res.data);
      }
    } catch (err) {
      console.error('Failed to load monthly attendance matrix:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrix();
  }, [selectedYear, selectedMonth, department]);

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  // Filtered rows by search term
  const filteredRows = useMemo(() => {
    if (!matrixData?.matrix) return [];
    if (!searchTerm) return matrixData.matrix;
    const term = searchTerm.toLowerCase();
    return matrixData.matrix.filter(r => 
      r.full_name?.toLowerCase().includes(term) ||
      r.user_code?.toLowerCase().includes(term) ||
      r.department?.toLowerCase().includes(term)
    );
  }, [matrixData, searchTerm]);

  // Export to CSV matching the 1..31 days matrix format
  const exportToCSV = () => {
    if (!matrixData || !filteredRows.length) return;

    const daysHeader = matrixData.days_header || [];
    const headers = [
      'Emp Code',
      'Employee Name',
      'Department',
      'Designation',
      'Shift Target',
      'Total Worked Hrs',
      'Expected Hrs',
      'Total Late Hrs',
      'Total Early Hrs',
      'Present Days',
      'Absent Days'
    ];

    // Add Day 1..31 columns (IN, OUT, TWH, Late)
    daysHeader.forEach(d => {
      headers.push(`Day ${d.day} (${d.day_name}) IN`);
      headers.push(`Day ${d.day} OUT`);
      headers.push(`Day ${d.day} TWH`);
      headers.push(`Day ${d.day} Late`);
    });

    const rows = filteredRows.map(emp => {
      const totals = emp.monthly_totals;
      const baseRow = [
        emp.user_code,
        `"${emp.full_name}"`,
        `"${emp.department}"`,
        `"${emp.designation}"`,
        `"${emp.shift_name}"`,
        `"${totals.total_worked_hours}"`,
        `"${totals.expected_hours}"`,
        `"${totals.total_late_hours}"`,
        `"${totals.total_early_hours}"`,
        totals.days_present,
        totals.days_absent
      ];

      daysHeader.forEach(d => {
        const dayData = emp.days[d.day];
        if (dayData && dayData.has_record) {
          baseRow.push(dayData.in_time || '');
          baseRow.push(dayData.out_time || '');
          baseRow.push(dayData.twh || '');
          baseRow.push(dayData.late_by || '');
        } else {
          const status = dayData?.status || 'Absent';
          baseRow.push(status);
          baseRow.push(status);
          baseRow.push('-');
          baseRow.push('-');
        }
      });

      return baseRow;
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Monthly_Attendance_Matrix_${matrixData.year}_${String(matrixData.month).padStart(2, '0')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print view
  const handlePrint = () => {
    window.print();
  };

  const departmentsList = [
    'Engineering',
    'Human Resources',
    'HR Staff',
    'IT',
    'Finance & Accounts',
    'Operations',
    'Marketing'
  ];

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="monthly-matrix-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Print-Only Header (Formatted for Landscape Print) */}
      <div className="matrix-print-header">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start', 
          borderBottom: '2px solid #1e3a8a', 
          paddingBottom: '6px', 
          marginBottom: '8px' 
        }}>
          <div>
            <h1 style={{ fontSize: '12pt', fontWeight: 800, margin: 0, color: '#1e3a8a' }}>
              SaNDS Lab — CCTV AI Multi-Gate Face Attendance System
            </h1>
            <h2 style={{ fontSize: '9.5pt', fontWeight: 700, margin: '2px 0 0 0', color: '#1e293b' }}>
              Monthly Attendance Matrix (1 to 31 Days) • {matrixData?.month_name || `Month ${selectedMonth}, ${selectedYear}`}
            </h2>
          </div>
          <div style={{ textAlign: 'right', fontSize: '7pt', color: '#475569', lineHeight: 1.3 }}>
            <div><strong>Department:</strong> {department || 'All Departments'}</div>
            <div><strong>Staff Count:</strong> {filteredRows.length} Personnel | <strong>Workdays:</strong> {matrixData?.total_workdays || 21} Days</div>
            <div><strong>Printed On:</strong> {new Date().toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Top Filter and Navigation Bar (Hidden in Print) */}
      <div className="card matrix-filter-bar no-print" style={{ padding: '1.25rem 1.5rem' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '1rem' 
        }}>
          
          {/* Month & Year Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={handlePrevMonth}
              title="Previous Month"
              style={{ padding: '0.45rem 0.65rem' }}
            >
              <ChevronLeft size={16} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <select 
                className="select" 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                style={{ fontWeight: 700, minWidth: '130px' }}
              >
                {monthNames.map((name, idx) => (
                  <option key={name} value={idx + 1}>{name}</option>
                ))}
              </select>

              <select 
                className="select" 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                style={{ fontWeight: 700, minWidth: '95px' }}
              >
                {[2024, 2025, 2026, 2027, 2028].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <button 
              className="btn btn-secondary btn-sm" 
              onClick={handleNextMonth}
              title="Next Month"
              style={{ padding: '0.45rem 0.65rem' }}
            >
              <ChevronRight size={16} />
            </button>

            <span className="badge badge-info" style={{ marginLeft: '0.4rem', fontSize: '0.8rem' }}>
              {matrixData?.days_in_month || 31} Days ({matrixData?.total_workdays || 21} Workdays)
            </span>
          </div>

          {/* Department Filter & Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ minWidth: '180px' }}>
              <select 
                className="select" 
                value={department} 
                onChange={(e) => setDepartment(e.target.value)}
              >
                <option value="">All Departments</option>
                {departmentsList.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div style={{ position: 'relative', minWidth: '220px' }}>
              <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              <input 
                type="text" 
                className="input" 
                placeholder="Search employee..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '32px' }}
              />
            </div>

            {/* Export and Print Buttons */}
            <button 
              className="btn btn-secondary" 
              onClick={exportToCSV}
              disabled={loading || !filteredRows.length}
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <Download size={15} />
              Export CSV
            </button>

            <button 
              className="btn btn-primary" 
              onClick={handlePrint}
              disabled={loading || !filteredRows.length}
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <Printer size={15} />
              Print (Landscape)
            </button>
          </div>

        </div>
      </div>

      {/* Monthly Attendance Matrix Grid Container */}
      <div 
        className="card matrix-card" 
        style={{ 
          padding: 0, 
          overflow: 'hidden',
          border: '1px solid var(--border-color)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
        }}
      >
        {/* Table Title Bar */}
        <div className="matrix-title-bar" style={{ 
          padding: '1rem 1.5rem', 
          borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #090f26 0%, #172554 45%, #1e3a8a 100%)',
          color: '#ffffff'
        }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
              {matrixData?.month_name || 'Monthly Attendance Matrix'}
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.85)' }}>
              Comprehensive 1 to 31 Days IN / OUT / TWH / Late Matrix for {filteredRows.length} Personnel
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.76rem', color: '#ffffff', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#10b981' }}></span> Present / On-Time
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#f59e0b' }}></span> Late Arrival
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#ef4444' }}></span> Absent
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#dc2626' }}></span> <strong>Holiday / Weekend</strong>
            </span>
          </div>
        </div>

        {/* Matrix Scrollable Viewport */}
        <div className="matrix-scroll-container" style={{ 
          overflowX: 'auto', 
          overflowY: 'visible',
          maxWidth: '100%',
          position: 'relative'
        }}>
          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div className="spin" style={{ display: 'inline-block', marginBottom: '0.75rem' }}>
                <Clock size={32} color="var(--menu-accent)" />
              </div>
              <p style={{ margin: 0 }}>Generating 1 to 31 Days Attendance Matrix...</p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Users size={40} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
              <p>No employee records found for the selected month and department.</p>
            </div>
          ) : (
            <table className="matrix-table" style={{ 
              width: 'max-content', 
              minWidth: '100%', 
              borderCollapse: 'separate', 
              borderSpacing: 0,
              fontSize: '0.8rem'
            }}>
              
              {/* Table Header: Days 1 to 31 */}
              <thead>
                <tr style={{ background: '#1e3a8a', color: '#ffffff' }}>
                  
                  {/* Sticky Column: Employee Identity */}
                  <th 
                    className="matrix-th-employee"
                    style={{
                      position: 'sticky',
                      left: 0,
                      zIndex: 30,
                      background: '#1e3a8a',
                      color: '#ffffff',
                      padding: '0.85rem 1.15rem',
                      minWidth: '210px',
                      maxWidth: '230px',
                      textAlign: 'left',
                      fontWeight: 800,
                      borderBottom: '2px solid rgba(255,255,255,0.25)',
                      boxShadow: '4px 0 10px rgba(0,0,0,0.18)'
                    }}
                  >
                    <span style={{ color: '#ffffff', fontWeight: 800, letterSpacing: '0.04em' }}>EMPLOYEE</span>
                  </th>

                  {/* Sticky Column: Monthly Summary Target */}
                  <th 
                    className="matrix-th-summary"
                    style={{
                      position: 'sticky',
                      left: '210px',
                      zIndex: 30,
                      background: '#1e3a8a',
                      color: '#ffffff',
                      padding: '0.85rem 1rem',
                      minWidth: '200px',
                      maxWidth: '220px',
                      textAlign: 'left',
                      fontWeight: 800,
                      borderBottom: '2px solid rgba(255,255,255,0.25)',
                      boxShadow: '4px 0 10px rgba(0,0,0,0.18)'
                    }}
                  >
                    <span style={{ color: '#ffffff', fontWeight: 800, letterSpacing: '0.04em' }}>MONTHLY SUMMARY</span>
                  </th>

                  {/* Day Columns: 1 to 31 */}
                  {matrixData?.days_header?.map(dh => {
                    const isHoliday = dh.is_weekend;
                    return (
                      <th 
                        key={dh.day}
                        className={`matrix-th-day ${isHoliday ? 'matrix-th-holiday' : 'matrix-th-workday'}`}
                        style={{
                          padding: '0.65rem 0.45rem',
                          minWidth: '95px',
                          maxWidth: '110px',
                          textAlign: 'center',
                          fontWeight: 800,
                          borderBottom: '2px solid rgba(255,255,255,0.25)',
                          borderLeft: '1px solid rgba(255,255,255,0.15)',
                          background: isHoliday ? '#dc2626' : '#1e3a8a',
                          color: '#ffffff'
                        }}
                      >
                        <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.1 }}>
                          {String(dh.day).padStart(2, '0')}
                        </div>
                        <div style={{ 
                          fontSize: '0.68rem', 
                          fontWeight: 800, 
                          textTransform: 'uppercase',
                          color: '#ffffff',
                          background: isHoliday ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.18)',
                          padding: '1px 4px',
                          borderRadius: '3px',
                          marginTop: '2px',
                          display: 'inline-block'
                        }}>
                          {dh.day_name}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {/* Table Body: Employee Rows */}
              <tbody>
                {filteredRows.map((emp, rowIdx) => {
                  const totals = emp.monthly_totals;
                  const profileUrl = emp.profile_photo 
                    ? (emp.profile_photo.startsWith('http') ? emp.profile_photo : `http://127.0.0.1:8000${emp.profile_photo.startsWith('/') ? '' : '/'}${emp.profile_photo}`)
                    : null;

                  const isEven = rowIdx % 2 === 0;

                  return (
                    <tr 
                      key={emp.user_id}
                      style={{ 
                        background: isEven ? 'var(--bg-surface)' : 'var(--bg-muted)',
                        borderBottom: '1px solid var(--border-color)',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      {/* Sticky Cell: Employee Name & Code */}
                      <td 
                        className="matrix-td-employee"
                        style={{
                          position: 'sticky',
                          left: 0,
                          zIndex: 20,
                          background: isEven ? 'var(--bg-surface)' : 'var(--bg-muted)',
                          padding: '0.85rem 1rem',
                          borderBottom: '1px solid var(--border-color)',
                          boxShadow: '4px 0 10px rgba(0,0,0,0.08)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div className="matrix-avatar print-hide" style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: '#dbeafe',
                            color: '#1d4ed8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            overflow: 'hidden',
                            flexShrink: 0,
                            border: '2px solid rgba(236, 72, 153, 0.4)'
                          }}>
                            {profileUrl ? (
                              <img src={profileUrl} alt={emp.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              emp.full_name?.charAt(0) || 'U'
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: 1.2 }}>
                              {emp.full_name}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              <span>{emp.user_code}</span> • <span>{emp.department}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Sticky Cell: Monthly Totals */}
                      <td 
                        className="matrix-td-summary"
                        style={{
                          position: 'sticky',
                          left: '210px',
                          zIndex: 20,
                          background: isEven ? 'var(--bg-surface)' : 'var(--bg-muted)',
                          padding: '0.85rem 1rem',
                          borderBottom: '1px solid var(--border-color)',
                          borderRight: '2px solid var(--border-color)',
                          boxShadow: '4px 0 10px rgba(0,0,0,0.08)'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {/* Total Hours */}
                          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#10b981', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Total HRS:</span>
                            <span>{totals.total_worked_hours} / {totals.expected_hours}</span>
                          </div>

                          {/* Late & Early */}
                          <div style={{ fontSize: '0.73rem', display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                            <span style={{ color: totals.total_late_minutes > 0 ? '#f59e0b' : 'inherit', fontWeight: totals.total_late_minutes > 0 ? 700 : 500 }}>
                              Late: {totals.total_late_hours}
                            </span>
                            <span style={{ color: totals.total_early_minutes > 0 ? '#8b5cf6' : 'inherit', fontWeight: totals.total_early_minutes > 0 ? 700 : 500 }}>
                              Early: {totals.total_early_hours}
                            </span>
                          </div>

                          {/* Days Summary */}
                          <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)', display: 'flex', gap: '6px', marginTop: '2px' }}>
                            <span style={{ color: '#10b981', fontWeight: 700 }}>P: {totals.days_present}</span>
                            <span>•</span>
                            <span style={{ color: '#ef4444', fontWeight: 700 }}>A: {totals.days_absent}</span>
                            <span>•</span>
                            <span>Workdays: {totals.workdays_in_month}</span>
                          </div>
                        </div>
                      </td>

                      {/* Day Cells: 1 to 31 */}
                      {matrixData?.days_header?.map(dh => {
                        const dayData = emp.days[dh.day];
                        const isWeekend = dh.is_weekend;
                        const hasRecord = dayData && dayData.has_record;

                        return (
                          <td 
                            key={dh.day}
                            className={`matrix-td-day ${isWeekend ? 'matrix-td-holiday' : ''}`}
                            style={{
                              padding: '0.65rem 0.45rem',
                              borderBottom: '1px solid var(--border-color)',
                              borderLeft: '1px solid var(--border-color)',
                              verticalAlign: 'top',
                              background: isWeekend 
                                ? 'rgba(239, 68, 68, 0.04)' 
                                : (hasRecord ? 'rgba(16, 185, 129, 0.02)' : 'transparent'),
                              minWidth: '95px',
                              maxWidth: '110px'
                            }}
                          >
                            {hasRecord ? (
                              <div style={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '2px',
                                fontSize: '0.73rem' 
                              }}>
                                {/* IN Time */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#15803d', fontWeight: 700 }}>
                                  <LogIn size={11} color="#10b981" className="print-hide-icon" />
                                  <span>IN {dayData.in_time}</span>
                                </div>

                                {/* OUT Time */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#be185d', fontWeight: 700 }}>
                                  <LogOut size={11} color="#ec4899" className="print-hide-icon" />
                                  <span>OUT {dayData.out_time}</span>
                                </div>

                                {/* Total Work Hours */}
                                <div style={{ 
                                  fontWeight: 800, 
                                  fontSize: '0.75rem', 
                                  color: 'var(--text-main)', 
                                  marginTop: '2px',
                                  fontFamily: 'var(--font-mono)'
                                }}>
                                  TWH {dayData.twh}
                                </div>

                                {/* Late Flag Badge */}
                                {dayData.late_by && (
                                  <div style={{
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    color: '#b45309',
                                    background: 'rgba(245, 158, 11, 0.15)',
                                    padding: '1px 4px',
                                    borderRadius: '3px',
                                    marginTop: '2px',
                                    display: 'inline-block'
                                  }}>
                                    Late {dayData.late_by}
                                  </div>
                                )}

                                {/* Overtime / Weekend Work Badge */}
                                {isWeekend && (
                                  <div style={{
                                    fontSize: '0.62rem',
                                    fontWeight: 800,
                                    color: '#dc2626',
                                    marginTop: '2px'
                                  }}>
                                    ★ HOLIDAY WORK
                                  </div>
                                )}
                              </div>
                            ) : isWeekend ? (
                              <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                                <span className="badge-holiday" style={{ 
                                  fontSize: '0.68rem', 
                                  fontWeight: 800,
                                  background: '#fee2e2',
                                  color: '#dc2626',
                                  border: '1px solid #f87171',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  display: 'inline-block',
                                  letterSpacing: '0.04em'
                                }}>
                                  HOLIDAY
                                </span>
                              </div>
                            ) : dayData?.status === 'Upcoming' ? (
                              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '0.5rem 0', opacity: 0.4 }}>
                                <span>--</span>
                              </div>
                            ) : (
                              <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                                <span className="badge-absent" style={{ 
                                  fontSize: '0.68rem', 
                                  fontWeight: 700, 
                                  color: '#dc2626',
                                  background: 'rgba(239, 68, 68, 0.12)',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  display: 'inline-block'
                                }}>
                                  ABSENT
                                </span>
                              </div>
                            )}
                          </td>
                        );
                      })}

                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Print-Only Landscape Footer */}
      <div className="matrix-print-footer">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          borderTop: '1px solid #94a3b8', 
          paddingTop: '4px', 
          marginTop: '6px', 
          fontSize: '6.5pt', 
          color: '#475569' 
        }}>
          <span>Powerd &amp; Enginered By SaNDS Lab Middle East W.L.L All right Reserved</span>
          <span><strong>Offline Edge SaNDS Lab AI Engine</strong> • CCTV Multi-Gate Face Attendance &amp; Security</span>
          <span>GCC &amp; India Edition</span>
        </div>
      </div>

    </div>
  );
}
