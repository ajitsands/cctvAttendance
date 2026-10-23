import os
import subprocess
import base64
import shutil
import fitz # PyMuPDF

# Read Base64 Logos
logo_path = r"e:\faceAttendance\logos\SaNDSLab-LogoNewUpdated copy.png"
if os.path.exists(logo_path):
    with open(logo_path, "rb") as f:
        logo_b64 = base64.b64encode(f.read()).decode("utf-8")
        logo_src = f"data:image/png;base64,{logo_b64}"
else:
    logo_src = "logos/SaNDSLab-LogoNewUpdated%20copy.png"

unv_logo_path = r"e:\faceAttendance\logos\UNV.png"
if os.path.exists(unv_logo_path):
    with open(unv_logo_path, "rb") as f:
        unv_logo_b64 = base64.b64encode(f.read()).decode("utf-8")
        unv_logo_src = f"data:image/png;base64,{unv_logo_b64}"
else:
    unv_logo_src = "logos/UNV.png"

html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SaNDS Lab CCTV AI Face Attendance & Security System - Custom AI Engineered</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {{
      --primary: #1e3a8a;
      --primary-dark: #172554;
      --primary-light: #3b82f6;
      --accent: #ec4899;
      --accent-dark: #be185d;
      --accent-soft: rgba(236, 72, 153, 0.08);
      --success: #10b981;
      --success-soft: rgba(16, 185, 129, 0.1);
      --warning: #f59e0b;
      --warning-soft: rgba(245, 158, 11, 0.1);
      --danger: #ef4444;
      --danger-soft: rgba(239, 68, 68, 0.1);
      --purple: #8b5cf6;
      --purple-soft: rgba(139, 92, 246, 0.1);
      --unv-blue: #0066b3;
      --unv-cyan: #00a3e0;
      
      --bg-body: #f8fafc;
      --bg-surface: #ffffff;
      --bg-alt: #f1f5f9;
      --border: #e2e8f0;
      --border-dark: #cbd5e1;
      
      --text-main: #0f172a;
      --text-muted: #64748b;
      --text-sub: #475569;
      --text-inv: #ffffff;
      
      --radius-sm: 8px;
      --radius-md: 14px;
      --radius-lg: 20px;
      --radius-xl: 28px;
      
      --shadow-sm: 0 1px 3px rgba(0,0,0,0.05);
      --shadow-md: 0 4px 16px -2px rgba(15, 23, 42, 0.08);
      --shadow-lg: 0 12px 32px -4px rgba(15, 23, 42, 0.12);
      --shadow-accent: 0 8px 24px -4px rgba(236, 72, 153, 0.25);
    }}

    [data-theme="dark"] {{
      --bg-body: #090d16;
      --bg-surface: #111827;
      --bg-alt: #1a2234;
      --border: #243048;
      --border-dark: #374151;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --text-sub: #cbd5e1;
    }}

    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }}

    body {{
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: var(--bg-body);
      color: var(--text-main);
      line-height: 1.6;
      font-size: 14px;
    }}

    /* Screen Top Toolbar (Hidden on Print) */
    .screen-toolbar {{
      position: sticky;
      top: 0;
      z-index: 999;
      background: rgba(17, 24, 39, 0.88);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
      padding: 10px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: white;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    }}

    .toolbar-brand {{
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 700;
      font-size: 15px;
      letter-spacing: -0.3px;
    }}

    .toolbar-brand .badge-tag {{
      background: linear-gradient(135deg, var(--accent), #db2777);
      color: white;
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 999px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }}

    .toolbar-brand .ai-tag {{
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      color: white;
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 999px;
      font-weight: 700;
      letter-spacing: 0.3px;
    }}

    .toolbar-brand .unv-tool-tag {{
      background: linear-gradient(135deg, #0066b3, #00a3e0);
      color: white;
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 999px;
      font-weight: 700;
      letter-spacing: 0.3px;
      display: flex;
      align-items: center;
      gap: 5px;
    }}

    .toolbar-actions {{
      display: flex;
      align-items: center;
      gap: 12px;
    }}

    .btn {{
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: var(--radius-sm);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s ease;
      border: 1px solid transparent;
    }}

    .btn-primary {{
      background: linear-gradient(135deg, var(--primary-light), var(--primary));
      color: white;
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
    }}
    .btn-primary:hover {{
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.45);
    }}

    .btn-accent {{
      background: linear-gradient(135deg, var(--accent), #db2777);
      color: white;
      box-shadow: var(--shadow-accent);
    }}
    .btn-accent:hover {{
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(236, 72, 153, 0.4);
    }}

    .btn-secondary {{
      background: rgba(255, 255, 255, 0.1);
      color: white;
      border-color: rgba(255, 255, 255, 0.15);
    }}
    .btn-secondary:hover {{
      background: rgba(255, 255, 255, 0.18);
    }}

    /* Main Container */
    .document-container {{
      max-width: 1080px;
      margin: 30px auto;
      background: var(--bg-surface);
      box-shadow: var(--shadow-lg);
      border-radius: var(--radius-xl);
      border: 1px solid var(--border);
      overflow: hidden;
    }}

    /* Header & Hero */
    .doc-hero {{
      background: linear-gradient(140deg, #090e1a 0%, #111a2e 35%, #1e3a8a 100%);
      color: white;
      padding: 42px 48px 36px;
      position: relative;
      overflow: hidden;
    }}

    .doc-hero::after {{
      content: '';
      position: absolute;
      top: -120px;
      right: -80px;
      width: 440px;
      height: 440px;
      background: radial-gradient(circle, rgba(236, 72, 153, 0.22) 0%, rgba(37, 99, 235, 0.18) 50%, transparent 70%);
      border-radius: 50%;
      pointer-events: none;
    }}

    .hero-top {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      position: relative;
      z-index: 2;
    }}

    .hero-logo {{
      height: 60px;
      max-width: 280px;
      object-fit: contain;
      filter: drop-shadow(0 4px 12px rgba(0,0,0,0.3));
      background: rgba(255, 255, 255, 0.96);
      padding: 8px 18px;
      border-radius: var(--radius-md);
    }}

    .hero-meta-badges {{
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: flex-end;
      align-items: center;
    }}

    .meta-badge {{
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 11.5px;
      font-weight: 600;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.18);
      backdrop-filter: blur(8px);
      color: #e2e8f0;
    }}

    .meta-badge.highlight {{
      background: linear-gradient(135deg, var(--accent), #db2777);
      border-color: rgba(255, 255, 255, 0.3);
      color: white;
    }}

    .meta-badge.ai-badge {{
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      border-color: rgba(255, 255, 255, 0.3);
      color: white;
    }}

    .meta-badge.unv-badge {{
      background: linear-gradient(135deg, rgba(0, 102, 179, 0.35), rgba(0, 163, 224, 0.35));
      border: 1px solid #38bdf8;
      color: #ffffff;
      font-weight: 700;
    }}

    .hero-title-area {{
      position: relative;
      z-index: 2;
      max-width: 920px;
    }}

    .hero-kicker {{
      color: #38bdf8;
      font-size: 12.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }}

    .hero-kicker::before {{
      content: '';
      display: inline-block;
      width: 18px;
      height: 3px;
      background: var(--accent);
      border-radius: 2px;
    }}

    .hero-title {{
      font-family: 'Outfit', sans-serif;
      font-size: 33px;
      font-weight: 800;
      line-height: 1.15;
      letter-spacing: -0.8px;
      margin-bottom: 12px;
      color: #ffffff;
    }}

    .hero-title span {{
      background: linear-gradient(120deg, #60a5fa 20%, #f472b6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }}

    .hero-subtitle {{
      font-size: 15px;
      color: #cbd5e1;
      max-width: 860px;
      line-height: 1.5;
      margin-bottom: 22px;
      font-weight: 400;
    }}

    /* KPI Highlights Grid */
    .hero-kpis {{
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      margin-top: 24px;
      position: relative;
      z-index: 2;
    }}

    .kpi-card {{
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: var(--radius-md);
      padding: 14px 16px;
      backdrop-filter: blur(10px);
    }}

    .kpi-value {{
      font-family: 'Outfit', sans-serif;
      font-size: 24px;
      font-weight: 800;
      color: #ffffff;
      line-height: 1;
      margin-bottom: 5px;
      display: flex;
      align-items: center;
      gap: 6px;
    }}

    .kpi-value.accent {{ color: #f472b6; }}
    .kpi-value.blue {{ color: #60a5fa; }}
    .kpi-value.emerald {{ color: #34d399; }}
    .kpi-value.amber {{ color: #fbbf24; }}

    .kpi-label {{
      font-size: 11px;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }}

    /* Content Layout */
    .doc-content {{
      padding: 38px 48px;
    }}

    /* Section Styling */
    .section-block {{
      margin-bottom: 38px;
    }}

    .section-header {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 18px;
      padding-bottom: 10px;
      border-bottom: 2px solid var(--border);
    }}

    .section-title-wrap {{
      display: flex;
      align-items: center;
      gap: 12px;
    }}

    .section-icon {{
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 17px;
      background: var(--primary-light);
      color: white;
    }}

    .section-icon.pink {{
      background: linear-gradient(135deg, var(--accent), #db2777);
    }}

    .section-icon.emerald {{
      background: linear-gradient(135deg, var(--success), #059669);
    }}

    .section-icon.purple {{
      background: linear-gradient(135deg, var(--purple), #7c3aed);
    }}

    .section-icon.amber {{
      background: linear-gradient(135deg, var(--warning), #d97706);
    }}

    .section-icon.unv {{
      background: linear-gradient(135deg, var(--unv-blue), var(--unv-cyan));
    }}

    .section-title {{
      font-family: 'Outfit', sans-serif;
      font-size: 21px;
      font-weight: 800;
      color: var(--text-main);
      letter-spacing: -0.4px;
    }}

    .section-tag {{
      font-size: 11.5px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 999px;
      background: var(--bg-alt);
      color: var(--primary);
      border: 1px solid var(--border);
    }}

    /* Feature Grid */
    .feature-grid {{
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 18px;
    }}

    .feature-grid.three-col {{
      grid-template-columns: repeat(3, 1fr);
    }}

    .feature-card {{
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 18px 20px;
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      position: relative;
      transition: all 0.2s ease;
    }}

    .feature-card:hover {{
      border-color: var(--primary-light);
      box-shadow: var(--shadow-md);
      transform: translateY(-2px);
    }}

    .card-top {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }}

    .card-icon-box {{
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 19px;
      background: rgba(37, 99, 235, 0.08);
      border: 1px solid rgba(37, 99, 235, 0.18);
    }}

    .card-icon-box.blue-bg {{
      background: rgba(37, 99, 235, 0.08);
      border-color: rgba(37, 99, 235, 0.2);
      color: var(--primary);
    }}

    .card-icon-box.pink-bg {{
      background: var(--accent-soft);
      border-color: rgba(236, 72, 153, 0.25);
      color: var(--accent);
    }}

    .card-icon-box.emerald-bg {{
      background: var(--success-soft);
      border-color: rgba(16, 185, 129, 0.25);
      color: var(--success);
    }}

    .card-icon-box.purple-bg {{
      background: var(--purple-soft);
      border-color: rgba(139, 92, 246, 0.25);
      color: var(--purple);
    }}

    .card-icon-box.amber-bg {{
      background: var(--warning-soft);
      border-color: rgba(245, 158, 11, 0.25);
      color: var(--warning);
    }}

    .card-icon-box.danger-bg {{
      background: var(--danger-soft);
      border-color: rgba(239, 68, 68, 0.25);
      color: var(--danger);
    }}

    .card-icon-box.unv-bg {{
      background: rgba(0, 102, 179, 0.1);
      border-color: rgba(0, 163, 224, 0.3);
      color: var(--unv-blue);
    }}

    .card-badge {{
      font-size: 10.5px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }}

    .card-badge.new {{
      background: linear-gradient(135deg, var(--accent), #db2777);
      color: white;
    }}

    .card-badge.ai {{
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: white;
    }}

    .card-badge.core {{
      background: var(--bg-alt);
      color: var(--text-sub);
      border: 1px solid var(--border);
    }}

    .card-badge.unv {{
      background: linear-gradient(135deg, #0066b3, #00a3e0);
      color: white;
    }}

    .card-title {{
      font-family: 'Outfit', sans-serif;
      font-size: 16.5px;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 6px;
      letter-spacing: -0.2px;
    }}

    .card-desc {{
      color: var(--text-sub);
      font-size: 13px;
      line-height: 1.5;
      margin-bottom: 12px;
      flex-grow: 1;
    }}

    .card-bullets {{
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 8px;
      border-top: 1px dashed var(--border);
      padding-top: 10px;
    }}

    .card-bullets li {{
      display: flex;
      align-items: flex-start;
      gap: 7px;
      font-size: 12px;
      color: var(--text-sub);
    }}

    .card-bullets li span.bullet-icon {{
      color: var(--primary-light);
      font-weight: 700;
      line-height: 1.2;
    }}

    .card-bullets li span.bullet-icon.pink {{
      color: var(--accent);
    }}

    .card-bullets li span.bullet-icon.unv {{
      color: #0066b3;
    }}

    /* Custom AI Engineered Callout */
    .custom-ai-callout {{
      background: linear-gradient(135deg, rgba(37, 99, 235, 0.07) 0%, rgba(236, 72, 153, 0.07) 100%);
      border: 2px solid rgba(37, 99, 235, 0.2);
      border-radius: var(--radius-md);
      padding: 16px 20px;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      gap: 16px;
    }}

    .ai-callout-icon {{
      font-size: 28px;
      line-height: 1;
      padding: 10px;
      background: white;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
      box-shadow: var(--shadow-sm);
    }}

    .ai-callout-content h3 {{
      font-family: 'Outfit', sans-serif;
      font-size: 16px;
      font-weight: 800;
      color: var(--primary);
      margin-bottom: 4px;
    }}

    .ai-callout-content p {{
      color: var(--text-sub);
      font-size: 13px;
      line-height: 1.5;
    }}

    /* UNV Camera Recommendation & Universal Compatibility Box */
    .unv-highlight-box {{
      background: linear-gradient(135deg, rgba(0, 102, 179, 0.06) 0%, rgba(0, 163, 224, 0.03) 100%);
      border: 2px solid rgba(0, 102, 179, 0.3);
      border-radius: var(--radius-md);
      padding: 18px 22px;
      margin: 20px 0 26px 0;
      display: flex;
      align-items: center;
      gap: 22px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0, 102, 179, 0.06);
    }}

    .unv-highlight-box::before {{
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 6px;
      height: 100%;
      background: linear-gradient(180deg, #0066b3, #00a3e0);
    }}

    .unv-box-left {{
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      min-width: 140px;
      text-align: center;
    }}

    .unv-logo-img {{
      width: 110px;
      height: auto;
      max-height: 52px;
      object-fit: contain;
      background: white;
      padding: 6px 12px;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }}

    .unv-badge-pill {{
      font-size: 10px;
      font-weight: 800;
      color: #0066b3;
      background: rgba(0, 102, 179, 0.12);
      padding: 3px 8px;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      border: 1px solid rgba(0, 102, 179, 0.25);
    }}

    .unv-box-right {{
      flex: 1;
    }}

    .unv-title {{
      font-family: 'Outfit', sans-serif;
      font-size: 16px;
      font-weight: 800;
      color: #004b87;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 8px;
    }}

    .unv-desc {{
      font-size: 13px;
      color: var(--text-sub);
      line-height: 1.5;
      margin-bottom: 10px;
    }}

    .unv-compatibility-note {{
      font-size: 12px;
      color: var(--text-main);
      background: rgba(255, 255, 255, 0.85);
      padding: 8px 12px;
      border-radius: 6px;
      border-left: 3px solid #00a3e0;
      line-height: 1.45;
      border-top: 1px solid var(--border);
      border-right: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
    }}

    .unv-compatibility-note .note-tag {{
      font-weight: 700;
      color: #0066b3;
      margin-right: 4px;
    }}

    /* Architecture Flowchart */
    .arch-banner {{
      background: #0f172a;
      border-radius: var(--radius-lg);
      padding: 22px 26px;
      color: white;
      margin-bottom: 24px;
    }}

    .arch-grid {{
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      position: relative;
    }}

    .arch-node {{
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: var(--radius-md);
      padding: 16px 12px;
      text-align: center;
      position: relative;
    }}

    .arch-node-num {{
      display: inline-block;
      width: 22px;
      height: 22px;
      line-height: 22px;
      border-radius: 50%;
      background: var(--accent);
      color: white;
      font-size: 11px;
      font-weight: 800;
      margin-bottom: 6px;
    }}

    .arch-node-title {{
      font-family: 'Outfit', sans-serif;
      font-size: 13.5px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 4px;
    }}

    .arch-node-desc {{
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.4;
    }}

    /* Tables */
    .spec-table-wrap {{
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      overflow: hidden;
      box-shadow: var(--shadow-sm);
      margin-bottom: 20px;
    }}

    table.spec-table {{
      width: 100%;
      border-collapse: collapse;
      font-size: 12.5px;
      text-align: left;
    }}

    table.spec-table th {{
      background: var(--bg-alt);
      color: var(--text-main);
      padding: 10px 14px;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.6px;
      border-bottom: 1px solid var(--border);
    }}

    table.spec-table td {{
      padding: 9px 14px;
      border-bottom: 1px solid var(--border);
      color: var(--text-sub);
    }}

    table.spec-table tr:last-child td {{
      border-bottom: none;
    }}

    table.spec-table tr:hover td {{
      background: rgba(241, 245, 249, 0.5);
    }}

    .status-pill {{
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 999px;
      font-size: 10.5px;
      font-weight: 700;
    }}

    .status-pill.success {{
      background: var(--success-soft);
      color: #047857;
    }}

    .status-pill.primary {{
      background: rgba(37, 99, 235, 0.1);
      color: var(--primary);
    }}

    .status-pill.accent {{
      background: var(--accent-soft);
      color: var(--accent-dark);
    }}

    /* Comparison Matrix */
    .matrix-table {{
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }}

    .matrix-table th, .matrix-table td {{
      padding: 10px 12px;
      border-bottom: 1px solid var(--border);
      text-align: center;
    }}

    .matrix-table th:first-child, .matrix-table td:first-child {{
      text-align: left;
      font-weight: 600;
      color: var(--text-main);
    }}

    .matrix-table th {{
      background: var(--bg-alt);
      font-weight: 700;
      font-size: 11px;
      color: var(--text-main);
    }}

    .matrix-table th.sands-col {{
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      color: white;
      border-top-left-radius: 8px;
      border-top-right-radius: 8px;
    }}

    .matrix-table td.sands-col {{
      background: rgba(37, 99, 235, 0.04);
      font-weight: 700;
      color: var(--primary);
    }}

    .check-yes {{
      color: var(--success);
      font-weight: 800;
      font-size: 15px;
    }}

    .check-no {{
      color: var(--danger);
      font-weight: 800;
      font-size: 15px;
    }}

    /* Document Footer */
    .doc-footer {{
      background: #0f172a;
      color: #94a3b8;
      padding: 28px 48px;
      border-top: 1px solid #1e293b;
    }}

    .footer-top {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid #1e293b;
    }}

    .footer-brand {{
      display: flex;
      align-items: center;
      gap: 14px;
    }}

    .footer-brand h4 {{
      color: white;
      font-size: 14px;
      font-weight: 700;
    }}

    .footer-brand p {{
      font-size: 11.5px;
      color: #64748b;
    }}

    .footer-badge {{
      background: rgba(236, 72, 153, 0.15);
      color: #f472b6;
      border: 1px solid rgba(236, 72, 153, 0.3);
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 10.5px;
      font-weight: 700;
    }}

    .footer-legal {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11.5px;
    }}

    .footer-mandate {{
      color: #cbd5e1;
      font-weight: 600;
      letter-spacing: 0.2px;
    }}

    .footer-mandate span {{
      color: var(--accent);
    }}

    /* =========================================================================
       PRINT SPECIFIC STYLES - ENGINEERED FOR PERFECT PAGINATION & ZERO SPLITS
       ========================================================================= */
    @media print {{
      @page {{
        size: A4 portrait;
        margin: 20mm 12mm 18mm 12mm; /* Clean clearance for PyMuPDF running headers & footers */
      }}

      body {{
        background: white !important;
        color: #0f172a !important;
        font-size: 11px !important;
        line-height: 1.35 !important;
      }}

      .screen-toolbar {{
        display: none !important;
      }}

      .document-container {{
        max-width: 100% !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
        border: none !important;
        border-radius: 0 !important;
      }}

      .doc-content {{
        padding: 6px 0 !important;
        max-width: 100% !important;
        width: 100% !important;
      }}

      .page-break {{
        page-break-before: always !important;
        break-before: page !important;
      }}

      .keep-together {{
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }}

      .section-header {{
        break-after: avoid !important;
        page-break-after: avoid !important;
        margin-bottom: 10px !important;
        padding-bottom: 5px !important;
      }}

      .section-block {{
        margin-bottom: 18px !important;
      }}

      /* Page 1: Hero & Overview Compact Styles */
      .doc-hero {{
        padding: 18px 22px 14px !important;
        border-radius: 12px !important;
        margin-bottom: 12px !important;
      }}
      .hero-top {{
        margin-bottom: 10px !important;
      }}
      .hero-logo {{
        height: 36px !important;
        padding: 4px 10px !important;
      }}
      .meta-badge {{
        font-size: 9px !important;
        padding: 3px 7px !important;
      }}
      .hero-title {{
        font-size: 20px !important;
        line-height: 1.2 !important;
        margin-bottom: 6px !important;
      }}
      .hero-subtitle {{
        font-size: 10.5px !important;
        line-height: 1.35 !important;
        margin-bottom: 10px !important;
      }}
      .hero-kpis {{
        margin-top: 10px !important;
        gap: 8px !important;
      }}
      .kpi-card {{
        padding: 6px 10px !important;
      }}
      .kpi-value {{
        font-size: 17px !important;
        margin-bottom: 2px !important;
      }}
      .kpi-label {{
        font-size: 8.5px !important;
      }}

      .custom-ai-callout {{
        padding: 8px 12px !important;
        margin-bottom: 10px !important;
        gap: 10px !important;
      }}
      .ai-callout-icon {{
        font-size: 18px !important;
        padding: 5px !important;
      }}
      .ai-callout-content h3 {{
        font-size: 12px !important;
      }}
      .ai-callout-content p {{
        font-size: 9.8px !important;
        line-height: 1.32 !important;
      }}

      .executive-summary-text {{
        font-size: 10.2px !important;
        line-height: 1.36 !important;
        margin-bottom: 8px !important;
      }}

      .unv-highlight-box {{
        margin: 10px 0 0 0 !important;
        padding: 10px 14px !important;
        gap: 14px !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }}
      .unv-box-left {{
        min-width: 105px !important;
      }}
      .unv-logo-img {{
        width: 80px !important;
        padding: 3px 6px !important;
      }}
      .unv-badge-pill {{
        font-size: 8px !important;
        padding: 2px 6px !important;
      }}
      .unv-title {{
        font-size: 12.5px !important;
        margin-bottom: 3px !important;
      }}
      .unv-desc {{
        font-size: 10px !important;
        line-height: 1.32 !important;
        margin-bottom: 6px !important;
      }}
      .unv-compatibility-note {{
        font-size: 9.5px !important;
        padding: 5px 8px !important;
        line-height: 1.3 !important;
      }}

      /* Page 2: Core 6 Feature Cards - FORCED IN ONE SINGLE PAGE */
      .core-features-section {{
        page-break-before: always !important;
        break-before: page !important;
        page-break-after: always !important;
        break-after: page !important;
      }}
      .core-features-section .section-header {{
        margin-bottom: 8px !important;
        padding-bottom: 4px !important;
      }}
      .core-features-section .feature-grid {{
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 8px !important;
      }}
      .core-features-section .feature-card {{
        padding: 9px 12px !important;
        margin: 0 !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }}
      .core-features-section .card-top {{
        margin-bottom: 3px !important;
      }}
      .core-features-section .card-icon-box {{
        width: 26px !important;
        height: 26px !important;
        font-size: 13px !important;
      }}
      .core-features-section .card-badge {{
        font-size: 8.5px !important;
        padding: 1px 5px !important;
      }}
      .core-features-section .card-title {{
        font-size: 12px !important;
        margin-bottom: 2px !important;
      }}
      .core-features-section .card-desc {{
        font-size: 9.8px !important;
        line-height: 1.28 !important;
        margin-bottom: 3px !important;
      }}
      .core-features-section .card-bullets {{
        margin-top: 3px !important;
        padding-top: 3px !important;
        gap: 2px !important;
      }}
      .core-features-section .card-bullets li {{
        font-size: 9.2px !important;
        line-height: 1.22 !important;
      }}

      /* Page 3: Architecture & Tech Specs */
      .architecture-section {{
        page-break-before: always !important;
        break-before: page !important;
        page-break-after: always !important;
        break-after: page !important;
      }}
      .architecture-section .arch-banner {{
        padding: 12px 16px !important;
        margin-bottom: 12px !important;
      }}
      .architecture-section .arch-node {{
        padding: 8px 6px !important;
      }}
      .architecture-section .arch-node-title {{
        font-size: 11px !important;
      }}
      .architecture-section .arch-node-desc {{
        font-size: 8.8px !important;
      }}
      .architecture-section .feature-grid {{
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 8px !important;
        margin-bottom: 10px !important;
      }}
      .architecture-section .feature-card {{
        padding: 8px 10px !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }}
      .architecture-section .card-title {{
        font-size: 11.2px !important;
        margin-bottom: 2px !important;
      }}
      .architecture-section .card-desc {{
        font-size: 9.2px !important;
        line-height: 1.28 !important;
      }}
      .architecture-section .card-bullets li {{
        font-size: 9px !important;
      }}

      /* Page 4: GCC Localization Table - IN ONE SINGLE PAGE */
      .gcc-table-section {{
        page-break-before: always !important;
        break-before: page !important;
        page-break-after: always !important;
        break-after: page !important;
      }}
      .gcc-table-section .spec-table-wrap {{
        margin-bottom: 0 !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }}
      .gcc-table-section table.spec-table {{
        font-size: 9.5px !important;
      }}
      .gcc-table-section table.spec-table th {{
        padding: 5px 8px !important;
        font-size: 9px !important;
      }}
      .gcc-table-section table.spec-table td {{
        padding: 5px 8px !important;
        font-size: 9.2px !important;
        line-height: 1.28 !important;
      }}

      /* Page 5: Comparison Matrix - IN ONE SINGLE PAGE */
      .comparison-section {{
        page-break-before: always !important;
        break-before: page !important;
        page-break-after: always !important;
        break-after: page !important;
      }}
      .comparison-section .spec-table-wrap {{
        margin-bottom: 0 !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }}
      .comparison-section table.matrix-table {{
        font-size: 9.2px !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }}
      .comparison-section table.matrix-table th {{
        padding: 5px 8px !important;
        font-size: 9px !important;
      }}
      .comparison-section table.matrix-table td {{
        padding: 5px 8px !important;
        font-size: 9px !important;
        line-height: 1.25 !important;
      }}

      /* Page 6: Landscape 10-50 Cameras - IN ONE SINGLE PAGE */
      @page landscape-page {{
        size: A4 landscape;
        margin: 16mm 12mm 16mm 12mm;
      }}

      .landscape-section {{
        page: landscape-page;
        break-before: page !important;
        page-break-before: always !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
        width: 100% !important;
        max-width: 100% !important;
      }}

      .landscape-section .spec-table-wrap {{
        width: 100% !important;
        max-width: 100% !important;
        overflow: visible !important;
      }}

      .landscape-section table.spec-table {{
        width: 100% !important;
        max-width: 100% !important;
        table-layout: fixed !important;
        font-size: 9.2px !important;
      }}

      .landscape-section table.spec-table th {{
        padding: 5px 8px !important;
      }}

      .landscape-section table.spec-table td {{
        padding: 4px 8px !important;
      }}

      .doc-footer {{
        display: none !important; /* Handled by PyMuPDF running footers */
      }}
    }}

    @media (max-width: 768px) {{
      .doc-hero {{ padding: 26px 18px; }}
      .hero-top {{ flex-direction: column; align-items: flex-start; gap: 14px; }}
      .hero-title {{ font-size: 24px; }}
      .hero-kpis {{ grid-template-columns: repeat(2, 1fr); }}
      .doc-content {{ padding: 20px 16px; }}
      .feature-grid, .feature-grid.three-col {{ grid-template-columns: 1fr; }}
      .arch-grid {{ grid-template-columns: 1fr; }}
      .unv-highlight-box {{ flex-direction: column; text-align: center; }}
      .footer-top, .footer-legal {{ flex-direction: column; gap: 12px; align-items: flex-start; }}
    }}
  </style>
</head>
<body>

  <!-- Screen Top Navigation Toolbar -->
  <header class="screen-toolbar">
    <div class="toolbar-brand">
      <img src="{logo_src}" alt="SaNDS Lab" style="height: 26px; background: white; padding: 2px 8px; border-radius: 4px;">
      <span>CCTV AI Face Attendance</span>
      <span class="badge-tag">V2.0 Enterprise</span>
      <span class="ai-tag">Custom AI Engineered</span>
      <span class="unv-tool-tag"><img src="{unv_logo_src}" alt="UNV" style="height: 14px; width: auto; filter: brightness(1.2);"> UNV Recommended</span>
    </div>
    <div class="toolbar-actions">
      <button class="btn btn-secondary" onclick="toggleTheme()" id="themeToggleBtn">
        <span>🌙</span> Dark Preview
      </button>
      <button class="btn btn-primary" onclick="window.print()">
        <span>🖨️</span> Print / Save as PDF
      </button>
      <a class="btn btn-accent" href="CCTV_Face_Attendance_Product_Features.pdf" download="SaNDS_Lab_CCTV_Face_Attendance_Features.pdf">
        <span>📥</span> Download PDF
      </a>
    </div>
  </header>

  <!-- Main Product Specification Document -->
  <main class="document-container">

    <!-- =========================================================================
         PAGE 1: HERO HEADER, EXECUTIVE SUMMARY & UNV CERTIFIED RECOMMENDATION
         ========================================================================= -->
    <section class="doc-hero">
      <div class="hero-top">
        <img src="{logo_src}" alt="SaNDS Lab Middle East W.L.L" class="hero-logo">
        <div class="hero-meta-badges">
          <div class="meta-badge highlight">✦ Enterprise V2.0</div>
          <div class="meta-badge ai-badge">⚡ Custom AI Engineered by SaNDS Lab</div>
          <div class="meta-badge unv-badge">
            <img src="{unv_logo_src}" alt="UNV" style="height: 15px; width: auto; vertical-align: middle; filter: brightness(1.2);">
            <span>⭐ UNV Cameras Recommended (Highly Compatible)</span>
          </div>
          <div class="meta-badge" style="background: rgba(16, 185, 129, 0.18); border-color: rgba(16, 185, 129, 0.4); color: #34d399;">⚖️ Bahrain &amp; Gulf Labor Law Compliant</div>
          <div class="meta-badge">🔄 SaNDS Lab HR Solution Sync</div>
          <div class="meta-badge">🔒 100% Offline AI</div>
          <div class="meta-badge">📹 Multi-Gate RTSP</div>
        </div>
      </div>

      <div class="hero-title-area">
        <div class="hero-kicker">SaNDS Lab Middle East W.L.L • Custom AI Engineered Solutions</div>
        <h1 class="hero-title">
          CCTV AI Multi-Gate <span>Face Attendance &amp; Security</span> Surveillance System
        </h1>
        <p class="hero-subtitle">
          Next-generation contactless biometric workforce attendance, live visitor movement intelligence, and active security threat surveillance powered by <strong>Custom AI Engineered by SaNDS Lab</strong>. Fully synchronized with <strong>SaNDS Lab Middle East HR Solution</strong> and architected for 100% compliance with <strong>Bahrain &amp; Gulf (GCC) Labor Law regulations</strong> with automated overtime, Ramadan schedules, and payroll ledger exports.
        </p>
      </div>

      <!-- KPI Metrics -->
      <div class="hero-kpis">
        <div class="kpi-card">
          <div class="kpi-value emerald">100%</div>
          <div class="kpi-label">Offline &amp; Private (Zero Cloud)</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value blue">&lt; 0.4s</div>
          <div class="kpi-label">Sub-Second Recognition Speed</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value accent">Dual-Gate</div>
          <div class="kpi-label">Automated IN / OUT Trip Logic</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value amber">99.4%</div>
          <div class="kpi-label">Custom AI Biometric Accuracy</div>
        </div>
      </div>
    </section>

    <!-- Content Sections -->
    <div class="doc-content">

      <!-- Custom AI Engineered Callout Banner -->
      <div class="custom-ai-callout">
        <div class="ai-callout-icon">⚡</div>
        <div class="ai-callout-content">
          <h3>Custom AI Engineered by SaNDS Lab Middle East W.L.L</h3>
          <p>
            Unlike generic cloud APIs or off-the-shelf facial recognition gadgets, this solution features a <strong>proprietary computer vision architecture engineered directly by SaNDS Lab</strong>. Built specifically for complex facility entrances, uneven illumination, natural walking-speed throughput, and continuous CCTV streams, delivering enterprise-grade accuracy with zero cloud latency and complete data sovereignty.
          </p>
        </div>
      </div>

      <!-- Executive Overview Banner -->
      <section class="section-block">
        <div class="section-header">
          <div class="section-title-wrap">
            <div class="section-icon">🏢</div>
            <h2 class="section-title">Executive Summary &amp; Commercial Value</h2>
          </div>
          <span class="section-tag">Value Proposition</span>
        </div>
        <p class="executive-summary-text" style="color: var(--text-sub); font-size: 13.5px; margin-bottom: 12px; line-height: 1.55;">
          Traditional biometric attendance systems rely on touch-based fingerprint readers or facial terminals installed at doorframes, resulting in morning bottlenecks, hardware wear-and-tear, maintenance costs, and hygiene concerns. Cloud-based facial recognition software introduces recurring monthly SaaS subscriptions, external network latency, and severe data privacy compliance liabilities under GCC Personal Data Protection Laws (PDPL) and GDPR.
        </p>
        <p class="executive-summary-text" style="color: var(--text-sub); font-size: 13.5px; line-height: 1.55;">
          <strong>SaNDS Lab CCTV AI Multi-Gate Face Attendance</strong> solves all these challenges through an innovative, non-intrusive paradigm: workers and visitors walk naturally through entrances while standard security CCTV cameras capture live video streams. The local Python AI engine detects and identifies faces in real-time on-premise, tracks entry/exit transitions across multi-gate pairs, compiles daily timesheets with outing break analytics, alerts security against blacklisted intruders, and syncs seamlessly with corporate HR payroll databases.
        </p>
      </section>

      <!-- UNV Camera Certified Compatibility & Recommendation Box -->
      <div class="unv-highlight-box">
        <div class="unv-box-left">
          <img src="{unv_logo_src}" alt="Uniview (UNV)" class="unv-logo-img">
          <div class="unv-badge-pill">⭐ Recommended Camera Brand</div>
        </div>
        <div class="unv-box-right">
          <h3 class="unv-title">
            <span>UNV Cameras: Highly Compatible &amp; Strongly Recommended</span>
          </h3>
          <p class="unv-desc">
            <strong>UNV (Uniview) CCTV Cameras are highly compatible and strongly recommended by SaNDS Lab</strong> for deployment with our AI face attendance system. UNV cameras deliver outstanding RTSP stream consistency, sub-second packet transit times, high-fidelity True WDR (Wide Dynamic Range), and superior optical clarity across changing ambient light conditions, ensuring peak face recognition accuracy.
          </p>
          <div class="unv-compatibility-note">
            <span class="note-tag">Universal Multi-Brand Compatibility:</span>
            <span>While <strong>UNV Cameras are recommended</strong> for optimum performance and factory-tested stability, the SaNDS Lab system is also <strong>fully compatible with other major CCTV brands</strong> including <strong>Hikvision, Dahua, Axis Communications, Hanwha Vision, and all standard ONVIF (Profile S/G/T) compliant IP Cameras</strong>.</span>
          </div>
        </div>
      </div>

      <!-- =========================================================================
           PAGE 2: CORE PRODUCT FEATURES (ALL 6 CARDS KEPT TOGETHER ON ONE PAGE)
           ========================================================================= -->
      <section class="section-block core-features-section">
        <div class="section-header">
          <div class="section-title-wrap">
            <div class="section-icon pink">⚡</div>
            <h2 class="section-title">Core Product Features &amp; Capabilities</h2>
          </div>
          <span class="section-tag">V2.0 Feature Matrix (100% On-Premise)</span>
        </div>

        <div class="feature-grid">

          <!-- Feature 1: 100% Offline Deep Learning -->
          <div class="feature-card">
            <div class="card-top">
              <div class="card-icon-box blue-bg">🧠</div>
              <span class="card-badge ai">Custom AI Engineered</span>
            </div>
            <h3 class="card-title">100% Offline Deep Learning AI</h3>
            <p class="card-desc">
              Custom AI Engineered by SaNDS Lab to run fully on-premise without transmitting any image or biometric data over the internet. Features zero recurring cloud API charges, zero external latency, and complete data privacy compliance.
            </p>
            <ul class="card-bullets">
              <li><span class="bullet-icon">✓</span><strong>Dual-Stage Architecture:</strong> Custom Engineered By SaNDS Lab AI Engine integrating OpenCV YuNet (~232 KB) detector and SFace (~38 MB) 128-dimensional embedding model.</li>
              <li><span class="bullet-icon">✓</span><strong>Adaptive Normalization:</strong> Robust recognition across variable lighting, angles, head tilt, and high-res mobile photo enrollments.</li>
              <li><span class="bullet-icon">✓</span><strong>Anti-Duplication Throttle:</strong> Configurable cooldown timer (e.g. 60 seconds) prevents multiple log spamming for standing personnel.</li>
            </ul>
          </div>

          <!-- Feature 2: Multi-Camera Multi-Gate (UNV Recommended & Multi-Brand Compatible) -->
          <div class="feature-card">
            <div class="card-top">
              <div class="card-icon-box unv-bg">📹</div>
              <span class="card-badge unv">UNV Recommended</span>
            </div>
            <h3 class="card-title">Multi-Camera Gate Pairing (IN / OUT)</h3>
            <p class="card-desc">
              Connects to unlimited standard IP CCTV cameras over standard RTSP (Port 554). Supports grouping cameras into logical gate pairs representing physical doors, gates, turnstiles, and emergency exits.
            </p>
            <ul class="card-bullets">
              <li><span class="bullet-icon unv">✓</span><strong>UNV Cameras Recommended:</strong> UNV (Uniview) cameras are highly compatible and strongly recommended for lowest frame jitter and ultra-stable 24/7 RTSP streams.</li>
              <li><span class="bullet-icon">✓</span><strong>Other Brands Compatible:</strong> Also 100% compatible with Hikvision, Dahua, Axis, and all ONVIF-compliant CCTV cameras.</li>
              <li><span class="bullet-icon">✓</span><strong>Directional Role Assignment:</strong> Cameras designated specifically as Entry (<code>IN</code>) or Exit (<code>OUT</code>).</li>
              <li><span class="bullet-icon">✓</span><strong>Live Stream Watchdog:</strong> Automatic reconnection and ping health monitoring for online/offline status.</li>
            </ul>
          </div>

          <!-- Feature 3: Timesheet & Trip Calculation -->
          <div class="feature-card">
            <div class="card-top">
              <div class="card-icon-box emerald-bg">⏱️</div>
              <span class="card-badge core">Automated Logic</span>
            </div>
            <h3 class="card-title">Multi-Trip Timesheet &amp; Outing Analytics</h3>
            <p class="card-desc">
              Eliminates the confusion of multiple punches during a working day. The backend calculation engine chronologically aggregates all punches into accurate, enterprise-grade daily timesheets.
            </p>
            <ul class="card-bullets">
              <li><span class="bullet-icon">✓</span><strong>First IN &amp; Last OUT:</strong> Accurately tracks official start and departure times for shift compliance.</li>
              <li><span class="bullet-icon">✓</span><strong>Outing &amp; Trips Counter:</strong> Automatically detects every mid-day exit (e.g. lunch breaks, meetings, errands).</li>
              <li><span class="bullet-icon">✓</span><strong>Productive Hours vs. Breaks:</strong> Computes exact net inside work hours vs. cumulative outside break minutes.</li>
              <li><span class="bullet-icon">✓</span><strong>Shift Policy Evaluation:</strong> Automatic flagging of Present, Late, Half-Day, Under-Time, or Absent status.</li>
            </ul>
          </div>

          <!-- Feature 4: Visitor & Guest Intelligence -->
          <div class="feature-card">
            <div class="card-top">
              <div class="card-icon-box purple-bg">👥</div>
              <span class="card-badge new">New in V2.0</span>
            </div>
            <h3 class="card-title">Guest &amp; Visitor Movement Tracking</h3>
            <p class="card-desc">
              Transform passive CCTV cameras into an intelligent visitor management solution without requiring manual sign-in books or front-desk reception bottlenecks.
            </p>
            <ul class="card-bullets">
              <li><span class="bullet-icon pink">✓</span><strong>Auto Guest Profiling:</strong> Unenrolled faces detected at entry gates automatically receive a unique tracking code (<code>GST-XXXX</code>).</li>
              <li><span class="bullet-icon pink">✓</span><strong>Movement Timeline:</strong> Complete audit trail of entry time, gate location, stay duration, and exit punch.</li>
              <li><span class="bullet-icon pink">✓</span><strong>Visitor Categorization:</strong> Tag guests as Clients, Contractors, Maintenance, Delivery, or VIPs with company and phone info.</li>
            </ul>
          </div>

          <!-- Feature 5: Blacklist Security Breaches -->
          <div class="feature-card">
            <div class="card-top">
              <div class="card-icon-box danger-bg">🛡️</div>
              <span class="card-badge new">New in V2.0</span>
            </div>
            <h3 class="card-title">Blacklist &amp; Security Breach Alerting</h3>
            <p class="card-desc">
              Proactive perimeter security surveillance. Safeguards premises by maintaining a biometric watchlist of banned personnel, disgruntled former employees, and security risks.
            </p>
            <ul class="card-bullets">
              <li><span class="bullet-icon">✓</span><strong>Threat Level Classification:</strong> Categorized as Critical, High, Medium, or Low threat with incident rationale.</li>
              <li><span class="bullet-icon">✓</span><strong>Instant HUD Breach Alert:</strong> Real-time pop-up modal on operator screens with snapshot photo, gate location, and alarm.</li>
              <li><span class="bullet-icon">✓</span><strong>Incident Resolution Workflow:</strong> Security officers can log dispatched guard actions and mark incidents as Resolved.</li>
            </ul>
          </div>

          <!-- Feature 6: Live Monitor & HUD Popups -->
          <div class="feature-card">
            <div class="card-top">
              <div class="card-icon-box amber-bg">🔔</div>
              <span class="card-badge new">V1.1 Sprint</span>
            </div>
            <h3 class="card-title">Live Video Monitor &amp; Floating Toast HUD</h3>
            <p class="card-desc">
              Comprehensive real-time command center interface designed for security guard kiosks and HR reception screens with rich visual feedback.
            </p>
            <ul class="card-bullets">
              <li><span class="bullet-icon pink">✓</span><strong>Live Face Overlay:</strong> Dynamic bounding boxes, identity tags, and confidence percentages over video stream.</li>
              <li><span class="bullet-icon pink">✓</span><strong>Corner Punch Toast:</strong> Floating toast in the bottom-right corner displaying verified profile photo, name, and IN/OUT badge.</li>
              <li><span class="bullet-icon pink">✓</span><strong>Admin UI Toggle:</strong> Complete administrator control to toggle floating popups on/off in System Settings.</li>
            </ul>
          </div>

        </div>
      </section>

      <!-- =========================================================================
           PAGE 3: SYSTEM ARCHITECTURE, HR SOLUTION SYNC, LABOR ENGINE & HARDWARE
           ========================================================================= -->
      <section class="section-block architecture-section">
        <div class="section-header">
          <div class="section-title-wrap">
            <div class="section-icon purple">🏗️</div>
            <h2 class="section-title">System Architecture &amp; Data Pipeline</h2>
          </div>
          <span class="section-tag">Zero Cloud Topology</span>
        </div>

        <div class="arch-banner">
          <div class="arch-grid">
            <div class="arch-node">
              <span class="arch-node-num">1</span>
              <h4 class="arch-node-title">CCTV RTSP Ingest</h4>
              <p class="arch-node-desc">UNV Recommended (also Hikvision, Dahua, Axis, ONVIF) stream RTSP H.264/H.265 via Port 554.</p>
            </div>
            <div class="arch-node">
              <span class="arch-node-num">2</span>
              <h4 class="arch-node-title">SaNDS AI Worker</h4>
              <p class="arch-node-desc">Custom Engineered by SaNDS Lab AI Engine (YuNet detector + SFace 128-d vector matcher).</p>
            </div>
            <div class="arch-node">
              <span class="arch-node-num">3</span>
              <h4 class="arch-node-title">PHP REST API</h4>
              <p class="arch-node-desc">Validates punch cooldowns, matches IN/OUT gates, logs snapshots, and updates MySQL.</p>
            </div>
            <div class="arch-node">
              <span class="arch-node-num">4</span>
              <h4 class="arch-node-title">React UI &amp; HR Sync</h4>
              <p class="arch-node-desc">Displays live HUD popups, calculates timesheets, and synchronizes with HR database.</p>
            </div>
          </div>
        </div>

        <!-- 4 Sub-Features Grid -->
        <div class="feature-grid" style="margin-bottom: 20px;">
          
          <div class="feature-card">
            <div class="card-top">
              <div class="card-icon-box blue-bg">🔄</div>
              <span class="card-badge core">Native Bridge</span>
            </div>
            <h4 class="card-title">SaNDS Lab Middle East HR Solution 2-Way Sync</h4>
            <p class="card-desc">
              Native bi-directional data synchronization with <strong>SaNDS Lab Middle East HR Solution</strong> (<code>hr_solution_db</code>). 1-Click import of staff CPR numbers, designations, and biometric profile photos; automated daily export of verified timesheets directly into corporate payroll ledger with audit logs.
            </p>
          </div>

          <div class="feature-card">
            <div class="card-top">
              <div class="card-icon-box emerald-bg">⚖️</div>
              <span class="card-badge ai">Labor Law Compliant</span>
            </div>
            <h4 class="card-title">Bahrain &amp; Gulf (GCC) Labor Law Engine</h4>
            <p class="card-desc">
              Built specifically to comply with <strong>Bahrain Labour Law (Law No. 36 of 2012)</strong> and GCC unified labor regulations. Automates statutory 8h/day (48h/week) caps, daytime overtime (125%), night/weekend overtime (150%), mandatory 6-hour continuous work break enforcement, and LMRA-ready audit trails.
            </p>
          </div>

          <div class="feature-card">
            <div class="card-top">
              <div class="card-icon-box pink-bg">🌙</div>
              <span class="card-badge core">Seasonal Scheduler</span>
            </div>
            <h4 class="card-title">Ramadan Reduced Hours &amp; GCC Shifts</h4>
            <p class="card-desc">
              Supports Standard Office, School Class, Flexible, Night, and statutory <strong>Ramadan Reduced Hours (6 hours/day, 36 hours/week)</strong> with customizable grace periods for late check-in and early departure without salary deduction penalties.
            </p>
          </div>

          <div class="feature-card">
            <div class="card-top">
              <div class="card-icon-box purple-bg">📊</div>
              <span class="card-badge core">Data Grid</span>
            </div>
            <h4 class="card-title">Universal Fast DataTable (V1.1)</h4>
            <p class="card-desc">
              High-performance grid across all 7 views with instant multi-column search, dynamic sorting, customizable page sizes (10 to 100 rows), and 1-click Excel/CSV export for payroll administrators.
            </p>
          </div>

        </div>

        <!-- Technical Specifications & CCTV Stream Deployment Standards -->
        <div class="section-header" style="margin-top: 10px;">
          <div class="section-title-wrap">
            <div class="section-icon unv">💻</div>
            <h3 class="section-title" style="font-size: 17px;">Technical Specifications &amp; Hardware Compatibility</h3>
          </div>
          <span class="section-tag">Deployment Specs</span>
        </div>

        <div class="feature-grid">

          <div class="feature-card">
            <h4 class="card-title" style="color: var(--primary);">Software Architecture Stack</h4>
            <ul class="card-bullets" style="border-top: none; padding-top: 0;">
              <li><span class="bullet-icon">▸</span><strong>AI Engine:</strong> Custom AI Engineered by SaNDS Lab (Python 3.10+, OpenCV DNN YuNet + SFace ONNX).</li>
              <li><span class="bullet-icon">▸</span><strong>Frontend Application:</strong> ReactJS 18, Vite Bundler, Vanilla Modern CSS, Lucide Icons.</li>
              <li><span class="bullet-icon">▸</span><strong>Backend Middleware:</strong> PHP 8.1+ REST API, PDO Secure MySQL Driver, CORS Middleware.</li>
              <li><span class="bullet-icon">▸</span><strong>Database:</strong> MySQL 8.0+ / MariaDB with UTF8MB4 Full International Unicode support.</li>
              <li><span class="bullet-icon">▸</span><strong>Streaming Protocol:</strong> RTSP (Real-Time Streaming Protocol) H.264 / H.265 on Port 554.</li>
            </ul>
          </div>

          <div class="feature-card">
            <h4 class="card-title" style="color: #0066b3;">CCTV Compatibility &amp; Deployment Standards</h4>
            <ul class="card-bullets" style="border-top: none; padding-top: 0;">
              <li><span class="bullet-icon unv">▸</span><strong>Recommended Cameras:</strong> <strong>UNV (Uniview) IP Cameras are Highly Compatible &amp; Strongly Recommended</strong> for proven sub-second RTSP decoding and 24/7 stream resilience.</li>
              <li><span class="bullet-icon">▸</span><strong>Universal Brand Support:</strong> Also fully compatible with Hikvision, Dahua, Axis, Hanwha Vision, and all standard ONVIF Profile S/G/T IP Cameras.</li>
              <li><span class="bullet-icon">▸</span><strong>Dual-Stream Optimization:</strong> Sub-stream (640x360 @ 10-15 FPS) for AI face detection; Main-stream (1080p) for high-res archival snapshots.</li>
              <li><span class="bullet-icon">▸</span><strong>Camera Positioning:</strong> Mounted at 2.0m – 2.5m height, facing entrance walk-path at a 10°–15° downward angle.</li>
            </ul>
          </div>

        </div>
      </section>

      <!-- =========================================================================
           PAGE 4: GCC LOCALIZATION & LABOR LAW COMPLIANCE (IN ONE SINGLE PAGE)
           ========================================================================= -->
      <section class="section-block gcc-table-section">
        <div class="section-header">
          <div class="section-title-wrap">
            <div class="section-icon emerald">🌍</div>
            <h2 class="section-title">GCC Localization, Labor Law &amp; Corporate Branding</h2>
          </div>
          <span class="section-tag">Enterprise Ready</span>
        </div>

        <div class="spec-table-wrap">
          <table class="spec-table">
            <thead>
              <tr>
                <th style="width: 28%;">Feature / Capability</th>
                <th style="width: 52%;">Supported Specifications</th>
                <th style="width: 20%; text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>SaNDS Lab HR Solution Bridge</strong></td>
                <td>Automated 2-way sync with <code>hr_solution_db</code>: CPR sync, designation mapping, automated attendance export to payroll ledger</td>
                <td style="text-align: center;"><span class="status-pill success">✓ Native 2-Way Sync</span></td>
              </tr>
              <tr>
                <td><strong>Bahrain Labour Law (Law 36/2012)</strong></td>
                <td>Statutory 8h/day &amp; 48h/week limits, 125% daytime overtime, 150% night/weekend overtime, 6h continuous break tracking, LMRA audit records</td>
                <td style="text-align: center;"><span class="status-pill success">✓ 100% Compliant</span></td>
              </tr>
              <tr>
                <td><strong>Gulf (GCC) Labor Framework</strong></td>
                <td>UAE Federal Decree-Law 33/2021, Saudi Labor Law M/51, Qatar, Kuwait, Oman regional labor standards</td>
                <td style="text-align: center;"><span class="status-pill success">✓ 100% Compliant</span></td>
              </tr>
              <tr>
                <td><strong>Ramadan Seasonal Hours Engine</strong></td>
                <td>1-Click automated shift scheduler reducing official working time to statutory 6 hours/day (36h/week) for fasting employees</td>
                <td style="text-align: center;"><span class="status-pill success">✓ Automated</span></td>
              </tr>
              <tr>
                <td><strong>Camera Brand Certification</strong></td>
                <td><strong>UNV (Uniview) Highly Compatible &amp; Strongly Recommended</strong>; other brands (Hikvision, Dahua, Axis, ONVIF) also 100% compatible</td>
                <td style="text-align: center;"><span class="status-pill primary">✓ UNV Certified</span></td>
              </tr>
              <tr>
                <td><strong>GCC &amp; India Timezones</strong></td>
                <td>Asia/Bahrain, Asia/Dubai, Asia/Riyadh, Asia/Qatar, Asia/Kuwait, Asia/Muscat, Asia/Kolkata (IST)</td>
                <td style="text-align: center;"><span class="status-pill success">✓ Active</span></td>
              </tr>
              <tr>
                <td><strong>Multi-Currency Formats</strong></td>
                <td>BHD (Bahraini Dinar), SAR, AED, QAR, KWD, OMR, INR (₹), USD ($)</td>
                <td style="text-align: center;"><span class="status-pill success">✓ Active</span></td>
              </tr>
              <tr>
                <td><strong>Date &amp; Time Formats</strong></td>
                <td>Configurable <code>DD/MM/YYYY</code>, <code>YYYY-MM-DD</code>, <code>MM/DD/YYYY</code> | 12-Hour (AM/PM) or 24-Hour Military Time</td>
                <td style="text-align: center;"><span class="status-pill success">✓ Active</span></td>
              </tr>
              <tr>
                <td><strong>Corporate Theme Customizer</strong></td>
                <td>Custom Header Color, Menu Accent Color (Default Royal Blue <code>#1e40af</code> &amp; Pink <code>#ec4899</code>), Light/Dark Switcher</td>
                <td style="text-align: center;"><span class="status-pill primary">✓ Configurable</span></td>
              </tr>
              <tr>
                <td><strong>Custom Brand Assets</strong></td>
                <td>Official SaNDS Lab logo integration, custom organization title, and mandated corporate footer disclaimer</td>
                <td style="text-align: center;"><span class="status-pill accent">✓ Branded</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- =========================================================================
           PAGE 5: COMPETITIVE COMPARISON MATRIX (IN ONE SINGLE PAGE)
           ========================================================================= -->
      <section class="section-block comparison-section">
        <div class="section-header">
          <div class="section-title-wrap">
            <div class="section-icon pink">⚖️</div>
            <h2 class="section-title">Product Comparison: Why SaNDS Lab CCTV AI Wins</h2>
          </div>
          <span class="section-tag">Market Comparison</span>
        </div>

        <div class="spec-table-wrap">
          <table class="matrix-table">
            <thead>
              <tr>
                <th style="width: 27%;">Evaluation Criteria</th>
                <th class="sands-col" style="width: 29%;">SaNDS Lab CCTV AI (V2.0)</th>
                <th style="width: 22%;">Fingerprint / RFID Terminals</th>
                <th style="width: 22%;">Cloud Facial SaaS</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>SaNDS Lab HR Solution Sync</strong></td>
                <td class="sands-col"><span class="check-yes">Native 2-Way Sync (hr_solution_db)</span></td>
                <td><span class="check-no">Manual Excel Export / Import</span></td>
                <td><span class="check-no">Costly Custom API Connector</span></td>
              </tr>
              <tr>
                <td><strong>Bahrain &amp; GCC Labor Compliance</strong></td>
                <td class="sands-col"><span class="check-yes">100% Built-in (Bahrain Law 36/2012)</span></td>
                <td><span class="check-no">Manual Spreadsheet Adjustments</span></td>
                <td><span class="check-no">Generic US/EU Rules Only</span></td>
              </tr>
              <tr>
                <td><strong>Camera Brand Compatibility</strong></td>
                <td class="sands-col"><span class="check-yes">UNV Recommended (Other Brands Also Compatible)</span></td>
                <td><span class="check-no">Proprietary Terminals Only</span></td>
                <td><span class="check-no">Restricted Cloud Hardware</span></td>
              </tr>
              <tr>
                <td><strong>Recurring Monthly Software Fees</strong></td>
                <td class="sands-col"><span class="check-yes">Zero ($0 Monthly Fees)</span></td>
                <td><span class="check-yes">Zero ($0)</span></td>
                <td><span class="check-no">High Monthly Subscriptions</span></td>
              </tr>
              <tr>
                <td><strong>Biometric Privacy &amp; GDPR / PDPL</strong></td>
                <td class="sands-col"><span class="check-yes">100% On-Premise LAN</span></td>
                <td><span class="check-yes">Local Hardware Storage</span></td>
                <td><span class="check-no">High Risk (Cloud Database)</span></td>
              </tr>
              <tr>
                <td><strong>Contactless / Hygiene / Walking Speed</strong></td>
                <td class="sands-col"><span class="check-yes">100% Contactless (Natural Walk)</span></td>
                <td><span class="check-no">Physical Touch Bottlenecks</span></td>
                <td><span class="check-yes">Contactless</span></td>
              </tr>
              <tr>
                <td><strong>Existing CCTV Hardware Utilization</strong></td>
                <td class="sands-col"><span class="check-yes">Yes (Standard RTSP IP Cameras)</span></td>
                <td><span class="check-no">Requires Dedicated Terminals</span></td>
                <td><span class="check-no">Requires Dedicated Terminals</span></td>
              </tr>
              <tr>
                <td><strong>Outing Breaks &amp; Multi-Trip Calculation</strong></td>
                <td class="sands-col"><span class="check-yes">Automatic IN/OUT Gate Pairing</span></td>
                <td><span class="check-no">Manual IN/OUT Button Selection</span></td>
                <td><span class="check-no">Basic Single Punch Only</span></td>
              </tr>
              <tr>
                <td><strong>Visitor Tracking &amp; Blacklist Alerts</strong></td>
                <td class="sands-col"><span class="check-yes">Built-in (Active HUD Alerts)</span></td>
                <td><span class="check-no">Not Supported</span></td>
                <td><span class="check-no">Requires Costly Add-ons</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

    </div>
  </main>

  <!-- =========================================================================
       PAGE 6: STANDALONE DEDICATED LANDSCAPE PAGE FOR SERVER SIZING (10-50 CAMS)
       ========================================================================= -->
  <div class="landscape-container landscape-section">
    <div class="section-header" style="margin-bottom: 6px; padding-bottom: 4px;">
      <div class="section-title-wrap">
        <div class="section-icon emerald" style="width: 30px; height: 30px; font-size: 15px;">🖥️</div>
        <h2 class="section-title" style="font-size: 18px;">Server Hardware Sizing &amp; Capacity Planning (10 – 50 Cameras)</h2>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span class="section-tag" style="background: rgba(0, 102, 179, 0.12); color: #0066b3; font-weight: 700; padding: 2px 8px; font-size: 10.5px;">
          <img src="{unv_logo_src}" alt="UNV" style="height: 12px; width: auto; vertical-align: middle;"> UNV Cameras Recommended
        </span>
        <span class="section-tag" style="background: var(--success-soft); color: var(--success); font-weight: 700; padding: 2px 8px; font-size: 10.5px;">Validated Benchmark Matrix</span>
      </div>
    </div>

    <p style="color: var(--text-sub); font-size: 11px; margin-bottom: 6px; line-height: 1.35;">
      Computational throughput scales predictably with concurrent RTSP video decoding channels and facial feature extraction cycles. UNV (Uniview) cameras are strongly recommended for optimal frame pacing and low latency; other brands (Hikvision, Dahua, Axis, ONVIF) are also fully compatible. Below are the verified server configurations for <strong>SaNDS Lab Custom Engineered AI Engine</strong> across 10, 20, 30, 40, and 50 camera tiers:
    </p>

    <div class="spec-table-wrap" style="margin-bottom: 6px;">
      <table class="spec-table" style="font-size: 9.8px; width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="width: 12%; padding: 5px 8px;">Camera Tier</th>
            <th style="width: 22%; padding: 5px 8px;">Processor (CPU)</th>
            <th style="width: 10%; padding: 5px 8px;">RAM</th>
            <th style="width: 18%; padding: 5px 8px;">GPU / AI Acceleration</th>
            <th style="width: 22%; padding: 5px 8px;">Storage Architecture</th>
            <th style="width: 16%; padding: 5px 8px;">Network, Chassis &amp; Power</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 4px 8px;">
              <strong style="color: var(--primary); font-size: 11px;">10 Cameras</strong><br>
              <span style="font-size: 9px; color: var(--text-muted);">(5 IN / 5 OUT Gates)</span>
            </td>
            <td style="padding: 4px 8px;">
              <strong>Intel Core i7-13700</strong><br>
              <span style="font-size: 9px; color: var(--text-sub);">(16C / 24T) or Xeon E-2378 (8C/16T)</span>
            </td>
            <td style="padding: 4px 8px;"><strong>32 GB</strong><br><span style="font-size: 9px; color: var(--text-muted);">DDR4/DDR5 3200MHz</span></td>
            <td style="padding: 4px 8px;">
              <strong>NVIDIA RTX 3060 (12GB)</strong> or<br>
              <span style="font-size: 9px; color: var(--text-sub);">Intel UHD 770 OpenVINO (CPU only)</span>
            </td>
            <td style="padding: 4px 8px;">
              <strong>512 GB NVMe M.2 SSD (OS &amp; AI)</strong><br>
              + <strong>2 TB SATA SSD (Logs/Photos)</strong>
            </td>
            <td style="padding: 4px 8px;">
              Dual 1 Gbps RJ45 LAN<br>
              <span style="font-size: 9px; color: var(--text-muted);">Tower / 1U Rack (500W PSU)</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 4px 8px;">
              <strong style="color: var(--primary); font-size: 11px;">20 Cameras</strong><br>
              <span style="font-size: 9px; color: var(--text-muted);">(10 IN / 10 OUT Gates)</span>
            </td>
            <td style="padding: 4px 8px;">
              <strong>Intel Core i9-13900K</strong><br>
              <span style="font-size: 9px; color: var(--text-sub);">(24C / 32T) or Xeon Silver 4314</span>
            </td>
            <td style="padding: 4px 8px;"><strong>64 GB</strong><br><span style="font-size: 9px; color: var(--text-muted);">DDR5 ECC / Non-ECC</span></td>
            <td style="padding: 4px 8px;">
              <strong>NVIDIA RTX 4070 (12GB)</strong> or<br>
              <span style="font-size: 9px; color: var(--text-sub);">NVIDIA RTX A2000 (12GB Workstation)</span>
            </td>
            <td style="padding: 4px 8px;">
              <strong>1 TB Enterprise NVMe (RAID 1)</strong><br>
              + <strong>4 TB Enterprise SATA (RAID 1)</strong>
            </td>
            <td style="padding: 4px 8px;">
              Dual 2.5 Gbps / 10 Gbps SFP+<br>
              <span style="font-size: 9px; color: var(--text-muted);">1U / 2U Rack (650W PSU)</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 4px 8px;">
              <strong style="color: var(--primary); font-size: 11px;">30 Cameras</strong><br>
              <span style="font-size: 9px; color: var(--text-muted);">(15 Gate Pairs)</span>
            </td>
            <td style="padding: 4px 8px;">
              <strong>Intel Xeon Silver 4416+</strong><br>
              <span style="font-size: 9px; color: var(--text-sub);">(20C / 40T) or AMD EPYC 7302 (16C)</span>
            </td>
            <td style="padding: 4px 8px;"><strong>64 GB</strong><br><span style="font-size: 9px; color: var(--text-muted);">DDR5-4800 Registered ECC</span></td>
            <td style="padding: 4px 8px;">
              <strong>NVIDIA RTX 4080 (16GB)</strong> or<br>
              <span style="font-size: 9px; color: var(--text-sub);">NVIDIA RTX A4000 (16GB PCIe)</span>
            </td>
            <td style="padding: 4px 8px;">
              <strong>2x 1 TB Enterprise NVMe (RAID 1)</strong><br>
              + <strong>8 TB Enterprise HDD (RAID 5)</strong>
            </td>
            <td style="padding: 4px 8px;">
              Dual 10 Gbps SFP+ Optical<br>
              <span style="font-size: 9px; color: var(--text-muted);">2U Rack (Redundant 750W 1+1)</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 4px 8px;">
              <strong style="color: var(--primary); font-size: 11px;">40 Cameras</strong><br>
              <span style="font-size: 9px; color: var(--text-muted);">(20 Gate Pairs)</span>
            </td>
            <td style="padding: 4px 8px;">
              <strong>Intel Xeon Gold 5418Y</strong><br>
              <span style="font-size: 9px; color: var(--text-sub);">(24C / 48T) or AMD EPYC 7443 (24C)</span>
            </td>
            <td style="padding: 4px 8px;"><strong>64 GB – 128 GB</strong><br><span style="font-size: 9px; color: var(--text-muted);">ECC Registered</span></td>
            <td style="padding: 4px 8px;">
              <strong>1x NVIDIA L4 (24GB)</strong> or<br>
              <span style="font-size: 9px; color: var(--text-sub);">2x NVIDIA RTX 4060 Ti (16GB each)</span>
            </td>
            <td style="padding: 4px 8px;">
              <strong>2x 1 TB Enterprise NVMe (RAID 1)</strong><br>
              + <strong>12 TB Storage (RAID 5)</strong>
            </td>
            <td style="padding: 4px 8px;">
              Dual 10 Gbps SFP+ Fiber<br>
              <span style="font-size: 9px; color: var(--text-muted);">2U Rack (1+1 Redundant 800W)</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 4px 8px;">
              <strong style="color: var(--primary); font-size: 11px;">50 Cameras</strong><br>
              <span style="font-size: 9px; color: var(--text-muted);">(25 Gate Pairs)</span>
            </td>
            <td style="padding: 4px 8px;">
              <strong>Dual Intel Xeon Gold 6330</strong><br>
              <span style="font-size: 9px; color: var(--text-sub);">(56C / 112T) or AMD EPYC 7763 (64C)</span>
            </td>
            <td style="padding: 4px 8px;"><strong>128 GB</strong><br><span style="font-size: 9px; color: var(--text-muted);">DDR4/DDR5 ECC Reg</span></td>
            <td style="padding: 4px 8px;">
              <strong>2x NVIDIA L4 (24GB x 2 = 48GB)</strong><br>
              <span style="font-size: 9px; color: var(--text-sub);">or 2x NVIDIA RTX 4000 Ada (32GB VRAM)</span>
            </td>
            <td style="padding: 4px 8px;">
              <strong>2x 2 TB Enterprise NVMe (RAID 1)</strong><br>
              + <strong>16 TB – 24 TB Storage (RAID 6/10)</strong>
            </td>
            <td style="padding: 4px 8px;">
              Dual 10 Gbps SFP+ Redundant<br>
              <span style="font-size: 9px; color: var(--text-muted);">2U Enterprise Rack (1+1 1100W)</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div style="background: var(--bg-alt); border-radius: var(--radius-md); padding: 6px 12px; border: 1px solid var(--border);">
      <h4 style="font-size: 10px; font-weight: 700; color: var(--text-main); margin-bottom: 2px;">💡 High-Density Architectural Best Practices (30 - 50 Cameras):</h4>
      <ul style="list-style: none; display: flex; flex-direction: column; gap: 2px; font-size: 9.2px; color: var(--text-sub);">
        <li>• <strong>Camera Recommendation:</strong> UNV (Uniview) cameras are strongly recommended for factory-validated RTSP stream integrity; other brands (Hikvision, Dahua, Axis, ONVIF) are also 100% compatible.</li>
        <li>• <strong>Dual-Stream Ingest:</strong> Configure cameras to feed Sub-stream (640x360 @ 10-15 FPS) for AI face detection; grab primary 1080p frame only upon face match for audit logging (reduces decoding load by &gt;60%).</li>
        <li>• <strong>Multi-Worker Sharding:</strong> Dedicated Python processes pinned across CPU/GPU cores prevent single camera timeouts from affecting adjacent gate channels.</li>
        <li>• <strong>Recommended Platforms:</strong> Dell PowerEdge R650 / R750, HPE ProLiant DL380 Gen10/Gen11, or Supermicro GPU Server A+ series.</li>
      </ul>
    </div>
  </div>

  <!-- Official SaNDS Lab Footer -->
  <footer class="doc-footer">
    <div class="footer-top">
      <div class="footer-brand">
        <img src="{logo_src}" alt="SaNDS Lab" style="height: 30px; background: white; padding: 2px 8px; border-radius: 4px;">
        <div>
          <h4>SaNDS Lab Middle East W.L.L</h4>
          <p>Artificial Intelligence, Computer Vision &amp; Enterprise Automation Solutions</p>
        </div>
      </div>
      <div class="footer-badge">
        Document Release: October 2026 • Product Version 2.0
      </div>
    </div>
    <div class="footer-legal">
      <div class="footer-mandate">
        Powerd &amp; Enginered By <span>SaNDS Lab Middle East W.L.L</span> All right Reserved • <strong>Custom AI Engineered by SaNDS Lab</strong>
      </div>
      <div>
        Official Product Specifications &amp; Solution Features Guide
      </div>
    </div>
  </footer>

  <script>
    function toggleTheme() {{
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      const btn = document.getElementById('themeToggleBtn');
      if (btn) {{
        btn.innerHTML = next === 'dark' ? '<span>☀️</span> Light Preview' : '<span>🌙</span> Dark Preview';
      }}
    }}
  </script>
</body>
</html>
"""

# 1. Save HTML Document
html_path = r"e:\faceAttendance\product_features.html"
with open(html_path, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"Successfully generated HTML at: {html_path}")

# 2. Compile raw PDF via Microsoft Edge Headless
raw_pdf_path = r"e:\faceAttendance\raw_features.pdf"
pdf_path = r"e:\faceAttendance\CCTV_Face_Attendance_Product_Features.pdf"
edge_exe = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

if os.path.exists(edge_exe):
    print("Generating base PDF via Edge Headless...")
    cmd = [
        edge_exe,
        "--headless",
        "--disable-gpu",
        "--run-all-compositor-stages-before-draw",
        "--no-pdf-header-footer",
        f"--print-to-pdf={raw_pdf_path}",
        html_path
    ]
    subprocess.run(cmd, check=True)
    
    # 3. Post-Process PDF with PyMuPDF: Stamp Header (Logo + Custom AI text) & Footer (Page Number + Product Info) on EVERY Page
    print("Stamping Header & Footer on every page with PyMuPDF...")
    doc = fitz.open(raw_pdf_path)
    total_pages = len(doc)
    
    for page_num in range(total_pages):
        page = doc[page_num]
        rect = page.rect
        width = rect.width
        height = rect.height
        
        # --- HEADER (Top of Page) ---
        # 1. Insert SaNDS Lab Official Logo (Top-Left)
        logo_rect = fitz.Rect(40, 14, 150, 42)
        if os.path.exists(logo_path):
            page.insert_image(logo_rect, filename=logo_path, keep_proportion=True)
        
        # 2. Right-Aligned Header Text
        hdr_rect = fitz.Rect(width - 340, 14, width - 40, 44)
        page.insert_textbox(
            hdr_rect,
            "CCTV AI Multi-Gate Face Attendance & Security\nCustom AI Engineered by SaNDS Lab  |  Enterprise V2.0",
            fontname="helv",
            fontsize=8.0,
            color=(30/255, 58/255, 138/255),
            align=fitz.TEXT_ALIGN_RIGHT
        )
        
        # 3. Header Divider Line
        shape_hdr = page.new_shape()
        shape_hdr.draw_line(fitz.Point(40, 46), fitz.Point(width - 40, 46))
        shape_hdr.finish(color=(203/255, 213/255, 225/255), width=0.6)
        shape_hdr.commit()
        
        # --- FOOTER (Bottom of Page) ---
        # 4. Footer Divider Line
        shape_ftr = page.new_shape()
        shape_ftr.draw_line(fitz.Point(40, height - 34), fitz.Point(width - 40, height - 34))
        shape_ftr.finish(color=(203/255, 213/255, 225/255), width=0.6)
        shape_ftr.commit()
        
        # 5. Left-Aligned Footer Legal & Product Info
        ftr_left_rect = fitz.Rect(40, height - 32, width - 160, height - 8)
        page.insert_textbox(
            ftr_left_rect,
            "Powerd & Enginered By SaNDS Lab Middle East W.L.L All right Reserved\nCustom AI Engineered by SaNDS Lab  |  UNV Recommended & Multi-Brand Compatible",
            fontname="helv",
            fontsize=7.2,
            color=(15/255, 23/255, 42/255),
            align=fitz.TEXT_ALIGN_LEFT
        )
        
        # 6. Right-Aligned Footer Page Number & Version
        ftr_right_rect = fitz.Rect(width - 150, height - 32, width - 40, height - 8)
        page.insert_textbox(
            ftr_right_rect,
            f"Page {page_num + 1} of {total_pages}\nCCTVAttendance V2.0",
            fontname="helv",
            fontsize=7.5,
            color=(30/255, 58/255, 138/255),
            align=fitz.TEXT_ALIGN_RIGHT
        )

    doc.save(pdf_path)
    doc.close()
    
    # Clean up raw temp PDF
    if os.path.exists(raw_pdf_path):
        os.remove(raw_pdf_path)
        
    print(f"Successfully generated final stamped PDF: {pdf_path} (Total Pages: {total_pages})")

# 4. Copy both HTML and PDF to frontend/public for web serving
public_dir = r"e:\faceAttendance\frontend\public"
if os.path.exists(public_dir):
    shutil.copy2(html_path, os.path.join(public_dir, "product_features.html"))
    shutil.copy2(pdf_path, os.path.join(public_dir, "CCTV_Face_Attendance_Product_Features.pdf"))
    print(f"Copied files to {public_dir}")
