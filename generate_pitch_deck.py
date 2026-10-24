import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

def create_presentation():
    prs = Presentation()
    # Set 16:9 Widescreen dimensions
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # Color Palette Definitions
    BG_DARK = RGBColor(11, 15, 25)        # #0B0F19
    SURFACE_DARK = RGBColor(20, 27, 45)   # #141B2D
    SURFACE_CARD = RGBColor(26, 36, 60)   # #1A243C
    BORDER_COLOR = RGBColor(45, 60, 95)   # #2D3C5F
    
    TEXT_WHITE = RGBColor(248, 250, 252)  # #F8FAFC
    TEXT_MUTED = RGBColor(148, 163, 184)  # #94A3B8
    TEXT_SUB = RGBColor(203, 213, 225)    # #CBD5E1
    
    ACCENT_BLUE = RGBColor(37, 99, 235)   # #2563EB
    ACCENT_CYAN = RGBColor(56, 189, 248)  # #38BDF8
    ACCENT_PINK = RGBColor(236, 72, 153)  # #EC4899
    ACCENT_GREEN = RGBColor(16, 185, 129) # #10B981
    ACCENT_AMBER = RGBColor(245, 158, 11) # #F59E0B
    ACCENT_RED = RGBColor(239, 68, 68)    # #EF4444

    def add_background(slide):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
        bg.fill.solid()
        bg.fill.fore_color.rgb = BG_DARK
        bg.line.fill.background()
        return bg

    def add_header(slide, category, title, subtitle=None):
        header_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(11.733), Inches(1.3))
        tf = header_box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

        p0 = tf.paragraphs[0]
        p0.text = category.upper()
        p0.font.name = "Arial"
        p0.font.size = Pt(11)
        p0.font.bold = True
        p0.font.color.rgb = ACCENT_CYAN

        p1 = tf.add_paragraph()
        p1.text = title
        p1.font.name = "Arial"
        p1.font.size = Pt(24)
        p1.font.bold = True
        p1.font.color.rgb = TEXT_WHITE
        p1.space_before = Pt(4)

        if subtitle:
            p2 = tf.add_paragraph()
            p2.text = subtitle
            p2.font.name = "Calibri"
            p2.font.size = Pt(13)
            p2.font.color.rgb = TEXT_MUTED
            p2.space_before = Pt(4)

    def add_card(slide, left, top, width, height, title, body_bullets, accent_color=ACCENT_BLUE, icon_text=None):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        card.fill.solid()
        card.fill.fore_color.rgb = SURFACE_CARD
        card.line.color.rgb = BORDER_COLOR
        card.line.width = Pt(1.2)

        tb = slide.shapes.add_textbox(left + Inches(0.25), top + Inches(0.2), width - Inches(0.5), height - Inches(0.4))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

        p_title = tf.paragraphs[0]
        if icon_text:
            p_title.text = f"{icon_text}  {title}"
        else:
            p_title.text = title
        p_title.font.name = "Arial"
        p_title.font.size = Pt(15)
        p_title.font.bold = True
        p_title.font.color.rgb = accent_color

        for bullet in body_bullets:
            p_b = tf.add_paragraph()
            p_b.text = "• " + bullet
            p_b.font.name = "Calibri"
            p_b.font.size = Pt(12)
            p_b.font.color.rgb = TEXT_SUB
            p_b.space_before = Pt(6)

        return card

    # ==========================================
    # SLIDE 1: Title & Pitch Cover
    # ==========================================
    s1 = prs.slides.add_slide(blank_layout)
    add_background(s1)

    # Accent decorative top strip
    top_strip = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(0.12))
    top_strip.fill.solid()
    top_strip.fill.fore_color.rgb = ACCENT_PINK
    top_strip.line.fill.background()

    # Brand badge
    badge = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.9), Inches(1.2), Inches(3.8), Inches(0.45))
    badge.fill.solid()
    badge.fill.fore_color.rgb = SURFACE_CARD
    badge.line.color.rgb = ACCENT_CYAN
    badge_tf = badge.text_frame
    badge_tf.word_wrap = False
    badge_tf.margin_top = Inches(0.08)
    p_b = badge_tf.paragraphs[0]
    p_b.text = "NEXT-GENERATION BIOMETRICS & SECURITY"
    p_b.font.name = "Arial"
    p_b.font.size = Pt(10)
    p_b.font.bold = True
    p_b.font.color.rgb = ACCENT_CYAN
    p_b.alignment = PP_ALIGN.CENTER

    # Main Headline
    t_box = s1.shapes.add_textbox(Inches(0.9), Inches(1.9), Inches(11.5), Inches(3.2))
    tf1 = t_box.text_frame
    tf1.word_wrap = True

    p_h1 = tf1.paragraphs[0]
    p_h1.text = "CCTV AI Multi-Gate"
    p_h1.font.name = "Arial"
    p_h1.font.size = Pt(46)
    p_h1.font.bold = True
    p_h1.font.color.rgb = TEXT_WHITE

    p_h2 = tf1.add_paragraph()
    p_h2.text = "Face Attendance & Security System"
    p_h2.font.name = "Arial"
    p_h2.font.size = Pt(40)
    p_h2.font.bold = True
    p_h2.font.color.rgb = ACCENT_CYAN
    p_h2.space_before = Pt(6)

    p_sub = tf1.add_paragraph()
    p_sub.text = "Transform standard surveillance CCTV cameras into zero-touch, high-speed biometric entry/exit attendance with intruder blacklist alerts and 1-click payroll integration."
    p_sub.font.name = "Calibri"
    p_sub.font.size = Pt(17)
    p_sub.font.color.rgb = TEXT_MUTED
    p_sub.space_before = Pt(18)

    # 3 Stat Cards on Cover
    c1 = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.9), Inches(5.4), Inches(3.6), Inches(1.3))
    c1.fill.solid()
    c1.fill.fore_color.rgb = SURFACE_CARD
    c1.line.color.rgb = BORDER_COLOR
    tf_c1 = c1.text_frame
    tf_c1.word_wrap = True
    tf_c1.paragraphs[0].text = "0.5s Fast Detection"
    tf_c1.paragraphs[0].font.size = Pt(18)
    tf_c1.paragraphs[0].font.bold = True
    tf_c1.paragraphs[0].font.color.rgb = ACCENT_GREEN
    p_c1_sub = tf_c1.add_paragraph()
    p_c1_sub.text = "Frictionless walk-through recognition without stopping."
    p_c1_sub.font.size = Pt(11)
    p_c1_sub.font.color.rgb = TEXT_MUTED

    c2 = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(4.85), Inches(5.4), Inches(3.6), Inches(1.3))
    c2.fill.solid()
    c2.fill.fore_color.rgb = SURFACE_CARD
    c2.line.color.rgb = BORDER_COLOR
    tf_c2 = c2.text_frame
    tf_c2.word_wrap = True
    tf_c2.paragraphs[0].text = "100% On-Premise"
    tf_c2.paragraphs[0].font.size = Pt(18)
    tf_c2.paragraphs[0].font.bold = True
    tf_c2.paragraphs[0].font.color.rgb = ACCENT_CYAN
    p_c2_sub = tf_c2.add_paragraph()
    p_c2_sub.text = "Zero monthly cloud fees. Complete privacy."
    p_c2_sub.font.size = Pt(11)
    p_c2_sub.font.color.rgb = TEXT_MUTED

    c3 = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(8.8), Inches(5.4), Inches(3.6), Inches(1.3))
    c3.fill.solid()
    c3.fill.fore_color.rgb = SURFACE_CARD
    c3.line.color.rgb = BORDER_COLOR
    tf_c3 = c3.text_frame
    tf_c3.word_wrap = True
    tf_c3.paragraphs[0].text = "SaNDS Lab Middle East"
    tf_c3.paragraphs[0].font.size = Pt(18)
    tf_c3.paragraphs[0].font.bold = True
    tf_c3.paragraphs[0].font.color.rgb = ACCENT_PINK
    p_c3_sub = tf_c3.add_paragraph()
    p_c3_sub.text = "Engineered for Corporate Offices, Schools & Factories."
    p_c3_sub.font.size = Pt(11)
    p_c3_sub.font.color.rgb = TEXT_MUTED

    # ==========================================
    # SLIDE 2: The Problem with Legacy Systems
    # ==========================================
    s2 = prs.slides.add_slide(blank_layout)
    add_background(s2)
    add_header(s2, "Industry Challenges", "Why Traditional Attendance Systems Fail Businesses", "Fingerprint machines, RFID cards, and manual registers create daily bottlenecks and security blind spots.")

    add_card(s2, Inches(0.8), Inches(2.2), Inches(3.7), Inches(4.5), 
             "Long Queues & Delays", 
             [
                 "Workers line up at punch clocks every morning and evening.",
                 "Creates congestion at main entry doors and turnstiles.",
                 "Employees waste 5 to 15 minutes just waiting in line.",
                 "Causes frustration and lowered morning productivity."
             ], 
             ACCENT_RED, "⏳")

    add_card(s2, Inches(4.8), Inches(2.2), Inches(3.7), Inches(4.5), 
             "Lost Cards & Proxy Punching", 
             [
                 "Employees forget, lose, or damage RFID smart badges.",
                 "'Buddy Punching': Colleagues swipe cards for absent friends.",
                 "Costly badge re-issuance and manual HR admin overhead.",
                 "No photographic evidence of who actually entered the gate."
             ], 
             ACCENT_AMBER, "🪪")

    add_card(s2, Inches(8.8), Inches(2.2), Inches(3.7), Inches(4.5), 
             "Unhygienic & Cloud Risk", 
             [
                 "Physical contact sensors spread seasonal germs and bacteria.",
                 "Moist, dusty, or aged fingers frequently fail fingerprint scans.",
                 "Cloud-based attendance vendors charge expensive monthly subscriptions.",
                 "Biometric face data uploaded to public clouds risks data leaks."
             ], 
             ACCENT_PINK, "🦠")

    # ==========================================
    # SLIDE 3: The Breakthrough Solution
    # ==========================================
    s3 = prs.slides.add_slide(blank_layout)
    add_background(s3)
    add_header(s3, "The Innovation", "Frictionless Walk-Through Face Biometrics", "Employees and visitors walk naturally through the door — attendance is registered automatically in 0.5s.")

    # Big feature callout box
    feat_box = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(2.1), Inches(11.733), Inches(1.5))
    feat_box.fill.solid()
    feat_box.fill.fore_color.rgb = SURFACE_CARD
    feat_box.line.color.rgb = ACCENT_GREEN
    feat_box.line.width = Pt(1.5)
    f_tf = feat_box.text_frame
    f_tf.word_wrap = True
    p_ft = f_tf.paragraphs[0]
    p_ft.text = "✓ 100% Contactless Experience • Zero Touch • Zero Queuing"
    p_ft.font.name = "Arial"
    p_ft.font.size = Pt(18)
    p_ft.font.bold = True
    p_ft.font.color.rgb = ACCENT_GREEN
    p_ft_sub = f_tf.add_paragraph()
    p_ft_sub.text = "Workers never have to stop, pose, or touch any device. The security CCTV camera captures their face at walking speed, extracts the 128-D vector locally, and registers punch within 500 milliseconds."
    p_ft_sub.font.name = "Calibri"
    p_ft_sub.font.size = Pt(13)
    p_ft_sub.font.color.rgb = TEXT_WHITE
    p_ft_sub.space_before = Pt(6)

    add_card(s3, Inches(0.8), Inches(3.9), Inches(3.7), Inches(3.0),
             "High-Precision AI",
             [
                 "YuNet high-speed neural face detector.",
                 "SFace 128-dimensional deep feature matching.",
                 "99.4% recognition accuracy even with glasses or headwear."
             ],
             ACCENT_CYAN, "🧠")

    add_card(s3, Inches(4.8), Inches(3.9), Inches(3.7), Inches(3.0),
             "Anti-Spoof Protection",
             [
                 "Blocks photo & mobile phone screen attacks.",
                 "Texture and reflection liveness analysis.",
                 "Immediate security alert on spoof presentation."
             ],
             ACCENT_PINK, "🛡️")

    add_card(s3, Inches(8.8), Inches(3.9), Inches(3.7), Inches(3.0),
             "Live Visual Confirmation",
             [
                 "Real-time visual kiosk feedback.",
                 "Shows employee photo, name, and punch time.",
                 "Soft audio chime for positive verification."
             ],
             ACCENT_AMBER, "👁️")

    # ==========================================
    # SLIDE 4: Multi-Gate Architecture (IN / OUT)
    # ==========================================
    s4 = prs.slides.add_slide(blank_layout)
    add_background(s4)
    add_header(s4, "Gate Pairing Technology", "Intelligent Entry & Exit Multi-Camera Tracking", "Supports unlimited cameras paired as logical gates for automatic directional punch processing.")

    add_card(s4, Inches(0.8), Inches(2.2), Inches(3.7), Inches(4.5),
             "Entry Gate (IN Camera)",
             [
                 "Designated cameras ingest entry doors or gates.",
                 "First morning detection triggers In-Punch (Clock In).",
                 "Immediate calculation of on-time or late arrival.",
                 "Calculates late penalty minutes automatically against shift roster."
             ],
             ACCENT_GREEN, "🟢")

    add_card(s4, Inches(4.8), Inches(2.2), Inches(3.7), Inches(4.5),
             "Exit Gate (OUT Camera)",
             [
                 "Designated exit cameras capture departure.",
                 "Auto-computes Out-Punch and total active hours.",
                 "Differentiates between final clock-out and lunch outing breaks.",
                 "Eliminates manual sign-out books for office departures."
             ],
             ACCENT_AMBER, "🟡")

    add_card(s4, Inches(8.8), Inches(2.2), Inches(3.7), Inches(4.5),
             "Outing & Break Analytics",
             [
                 "Tracks intermediate IN / OUT transitions.",
                 "Records exact duration of official duty outings vs lunch breaks.",
                 "Full historical movement timeline per employee.",
                 "Detects abnormal lingering or unapproved departures."
             ],
             ACCENT_BLUE, "⏱️")

    # ==========================================
    # SLIDE 5: Automated Timesheets & Payroll
    # ==========================================
    s5 = prs.slides.add_slide(blank_layout)
    add_background(s5)
    add_header(s5, "HR Automation", "Daily Timesheets, Shifts & 1-Click Payroll Sync", "Eliminate end-of-month manual attendance recalculation nightmares for your HR department.")

    add_card(s5, Inches(0.8), Inches(2.2), Inches(3.7), Inches(4.5),
             "Automated Daily Roster",
             [
                 "Real-time attendance status: Present, Late, Absent, On Duty.",
                 "Assigned flexible or standard shift hours per department.",
                 "Automated grace period rules (e.g. 15 min grace window).",
                 "Overtime hours tracked with single-click supervisor approval."
             ],
             ACCENT_CYAN, "📋")

    add_card(s5, Inches(4.8), Inches(2.2), Inches(3.7), Inches(4.5),
             "Monthly Matrix & Reports",
             [
                 "Comprehensive 30-day employee attendance grid.",
                 "Color-coded matrix for instant executive review.",
                 "Filtered reports by Department, Shift, or Employee Type.",
                 "Export to standard Excel (.xlsx) and printable PDF with 1 click."
             ],
             ACCENT_GREEN, "📊")

    add_card(s5, Inches(8.8), Inches(2.2), Inches(3.7), Inches(4.5),
             "Direct HR System Sync",
             [
                 "Seamless REST API connectors for SAP, Oracle, Zoho, Odoo, or custom HRMS.",
                 "Bi-directional employee data synchronization.",
                 "Audit log tracking of all punches and HR sync history.",
                 "Zero manual data entry errors."
             ],
             ACCENT_PINK, "🔄")

    # ==========================================
    # SLIDE 6: Security & Blacklist Alerts
    # ==========================================
    s6 = prs.slides.add_slide(blank_layout)
    add_background(s6)
    add_header(s6, "Intelligent Security", "Real-Time Blacklist Intruder & Threat Alerts", "Turns security cameras into active gatekeepers that notify security guards before intruders step inside.")

    add_card(s6, Inches(0.8), Inches(2.2), Inches(3.7), Inches(4.5),
             "Blacklist Incident Breaches",
             [
                 "Enroll terminated staff, contractors, or suspicious individuals.",
                 "System scans all camera streams in real-time.",
                 "Instant red alert banner and audible siren when detected.",
                 "Displays exact gate location, direction, and threat level."
             ],
             ACCENT_RED, "🚨")

    add_card(s6, Inches(4.8), Inches(2.2), Inches(3.7), Inches(4.5),
             "Full Scene Photographic Audit",
             [
                 "Captures uncropped wide-angle CCTV camera scene.",
                 "Preserves forensic evidence of accompanying persons/vehicles.",
                 "Stored safely with tamper-proof timestamps and gate tags.",
                 "Searchable incident history for security inspections."
             ],
             ACCENT_AMBER, "📷")

    add_card(s6, Inches(8.8), Inches(2.2), Inches(3.7), Inches(4.5),
             "Zero False Alarms",
             [
                 "Configurable similarity threshold (default 99%).",
                 "15-second alarm cooldown to prevent alert flooding.",
                 "Security guards can inspect and dismiss or escalate incidents.",
                 "Complete regulatory and corporate audit compliance."
             ],
             ACCENT_BLUE, "🛡️")

    # ==========================================
    # SLIDE 7: Contactless Visitor Intelligence
    # ==========================================
    s7 = prs.slides.add_slide(blank_layout)
    add_background(s7)
    add_header(s7, "Visitor Management", "Automated Guest & Contractor Intelligence", "Replace outdated physical sign-in books with automated facial visitor detection and movement logging.")

    add_card(s7, Inches(0.8), Inches(2.2), Inches(3.7), Inches(4.5),
             "Auto Unknown Face Detection",
             [
                 "Detects unregistered faces walking through entrance.",
                 "Generates a unique Guest ID code automatically.",
                 "Captures facial portrait and AI embedding vector.",
                 "Zero manual paperwork or receptionist delay."
             ],
             ACCENT_PINK, "👥")

    add_card(s7, Inches(4.8), Inches(2.2), Inches(3.7), Inches(4.5),
             "Complete Visit Timeline",
             [
                 "Tracks arrival time, gates visited, and departure time.",
                 "Accompanying host / meeting person assignment.",
                 "Logs reason for visit and temporary badge assignment.",
                 "Complete digital audit trail for facility management."
             ],
             ACCENT_CYAN, "🕒")

    add_card(s7, Inches(8.8), Inches(2.2), Inches(3.7), Inches(4.5),
             "1-Click Staff Conversion",
             [
                 "Interview candidate or new contractor can be enrolled with 1 click.",
                 "Re-uses already captured face portrait without re-taking photos.",
                 "Instantly assigns shifts and attendance tracking.",
                 "Smooth onboarding workflow."
             ],
             ACCENT_GREEN, "⚡")

    # ==========================================
    # SLIDE 8: Camera Hardware & On-Premise Privacy
    # ==========================================
    s8 = prs.slides.add_slide(blank_layout)
    add_background(s8)
    add_header(s8, "Infrastructure & Deployment", "Works with Existing Cameras • 100% Offline Privacy", "No expensive proprietary hardware locks. Complete sovereignty over your biometric and video data.")

    add_card(s8, Inches(0.8), Inches(2.2), Inches(3.7), Inches(4.5),
             "Any CCTV Camera Brand",
             [
                 "UNV (Uniview) strongly recommended for lowest frame jitter.",
                 "100% compatible with Hikvision, Dahua, Axis, and Hanwha.",
                 "Connects over standard RTSP (Port 554) and ONVIF Profile S/G/T.",
                 "Supports standard IP cameras or USB webcams."
             ],
             ACCENT_CYAN, "📹")

    add_card(s8, Inches(4.8), Inches(2.2), Inches(3.7), Inches(4.5),
             "100% Local On-Premise AI",
             [
                 "Runs on your local computer or on-site server.",
                 "Does NOT require internet connection for attendance.",
                 "Biometric vectors and camera photos never leave your network.",
                 "Fully compliant with GDPR and National Personal Data Protection laws."
             ],
             ACCENT_GREEN, "🔒")

    add_card(s8, Inches(8.8), Inches(2.2), Inches(3.7), Inches(4.5),
             "Zero Recurring Cloud Fees",
             [
                 "No monthly per-user cloud subscription charges.",
                 "One-time setup with permanent system ownership.",
                 "Scalable from 10 to 5,000+ employees and 50+ camera gates.",
                 "Lowest total cost of ownership (TCO) in the industry."
             ],
             ACCENT_AMBER, "💰")

    # ==========================================
    # SLIDE 9: System Architecture & Technology
    # ==========================================
    s9 = prs.slides.add_slide(blank_layout)
    add_background(s9)
    add_header(s9, "Technical Specifications", "High-Performance Modular Architecture", "Built with proven, industrial-grade open standards for zero latency and continuous 24/7 reliability.")

    add_card(s9, Inches(0.8), Inches(2.2), Inches(3.7), Inches(4.5),
             "AI Camera Engine",
             [
                 "Python Multi-Threaded RTSP Stream Ingestion.",
                 "Dedicated capture loop + decoupled AI inference thread.",
                 "YuNet Zero-Lag Deep Face Detector (~20ms per frame).",
                 "SFace 128-Dimensional Cosine Vector Matching.",
                 "Anti-spoofing reflection & presentation attack filter."
             ],
             ACCENT_CYAN, "⚙️")

    add_card(s9, Inches(4.8), Inches(2.2), Inches(3.7), Inches(4.5),
             "Backend & Database",
             [
                 "PHP 8.x High-Speed RESTful API services.",
                 "MySQL 8.0 relational database with optimized indexes.",
                 "Tables for Users, Cameras, Pairs, Logs, Daily Summaries.",
                 "Automatic punch deduplication with 60-second cooldown.",
                 "Automated daily summary recalculation engine."
             ],
             ACCENT_BLUE, "🗄️")

    add_card(s9, Inches(8.8), Inches(2.2), Inches(3.7), Inches(4.5),
             "Modern Web Interface",
             [
                 "React + Vite Single-Page Application (SPA).",
                 "Real-time Live CCTV Monitor with sub-second MJPEG feed.",
                 "Interactive timesheets, shifts, blacklist, and reports.",
                 "Built-in biometric face cropper and webcam enrollment tool.",
                 "Responsive design for desktop, tablets, and kiosks."
             ],
             ACCENT_PINK, "💻")

    # ==========================================
    # SLIDE 10: Summary & Next Steps (CTA)
    # ==========================================
    s10 = prs.slides.add_slide(blank_layout)
    add_background(s10)

    # Decorative frame
    cta_card = s10.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.2), Inches(1.2), Inches(10.933), Inches(5.1))
    cta_card.fill.solid()
    cta_card.fill.fore_color.rgb = SURFACE_CARD
    cta_card.line.color.rgb = ACCENT_PINK
    cta_card.line.width = Pt(2.0)

    cta_tb = s10.shapes.add_textbox(Inches(1.8), Inches(1.6), Inches(9.733), Inches(4.3))
    tf10 = cta_tb.text_frame
    tf10.word_wrap = True

    p_c_tag = tf10.paragraphs[0]
    p_c_tag.text = "READY FOR DEPLOYMENT"
    p_c_tag.font.name = "Arial"
    p_c_tag.font.size = Pt(13)
    p_c_tag.font.bold = True
    p_c_tag.font.color.rgb = ACCENT_CYAN

    p_c_title = tf10.add_paragraph()
    p_c_title.text = "Transform Your Workplace Attendance & Security"
    p_c_title.font.name = "Arial"
    p_c_title.font.size = Pt(32)
    p_c_title.font.bold = True
    p_c_title.font.color.rgb = TEXT_WHITE
    p_c_title.space_before = Pt(6)

    p_c_desc = tf10.add_paragraph()
    p_c_desc.text = "Say goodbye to queues, lost punch cards, buddy punching, and cloud subscription fees. Deploy the SaNDS Lab CCTV AI Face Attendance system on your existing security cameras today."
    p_c_desc.font.name = "Calibri"
    p_c_desc.font.size = Pt(15)
    p_c_desc.font.color.rgb = TEXT_MUTED
    p_c_desc.space_before = Pt(10)

    # 4 Benefit Badges in Row
    p_b1 = tf10.add_paragraph()
    p_b1.text = "✓ Fast Deployment in Under 24 Hours       ✓ Works with Existing CCTV       ✓ 100% On-Premise Privacy"
    p_b1.font.name = "Arial"
    p_b1.font.size = Pt(13)
    p_b1.font.bold = True
    p_b1.font.color.rgb = ACCENT_GREEN
    p_b1.space_before = Pt(20)

    p_b2 = tf10.add_paragraph()
    p_b2.text = "✓ Automatic Multi-Gate IN / OUT            ✓ Instant Intruder Alerts          ✓ 1-Click Payroll Sync"
    p_b2.font.name = "Arial"
    p_b2.font.size = Pt(13)
    p_b2.font.bold = True
    p_b2.font.color.rgb = ACCENT_GREEN
    p_b2.space_before = Pt(6)

    p_contact = tf10.add_paragraph()
    p_contact.text = "Contact: SaNDS Lab Middle East W.L.L.  |  Website: www.sandslab.me  |  Live Demo Available"
    p_contact.font.name = "Arial"
    p_contact.font.size = Pt(14)
    p_contact.font.bold = True
    p_contact.font.color.rgb = ACCENT_PINK
    p_contact.space_before = Pt(24)

    # Save presentation
    output_filename = "SaNDS_Lab_Face_Attendance_Pitch_Deck.pptx"
    prs.save(output_filename)
    print(f"Successfully generated PowerPoint presentation: {output_filename}")

if __name__ == "__main__":
    create_presentation()
