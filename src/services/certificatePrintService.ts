import QRCode from 'qrcode';
import type { Donor } from '../types';
import { DONOR_BADGES_LIST } from '../data/seedData';

export const PRIMARY_DOMAIN = 'roktodanporibar.com';

export const generateDonorVerificationUrl = (donorId: string): string => {
  // If running in browser and on a valid host, use current origin; otherwise default to official domain
  const hasValidOrigin =
    typeof window !== 'undefined' &&
    window.location?.origin &&
    !window.location.origin.includes('file://');

  const baseUrl = hasValidOrigin
    ? window.location.origin + (window.location.pathname.endsWith('/') ? window.location.pathname : window.location.pathname + '/')
    : `https://${PRIMARY_DOMAIN}/`;

  return `${baseUrl}#/certificate?donorId=${encodeURIComponent(donorId)}`;
};

export const generateDonorQrDataUrl = async (donorId: string): Promise<string> => {
  const verifyUrl = generateDonorVerificationUrl(donorId);
  try {
    return await QRCode.toDataURL(verifyUrl, {
      width: 500,
      margin: 1,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Failed to generate QR code data URL:', err);
    return '';
  }
};

export interface CertificatePrintOptions {
  donor: Donor;
  orgName?: string;
  logoUrl?: string;
  signatoryName?: string;
  signatoryTitle?: string;
  qrDataUrl: string;
}

export const generateCertificateHtml = ({
  donor,
  orgName = 'রক্ত দান পরিবার কালামপুর',
  logoUrl = '',
  signatoryName = 'মোহাম্মদ ইউসুফ',
  signatoryTitle = 'সভাপতি ও প্রতিষ্ঠাতা',
  qrDataUrl,
}: CertificatePrintOptions): string => {
  const sortedBadges = [...DONOR_BADGES_LIST].sort((a, b) => b.minDonations - a.minDonations);
  const currentBadge = sortedBadges.find((b) => donor.totalDonations >= b.minDonations);
  const certNumber = `RDPK-CERT-${donor.donorId}-${donor.totalDonations > 0 ? donor.totalDonations : '1'}`;
  const issueDate = new Date().toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' });

  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <title>${donor.fullName} - রক্তদান স্বীকৃতি সনদপত্র | ${orgName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700;800&family=Outfit:wght@400;600;700;800;900&display=swap');

    @page {
      size: A4 landscape;
      margin: 0;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }

    html, body {
      width: 297mm;
      height: 210mm;
      max-height: 210mm;
      margin: 0;
      padding: 0;
      background: #ffffff;
      font-family: 'Hind Siliguri', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    /* Screen view wrapper */
    @media screen {
      html, body {
        width: 100%;
        height: auto;
        min-height: 100vh;
        background: #090d16;
        padding: 30px 15px;
        overflow-y: auto;
      }
    }

    /* Full-Page Majestic A4 Landscape Certificate Container */
    .certificate-container {
      width: 289mm;
      height: 202mm;
      max-width: 289mm;
      max-height: 202mm;
      background: radial-gradient(circle at 50% 50%, #ffffff 0%, #fffefc 55%, #fff8ee 100%);
      margin: auto;
      border: 8px solid #b45309;
      outline: 3px solid #f59e0b;
      outline-offset: -11px;
      border-radius: 6px;
      padding: 6mm 10mm 11mm 10mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
      box-shadow: 0 20px 45px rgba(0,0,0,0.2);
      page-break-inside: avoid;
      break-inside: avoid;
    }

    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
      }
      .certificate-container {
        box-shadow: none !important;
        margin: 4mm auto !important;
      }
    }

    /* Ornate Gold Inner Borders */
    .inner-border {
      position: absolute;
      top: 4mm;
      left: 4mm;
      right: 4mm;
      bottom: 4mm;
      border: 1.5px solid #d97706;
      pointer-events: none;
      border-radius: 4px;
    }

    .inner-border-dashed {
      position: absolute;
      top: 5mm;
      left: 5mm;
      right: 5mm;
      bottom: 5mm;
      border: 1px dashed #fcd34d;
      pointer-events: none;
      border-radius: 3px;
    }

    /* Corner Ornate Accents */
    .corner {
      position: absolute;
      width: 26px;
      height: 26px;
      border-color: #b45309;
      border-style: solid;
      pointer-events: none;
      z-index: 2;
    }
    .c-tl { top: 5.5mm; left: 5.5mm; border-width: 4.5px 0 0 4.5px; }
    .c-tr { top: 5.5mm; right: 5.5mm; border-width: 4.5px 4.5px 0 0; }
    .c-bl { bottom: 5.5mm; left: 5.5mm; border-width: 0 0 4.5px 4.5px; }
    .c-br { bottom: 5.5mm; right: 5.5mm; border-width: 0 4.5px 4.5px 0; }

    /* Corner Gold Stars */
    .corner-rosette {
      position: absolute;
      font-size: 15px;
      color: #d97706;
      line-height: 1;
      pointer-events: none;
      z-index: 3;
    }
    .r-tl { top: 6.2mm; left: 6.2mm; }
    .r-tr { top: 6.2mm; right: 6.2mm; }
    .r-bl { bottom: 6.2mm; left: 6.2mm; }
    .r-br { bottom: 6.2mm; right: 6.2mm; }

    /* Watermark Background */
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 440px;
      height: 440px;
      opacity: 0.04;
      pointer-events: none;
      z-index: 0;
      object-fit: contain;
    }

    .content-layer {
      position: relative;
      z-index: 1;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    /* ======================================================== */
    /* 1. HEADER SECTION (Bigger, Bolder & Grand)               */
    /* ======================================================== */
    .header {
      text-align: center;
      border-bottom: 2px solid #fde68a;
      padding-bottom: 5px;
      position: relative;
    }
    .brand-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 15px;
    }
    .brand-logo {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      object-fit: cover;
      border: 2.5px solid #d97706;
      box-shadow: 0 4px 10px rgba(217, 119, 6, 0.35);
    }
    .brand-titles {
      text-align: left;
    }
    .org-name {
      font-size: 28px;
      font-weight: 800;
      color: #991b1b;
      line-height: 1.1;
      letter-spacing: -0.3px;
    }
    .org-slogan {
      font-size: 13px;
      color: #92400e;
      font-weight: 700;
      letter-spacing: 0.4px;
      text-transform: uppercase;
      margin-top: 1px;
    }
    .badge-ribbon-wrap {
      margin-top: 4px;
    }
    .badge-ribbon {
      display: inline-block;
      background: linear-gradient(135deg, #b45309, #d97706, #f59e0b, #d97706, #b45309);
      color: #ffffff;
      padding: 4px 30px;
      border-radius: 30px;
      font-size: 15.5px;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      box-shadow: 0 4px 10px rgba(180, 83, 9, 0.4);
      border: 1.5px solid #fef3c7;
    }

    /* ======================================================== */
    /* 2. BODY SECTION (Larger Honoree Typography & Text)       */
    /* ======================================================== */
    .body-section {
      text-align: center;
      padding: 2px 4px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 6px;
    }
    .intro-text {
      font-size: 15.5px;
      color: #334155;
      font-weight: 600;
      font-style: italic;
      letter-spacing: 0.2px;
    }
    .donor-name-wrap {
      display: inline-block;
      margin: 1px auto 3px auto;
      border-bottom: 3.5px double #dc2626;
      padding: 0 40px 4px 40px;
      background: linear-gradient(to right, transparent, #fff1f2 20%, #fff1f2 80%, transparent);
    }
    .donor-name {
      font-size: 38px;
      font-weight: 900;
      color: #991b1b;
      letter-spacing: -0.3px;
      line-height: 1.22;
    }

    /* Credentials Pill Row */
    .tags-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin: 3px 0 5px 0;
    }
    .tag {
      font-size: 14px;
      font-weight: 800;
      padding: 4px 16px;
      border-radius: 20px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .tag-blood {
      background: #fee2e2;
      color: #991b1b;
      border: 1.5px solid #fca5a5;
    }
    .tag-id {
      background: #f1f5f9;
      color: #0f172a;
      border: 1.5px solid #cbd5e1;
      font-family: 'Outfit', monospace;
    }
    .tag-loc {
      background: #fef3c7;
      color: #92400e;
      border: 1.5px solid #fde68a;
    }
    .tag-verified {
      background: #ecfdf5;
      color: #065f46;
      border: 1.5px solid #6ee7b7;
    }

    /* Commendation Statement (Increased Line-Height & Readability) */
    .commendation {
      font-size: 16px;
      color: #0f172a;
      line-height: 1.85;
      max-width: 255mm;
      margin: 3px auto;
      font-weight: 500;
      letter-spacing: 0.15px;
    }
    .commendation strong {
      color: #991b1b;
      font-weight: 900;
    }

    /* Milestone Achievement Banner */
    .badge-showcase {
      margin-top: 2px;
    }
    .badge-pill {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fed7aa 100%);
      border: 2px solid #f59e0b;
      padding: 4px 22px;
      border-radius: 18px;
      box-shadow: 0 3px 8px rgba(245, 158, 11, 0.25);
    }
    .badge-icon-box {
      width: 26px;
      height: 26px;
      background: #d97706;
      color: #ffffff;
      border-radius: 7px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
    }
    .badge-pill-text {
      font-size: 14.5px;
      font-weight: 800;
      color: #78350f;
    }

    /* ======================================================== */
    /* 3. FOOTER SECTION (Elevated safely above bottom frame)   */
    /* ======================================================== */
    .footer {
      border-top: 2px solid #fde68a;
      padding-top: 6px;
      padding-bottom: 3px;
      margin-bottom: 2px;
      display: grid;
      grid-template-columns: 1.35fr 0.75fr 1fr;
      align-items: flex-end;
      text-align: center;
    }

    /* Left: High-Contrast QR Code Box */
    .qr-col {
      text-align: left;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .qr-img {
      width: 64px;
      height: 64px;
      border: 2px solid #94a3b8;
      border-radius: 8px;
      background: #ffffff;
      padding: 2px;
      image-rendering: crisp-edges;
      box-shadow: 0 2px 6px rgba(0,0,0,0.08);
    }
    .qr-meta {
      font-size: 11.5px;
      color: #334155;
      line-height: 1.35;
      font-weight: 600;
    }
    .qr-meta strong {
      color: #0f172a;
      font-family: 'Outfit', monospace;
      font-size: 12.5px;
      letter-spacing: 0.3px;
      font-weight: 800;
    }
    .qr-domain {
      font-size: 11px;
      color: #0284c7;
      font-family: 'Outfit', monospace;
      font-weight: 700;
      display: block;
      margin-top: 1px;
    }
    .qr-scan-label {
      font-size: 10.5px;
      color: #047857;
      font-weight: 800;
      display: block;
      margin-top: 1.5px;
      letter-spacing: 0.2px;
    }

    /* Center: Golden Seal */
    .seal-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .seal-badge {
      width: 62px;
      height: 62px;
      border-radius: 50%;
      background: radial-gradient(circle at 35% 35%, #fde68a, #f59e0b 45%, #b45309 85%, #78350f 100%);
      border: 2.5px dashed #ffffff;
      outline: 2px solid #d97706;
      outline-offset: 1px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      box-shadow: 0 5px 15px rgba(180, 83, 9, 0.4);
      transform: rotate(-3deg);
    }
    .seal-icon {
      font-size: 16px;
      line-height: 1;
      text-shadow: 0 1px 2px rgba(0,0,0,0.4);
    }
    .seal-text {
      font-size: 8.5px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: -0.2px;
      line-height: 1.15;
      margin-top: 1.5px;
      text-shadow: 0 1px 2px rgba(0,0,0,0.4);
      text-align: center;
    }

    /* Right: Authority Signature */
    .sig-col {
      text-align: right;
    }
    .sig-line {
      display: inline-block;
      border-bottom: 2.5px solid #0f172a;
      padding: 0 22px 2px 22px;
      font-size: 17px;
      font-weight: 900;
      font-style: italic;
      color: #0f172a;
    }
    .sig-title {
      font-size: 12.5px;
      font-weight: 800;
      color: #1e293b;
      margin-top: 2px;
    }
    .sig-org {
      font-size: 10.5px;
      color: #64748b;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <div class="certificate-container">
    <div class="inner-border"></div>
    <div class="inner-border-dashed"></div>
    <div class="corner c-tl"></div>
    <div class="corner c-tr"></div>
    <div class="corner c-bl"></div>
    <div class="corner c-br"></div>
    <div class="corner-rosette r-tl">✦</div>
    <div class="corner-rosette r-tr">✦</div>
    <div class="corner-rosette r-bl">✦</div>
    <div class="corner-rosette r-br">✦</div>

    ${logoUrl ? `<img src="${logoUrl}" class="watermark" alt="" />` : ''}

    <div class="content-layer">
      <!-- 1. Header -->
      <div class="header">
        <div class="brand-row">
          ${logoUrl ? `<img src="${logoUrl}" class="brand-logo" alt="Logo" />` : ''}
          <div class="brand-titles">
            <div class="org-name">${orgName}</div>
            <div class="org-slogan">স্বেচ্ছাসেবী রক্তদান ও মানবিক কল্যাণ নেটওয়ার্ক • কালামপুর, ধামরাই, সাভার, মানিকগঞ্জ</div>
          </div>
        </div>
        <div class="badge-ribbon-wrap">
          <span class="badge-ribbon">★ আজীবন মানবতার সম্মাননা ও স্বীকৃতি সনদপত্র ★</span>
        </div>
      </div>

      <!-- 2. Main Body (Grand, Large & Bold) -->
      <div class="body-section">
        <p class="intro-text">অত্যন্ত গৌরব ও গভীর কৃতজ্ঞতার সহিত এই সম্মাননা প্রশংসাপত্র প্রদান করা হচ্ছে —</p>
        
        <div class="donor-name-wrap">
          <h1 class="donor-name">${donor.fullName}</h1>
        </div>

        <div class="tags-row">
          <span class="tag tag-blood">🩸 রক্তের গ্রুপ: ${donor.bloodGroup}</span>
          <span class="tag tag-id">আইডি: ${donor.donorId}</span>
          ${donor.upazila ? `<span class="tag tag-loc">📍 ${donor.upazila}, ${donor.district}</span>` : ''}
          <span class="tag tag-verified">🛡️ ভেরিফায়েড রক্তদাতা</span>
        </div>

        <p class="commendation">
          জরুরি মুহূর্তে মুমূর্ষু রোগীর জীবন রক্ষার্থে নিঃস্বার্থভাবে <strong>${donor.totalDonations} বার রক্তদান</strong> করে মানবতার এক উজ্জ্বল ও অনুপ্রেরণাদায়ী দৃষ্টান্ত স্থাপন করেছেন।
          সমাজ, দেশ ও মানবজাতির কল্যাণে আপনার এই মহান আত্মত্যাগের স্বীকৃতিস্বরূপ ‘<strong>${orgName}</strong>’-এর পক্ষ থেকে
          আপনাকে জানাই আন্তরিক মোবারকবাদ, অসীম শ্রদ্ধা ও রক্তিম শুভেচ্ছা।
        </p>

        ${
          currentBadge
            ? `
        <div class="badge-showcase">
          <div class="badge-pill">
            <div class="badge-icon-box">🏆</div>
            <span class="badge-pill-text">অর্জিত গৌরবময় পদক: ${currentBadge.titleBn} (${donor.totalDonations} বার সফল রক্তদান সম্পন্ন)</span>
          </div>
        </div>`
            : `
        <div class="badge-showcase">
          <div class="badge-pill">
            <div class="badge-icon-box">🌟</div>
            <span class="badge-pill-text">রক্তদাতা সদস্য • মানবতার সেবায় নিবেদিতপ্রাণ</span>
          </div>
        </div>`
        }
      </div>

      <!-- 3. Footer / Signatures / Live QR with roktodanporibar.com -->
      <div class="footer">
        <div class="qr-col">
          ${qrDataUrl ? `<img src="${qrDataUrl}" class="qr-img" alt="Verification QR" />` : ''}
          <div class="qr-meta">
            <div>সনদপত্র নং: <strong>${certNumber}</strong></div>
            <div>ইস্যুর তারিখ: ${issueDate}</div>
            <span class="qr-domain">🌐 roktodanporibar.com</span>
            <span class="qr-scan-label">✓ কিউআর স্ক্যান করে অনলাইন যাচাই করুন</span>
          </div>
        </div>

        <div class="seal-col">
          <div class="seal-badge">
            <span class="seal-icon">🛡️</span>
            <span class="seal-text">ভেরিফাইড সিল<br/>কালামপুর ঢাকা</span>
          </div>
        </div>

        <div class="sig-col">
          <div class="sig-line">${signatoryName}</div>
          <div class="sig-title">${signatoryTitle}</div>
          <div class="sig-org">${orgName}</div>
        </div>
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      if (window.opener || window.location.search.includes('print=true')) {
        setTimeout(function() {
          window.print();
        }, 400);
      }
    };
  </script>
</body>
</html>`;
};

export const printCertificateInStandaloneWindow = async (options: {
  donor: Donor;
  orgName?: string;
  logoUrl?: string;
  signatoryName?: string;
  signatoryTitle?: string;
}) => {
  const qrDataUrl = await generateDonorQrDataUrl(options.donor.donorId);
  const html = generateCertificateHtml({
    ...options,
    qrDataUrl,
  });

  const printWindow = window.open(
    '',
    '_blank',
    'width=1150,height=850,menubar=no,toolbar=no,location=no,status=no'
  );
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  } else {
    // Fallback via invisible iframe if popups blocked
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 2000);
      }, 500);
    }
  }
};
