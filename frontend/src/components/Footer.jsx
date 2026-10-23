// frontend/src/components/Footer.jsx
import React from 'react';

export default function Footer({ footerText }) {
  const defaultText = 'Powerd & Enginered By SaNDS Lab Middle East W.L.L All right Reserved';
  
  return (
    <footer className="app-footer">
      <div style={{ maxWidth: '1600px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <span>{footerText || defaultText}</span>
        </div>
        <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <span>Version 2.0.0 (Local Build)</span>
          <span>•</span>
          <span>Offline Edge SaNDS Lab AI Engine</span>
          <span>•</span>
          <span>GCC & India Edition</span>
        </div>
      </div>
    </footer>
  );
}
