import { useContext, useEffect, useState } from "react";
import API_BASE from "../apiConfig";
import { AuthContext } from "../context/AuthContext.js";
import "./courses.css";

/* ══════════════════════════════════════════════════════════════════
   DEVICE DETECTION UTILITY
   ══════════════════════════════════════════════════════════════════ */
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/* ══════════════════════════════════════════════════════════════════
   LOCAL STORAGE — Enrollment Persistence
   ══════════════════════════════════════════════════════════════════ */
const STORAGE_KEY = "sbk_enrolled_courses";

function getEnrolled() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}

function saveEnrollment(courseId, data) {
  const list = getEnrolled();
  if (!list.find(e => e.courseId === courseId)) {
    list.push({ courseId, ...data, enrolledAt: new Date().toISOString() });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }
}



/* ══════════════════════════════════════════════════════════════════
   BANK DATA for Net Banking
   ══════════════════════════════════════════════════════════════════ */
const BANKS = [
  { id: "sbi", name: "State Bank of India", short: "SBI", color: "#1a3c8f", bg: "#1a3c8f18", icon: "bi-bank2" },
  { id: "hdfc", name: "HDFC Bank", short: "HDFC", color: "#004C8F", bg: "#004C8F18", icon: "bi-building" },
  { id: "icici", name: "ICICI Bank", short: "ICICI", color: "#B02A37", bg: "#B02A3718", icon: "bi-bank" },
  { id: "axis", name: "Axis Bank", short: "Axis", color: "#97144D", bg: "#97144D18", icon: "bi-credit-card" },
  { id: "pnb", name: "Punjab National", short: "PNB", color: "#d97706", bg: "#d9770618", icon: "bi-wallet2" },
  { id: "kotak", name: "Kotak Mahindra", short: "Kotak", color: "#e63946", bg: "#e6394618", icon: "bi-briefcase" },
  { id: "bob", name: "Bank of Baroda", short: "BOB", color: "#f59e0b", bg: "#f59e0b18", icon: "bi-cash-coin" },
  { id: "yes", name: "Yes Bank", short: "Yes", color: "#2563eb", bg: "#2563eb18", icon: "bi-star" },
];

/* ══════════════════════════════════════════════════════════════════
   QR CODE VISUAL (Decorative SVG — simulated)
   ══════════════════════════════════════════════════════════════════ */
function QRVisual({ size = 160, accent = "#4ade80" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">
      {/* Background */}
      <rect width="160" height="160" rx="12" fill="#fff" />
      {/* Top-left finder */}
      <rect x="10" y="10" width="46" height="46" rx="4" fill="#111" />
      <rect x="17" y="17" width="32" height="32" rx="3" fill="#fff" />
      <rect x="24" y="24" width="18" height="18" rx="2" fill="#111" />
      {/* Top-right finder */}
      <rect x="104" y="10" width="46" height="46" rx="4" fill="#111" />
      <rect x="111" y="17" width="32" height="32" rx="3" fill="#fff" />
      <rect x="118" y="24" width="18" height="18" rx="2" fill="#111" />
      {/* Bottom-left finder */}
      <rect x="10" y="104" width="46" height="46" rx="4" fill="#111" />
      <rect x="17" y="111" width="32" height="32" rx="3" fill="#fff" />
      <rect x="24" y="118" width="18" height="18" rx="2" fill="#111" />
      {/* Center accent logo box */}
      <rect x="64" y="64" width="32" height="32" rx="6" fill={accent} />
      <text x="80" y="85" textAnchor="middle" fill="#fff" fontSize="16" fontWeight="bold">₹</text>
      {/* Data modules — decorative */}
      {[
        [64, 10], [70, 10], [76, 10], [82, 16], [88, 10], [64, 22], [76, 22], [88, 22],
        [64, 28], [70, 28], [82, 22], [88, 28], [64, 34], [76, 34], [82, 28],
        [10, 64], [10, 70], [10, 76], [16, 82], [22, 64], [22, 76], [28, 64], [28, 70],
        [16, 64], [22, 88], [28, 82], [10, 88], [16, 88], [28, 88],
        [104, 64], [110, 70], [116, 64], [122, 64], [128, 70], [110, 76], [122, 82],
        [104, 82], [116, 76], [128, 76], [104, 88], [110, 88], [122, 88], [128, 88],
        [64, 104], [76, 104], [88, 104], [64, 110], [70, 110], [82, 116], [88, 116],
        [64, 116], [76, 122], [88, 122], [70, 128], [82, 128], [64, 128], [76, 128],
        [104, 104], [116, 110], [128, 104], [110, 116], [128, 116],
        [104, 122], [122, 122], [128, 128], [104, 128], [116, 128],
      ].map(([x, y], i) => (
        <rect key={i} x={x} y={y} width="6" height="6" fill="#111" rx="1" />
      ))}
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════════
   UPI TIMER HOOK
   ══════════════════════════════════════════════════════════════════ */
function useTimer(initial = 300) {
  const [seconds, setSeconds] = useState(initial);
  useEffect(() => {
    if (seconds <= 0) return;
    const t = setInterval(() => setSeconds(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [seconds]);
  const reset = () => setSeconds(initial);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return { seconds, display: `${mm}:${ss}`, reset, expired: seconds <= 0 };
}

async function apiCreateOrder(student, course, method) {
  const res = await fetch(`${API_BASE}/courses/create-order/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: student.name, email: student.email, phone: student.phone,
      course_id: course.id, course_name: course.title,
      amount: course.price, method,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Server error creating order.");
  return data;
}

async function apiVerifyPayment(enrollmentId, txnId, method) {
  const res = await fetch(`${API_BASE}/courses/verify-payment/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enrollment_id: enrollmentId, transaction_id: txnId, method }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Payment verification failed.");
  return data;
}

async function apiTrackVideoCompletion(courseId, videoId) {
  const token = localStorage.getItem("accessToken");
  const res = await fetch(`${API_BASE}/courses/track-video/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ course_id: courseId, video_id: videoId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to track completion.");
  return data;
}

async function apiGenerateCertificate(courseId) {
  const token = localStorage.getItem("accessToken");
  const res = await fetch(`${API_BASE}/certificates/generate/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ course_id: courseId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to generate certificate.");
  return data;
}

/* ══════════════════════════════════════════════════════════════════
   PAYMENT MODAL
   Steps: info → method → gpay | phonepe | netbank-select | netbank-auth
          → processing → success | error
   ══════════════════════════════════════════════════════════════════ */
function PaymentModal({ course, onClose, onEnrolled }) {
  const { user } = useContext(AuthContext);
  const isMobile = isMobileDevice();
  const [step, setStep] = useState("info");
  const [student, setStudent] = useState({
    name: user?.username || "",
    email: user?.email || "",
    phone: ""
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [orderData, setOrderData] = useState(null);
  const [selectedBank, setSelectedBank] = useState(null);
  const [bankSearch, setBankSearch] = useState("");
  const [bankUser, setBankUser] = useState("");
  const [bankPass, setBankPass] = useState("");
  const [otp, setOtp] = useState("");
  const [otpStage, setOtpStage] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const timer = useTimer(300);

  const validateInfo = () => {
    const e = {};
    if (!student.name.trim()) e.name = "Name is required";
    if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/.test(student.email)) e.email = "Valid email required";
    if (!/^\d{10}$/.test(student.phone)) e.phone = "Enter a 10-digit number";
    return e;
  };

  const handleNextStep = () => {
    const e = validateInfo();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setStep("method");
  };

  /* ── Create Order then go to payment screen ── */
  const startPayment = async (method) => {
    setStep("processing");
    setApiError("");
    try {
      const od = await apiCreateOrder(student, course, method);
      setOrderData(od);
      // Show correct payment UI
      if (method === "gpay") setStep("gpay");
      else if (method === "phonepe") setStep("phonepe");
      else if (method === "paytm") setStep("paytm");
      else if (method === "netbanking") setStep("netbank-select");
    } catch (err) {
      setApiError(err.message);
      setStep("error");
    }
  };

  /* ── Finalize payment (called when user confirms) ── */
  const finalizePayment = async (method) => {
    setStep("processing");
    try {
      const txnId = `${method.toUpperCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const vData = await apiVerifyPayment(orderData.enrollment_id, txnId, method);
      setSuccessData(vData);
      // Persist enrollment
      saveEnrollment(course.id, {
        enrollmentId: vData.enrollment_id,
        paymentId: vData.payment_id,
        courseName: vData.course,
        amount: vData.amount,
      });
      setStep("success");
    } catch (err) {
      setApiError(err.message);
      setStep("error");
    }
  };

  const handleBankAuth = () => {
    if (!otpStage) {
      if (!bankUser.trim()) return;
      setOtpStage(true);
    } else {
      if (otp.length < 4) return;
      finalizePayment("netbanking");
    }
  };

  const filteredBanks = BANKS.filter(b =>
    b.name.toLowerCase().includes(bankSearch.toLowerCase()) ||
    b.short.toLowerCase().includes(bankSearch.toLowerCase())
  );

  return (
    <div className="pay-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pay-modal">
        <button className="pay-close" onClick={onClose}><i className="bi bi-x-lg" /></button>

        {/* ── STEP 1: Student Info ── */}
        {step === "info" && (
          <>
            <div className="pay-header">
              <div className="pay-icon" style={{ borderColor: course.accent, background: `${course.accent}15` }}>
                <i className={course.icon} style={{ color: course.accent }} />
              </div>
              <h2 className="pay-title">Enroll Now</h2>
              <p className="pay-course-name">{course.title}</p>
            </div>
            <div className="pay-summary">
              <div className="pay-row"><span>Original Price</span><span className="line-through">₹{course.originalPrice?.toLocaleString()}</span></div>
              <div className="pay-row"><span>Discount</span><span className="discount-green">– ₹{(course.originalPrice - course.price).toLocaleString()}</span></div>
              <div className="pay-divider" />
              <div className="pay-row total-row">
                <span>Amount to Pay</span>
                <span style={{ color: course.accent, fontSize: "1.4rem" }}>₹{course.price?.toLocaleString()}</span>
              </div>
            </div>
            <div className="pay-form">
              {[
                { key: "name", label: "Full Name", type: "text", ph: "Sunil Kumar", icon: "bi-person" },
                { key: "email", label: "Email Address", type: "email", ph: "you@example.com", icon: "bi-envelope" },
                { key: "phone", label: "Phone Number", type: "tel", ph: "9876543210", icon: "bi-phone" },
              ].map(({ key, label, type, ph, icon }) => (
                <div key={key} className="pay-field">
                  <label>{label}</label>
                  <div className="pay-input-wrap">
                    <i className={`bi ${icon} pay-input-icon`} />
                    <input type={type} placeholder={ph} value={student[key]}
                      onChange={e => { setStudent({ ...student, [key]: e.target.value }); setErrors({ ...errors, [key]: "" }); }}
                      className={errors[key] ? "has-error" : ""} />
                  </div>
                  {errors[key] && <span className="pay-error">{errors[key]}</span>}
                </div>
              ))}
            </div>
            <button className="pay-next-btn" style={{ background: `linear-gradient(130deg, ${course.accent}, #6366f1)` }} onClick={handleNextStep}>
              Continue to Payment &nbsp;<i className="bi bi-arrow-right" />
            </button>
          </>
        )}

        {/* ── STEP 2: Payment Method Selection ── */}
        {step === "method" && (
          <>
            <div className="pay-header">
              <h2 className="pay-title">Select Payment</h2>
              <p className="pay-course-name">
                <i className="bi bi-lock-fill" style={{ fontSize: "0.7rem", marginRight: 5 }} />
                ₹{course.price?.toLocaleString()} · {course.title}
              </p>
              {isMobile && <p style={{ fontSize: '0.85rem', color: '#4ade80', marginTop: '8px' }}><i className="bi bi-phone-fill" /> Mobile payment options available</p>}
            </div>
            <div className="method-grid">
              {/* Google Pay */}
              <button className="method-card gpay-card" onClick={() => startPayment("gpay")}>
                <div className="method-icon-wrap" style={{ background: "rgba(66,133,244,0.12)" }}>
                  <span className="gpay-logo-text">G Pay</span>
                </div>
                <div className="method-info">
                  <strong>Google Pay</strong>
                  <span>Pay using your Google Pay UPI</span>
                </div>
                <div className="method-chips">
                  <span style={{ color: "#4285F4" }}>Fast</span>
                  <span style={{ color: "#34A853" }}>Secure</span>
                </div>
                {isMobile && <span style={{ fontSize: '0.75rem', background: '#34A853', color: '#fff', padding: '2px 8px', borderRadius: '4px', marginTop: '8px', display: 'inline-block' }}>Recommended for Mobile</span>}
                <i className="bi bi-chevron-right method-arrow" />
              </button>

              {/* PhonePe */}
              <button className="method-card phonepe-card" onClick={() => startPayment("phonepe")}>
                <div className="method-icon-wrap" style={{ background: "rgba(103,57,183,0.12)" }}>
                  <i className="bi bi-phone-fill" style={{ color: "#6739B7", fontSize: "1.5rem" }} />
                </div>
                <div className="method-info">
                  <strong>PhonePe</strong>
                  <span>UPI · Wallet · Bank Transfer</span>
                </div>
                <div className="method-chips">
                  <span style={{ color: "#6739B7" }}>Instant</span>
                </div>
                {isMobile && <span style={{ fontSize: '0.75rem', background: '#6739B7', color: '#fff', padding: '2px 8px', borderRadius: '4px', marginTop: '8px', display: 'inline-block' }}>Best for Mobile</span>}
                <i className="bi bi-chevron-right method-arrow" />
              </button>

              {/* Paytm */}
              <button className="method-card paytm-card" onClick={() => startPayment("paytm")}>
                <div className="method-icon-wrap" style={{ background: "rgba(0,186,242,0.12)" }}>
                  <i className="bi bi-wallet2" style={{ color: "#00BAF2", fontSize: "1.5rem" }} />
                </div>
                <div className="method-info">
                  <strong>Paytm</strong>
                  <span>Fastest UPI Payments</span>
                </div>
                <div className="method-chips">
                  <span style={{ color: "#00BAF2" }}>0% Fee</span>
                </div>
                <i className="bi bi-chevron-right method-arrow" />
              </button>

              {/* Net Banking — Hidden on Mobile */}
              {!isMobile && (
                <button className="method-card netbank-card" onClick={() => startPayment("netbanking")}>
                  <div className="method-icon-wrap" style={{ background: "rgba(16,185,129,0.12)" }}>
                    <i className="bi bi-bank2" style={{ color: "#10b981", fontSize: "1.5rem" }} />
                  </div>
                  <div className="method-info">
                    <strong>Net Banking</strong>
                    <span>All major Indian banks supported</span>
                  </div>
                  <div className="method-chips">
                    <span style={{ color: "#10b981" }}>100+ Banks</span>
                  </div>
                  <i className="bi bi-chevron-right method-arrow" />
                </button>
              )}
            </div>

            {isMobile && (
              <div style={{ background: 'rgba(103,57,183,0.1)', border: '1px solid rgba(103,57,183,0.3)', padding: '12px', borderRadius: '8px', marginTop: '12px', textAlign: 'center', color: 'rgba(200,215,240,0.8)', fontSize: '0.85rem' }}>
                <i className="bi bi-info-circle" /> For desktop net banking, please use a computer or contact support.
              </div>
            )}

            <div className="payment-brand" style={{ marginTop: 20 }}>
              <i className="bi bi-shield-lock-fill" />
              <span>256-bit SSL Encryption · <strong>100% Secure Checkout</strong></span>
            </div>
            <button className="pay-back-btn" style={{ marginTop: 12, width: "100%", justifyContent: "center" }}
              onClick={() => setStep("info")}>
              <i className="bi bi-arrow-left" /> Back to Details
            </button>
          </>
        )}

        {/* ── STEP 3A: Google Pay ── */}
        {step === "gpay" && orderData && (
          <>
            <div className="upi-pay-header">
              <div className="upi-brand-badge gpay-badge">
                <span className="gpay-logo-text-lg">G Pay</span>
              </div>
              <h2 className="pay-title" style={{ marginTop: 12 }}>Google Pay</h2>
              <p className="pay-course-name">Scan or use UPI ID to pay</p>
            </div>
            <div className="qr-container">
              <QRVisual size={160} accent="#4285F4" />
              <div className="qr-amount-tag">₹{course.price?.toLocaleString()}</div>
            </div>
            <div className="upi-id-box">
              <span className="upi-id-label">Pay to UPI ID</span>
              <div className="upi-id-value">
                <i className="bi bi-at" />sbk8469@okicici
                <button className="upi-copy-btn" onClick={() => navigator.clipboard.writeText("sbk8469@oksbi")}>
                  <i className="bi bi-clipboard" /> Copy
                </button>
              </div>
            </div>
            <div className="upi-timer-row">
              <i className="bi bi-clock" style={{ color: timer.seconds < 60 ? "#f43f5e" : "#4ade80" }} />
              <span style={{ color: timer.seconds < 60 ? "#f43f5e" : "rgba(200,215,240,0.6)" }}>
                Expires in <strong>{timer.display}</strong>
              </span>
            </div>
            <div className="upi-steps">
              <span><span className="step-num">1</span>Open Google Pay app</span>
              <span><span className="step-num">2</span>Scan QR or enter UPI ID</span>
              <span><span className="step-num">3</span>Pay ₹{course.price?.toLocaleString()} & click verify</span>
            </div>
            <div className="pay-actions" style={{ marginTop: 20 }}>
              <button className="pay-back-btn" onClick={() => setStep("method")}><i className="bi bi-arrow-left" /> Back</button>
              <button className="pay-pay-btn gpay-pay-btn" onClick={() => finalizePayment("gpay")}>
                <i className="bi bi-check-circle-fill" /> I've Paid
              </button>
            </div>
          </>
        )}

        {/* ── STEP 3B: PhonePe ── */}
        {step === "phonepe" && orderData && (
          <>
            <div className="upi-pay-header">
              <div className="upi-brand-badge phonepe-badge">
                <i className="bi bi-phone-fill" />
              </div>
              <h2 className="pay-title" style={{ marginTop: 12 }}>PhonePe</h2>
              <p className="pay-course-name">Scan QR or Pay with UPI App</p>
            </div>
            <div className="qr-container">
              <QRVisual size={160} accent="#6739B7" />
              <div className="qr-amount-tag" style={{ background: "#6739B7" }}>₹{course.price?.toLocaleString()}</div>
            </div>

            <a href={`upi://pay?pa=sunilbk@ybl&pn=Sunil%20BK&am=${course.price}&cu=INR`} className="upi-app-btn" style={{ background: "#6739B7" }}>
              <i className="bi bi-lightning-charge-fill" /> Open PhonePe
            </a>

            <div className="upi-id-box" style={{ borderColor: "rgba(103,57,183,0.3)" }}>
              <span className="upi-id-label">PhonePe UPI ID</span>
              <div className="upi-id-value">
                <i className="bi bi-at" />sunilbk@ybl
                <button className="upi-copy-btn" onClick={() => navigator.clipboard.writeText("sunilbk@ybl")}>
                  <i className="bi bi-clipboard" /> Copy
                </button>
              </div>
            </div>
            <div className="upi-timer-row">
              <i className="bi bi-clock" style={{ color: timer.seconds < 60 ? "#f43f5e" : "#a78bfa" }} />
              <span style={{ color: timer.seconds < 60 ? "#f43f5e" : "rgba(200,215,240,0.6)" }}>
                Expires in <strong>{timer.display}</strong>
              </span>
            </div>
            <div className="upi-steps">
              <span><span className="step-num" style={{ background: "#6739B7" }}>1</span>Open app / Scan QR</span>
              <span><span className="step-num" style={{ background: "#6739B7" }}>2</span>Complete payment</span>
              <span><span className="step-num" style={{ background: "#6739B7" }}>3</span>Verify below</span>
            </div>
            <div className="pay-actions" style={{ marginTop: 20 }}>
              <button className="pay-back-btn" onClick={() => setStep("method")}><i className="bi bi-arrow-left" /> Back</button>
              <button className="pay-pay-btn phonepe-pay-btn" onClick={() => finalizePayment("phonepe")}>
                <i className="bi bi-check-circle-fill" /> I've Paid
              </button>
            </div>
          </>
        )}

        {/* ── STEP 3E: Paytm ── */}
        {step === "paytm" && orderData && (
          <>
            <div className="upi-pay-header">
              <div className="upi-brand-badge paytm-badge">
                <span style={{ fontWeight: 900 }}>Paytm</span>
              </div>
              <h2 className="pay-title" style={{ marginTop: 12 }}>Paytm UPI</h2>
              <p className="pay-course-name">Instant payment via Paytm</p>
            </div>
            <div className="qr-container">
              <QRVisual size={160} accent="#00BAF2" />
              <div className="qr-amount-tag" style={{ background: "#00BAF2" }}>₹{course.price?.toLocaleString()}</div>
            </div>

            <a href={`upi://pay?pa=sunilbk@paytm&pn=Sunil%20BK&am=${course.price}&cu=INR`} className="upi-app-btn" style={{ background: "#00BAF2" }}>
              <i className="bi bi-lightning-charge-fill" /> Open Paytm App
            </a>

            <div className="upi-id-box" style={{ borderColor: "rgba(0,186,242,0.3)" }}>
              <span className="upi-id-label">Paytm UPI ID</span>
              <div className="upi-id-value">
                <i className="bi bi-at" />sunilbk@paytm
                <button className="upi-copy-btn" onClick={() => navigator.clipboard.writeText("sunilbk@paytm")}>
                  <i className="bi bi-clipboard" /> Copy
                </button>
              </div>
            </div>
            <div className="upi-timer-row">
              <i className="bi bi-clock" style={{ color: timer.seconds < 60 ? "#f43f5e" : "#00BAF2" }} />
              <span style={{ color: timer.seconds < 60 ? "#f43f5e" : "rgba(200,215,240,0.6)" }}>
                Expires in <strong>{timer.display}</strong>
              </span>
            </div>
            <div className="pay-actions" style={{ marginTop: 20 }}>
              <button className="pay-back-btn" onClick={() => setStep("method")}><i className="bi bi-arrow-left" /> Back</button>
              <button className="pay-pay-btn paytm-pay-btn" onClick={() => finalizePayment("paytm")}>
                <i className="bi bi-check-circle-fill" /> I've Paid
              </button>
            </div>
          </>
        )}

        {/* ── STEP 3C: Net Banking — Bank Select ── */}
        {step === "netbank-select" && orderData && (
          <>
            <div className="pay-header">
              <h2 className="pay-title">Select Your Bank</h2>
              <p className="pay-course-name">₹{course.price?.toLocaleString()} · {course.title}</p>
            </div>
            <div className="bank-search-wrap">
              <i className="bi bi-search bank-search-icon" />
              <input type="text" className="bank-search-input" placeholder="Search bank..."
                value={bankSearch} onChange={e => setBankSearch(e.target.value)} />
            </div>
            <div className="bank-grid">
              {filteredBanks.map(bank => (
                <button key={bank.id}
                  className={`bank-tile ${selectedBank?.id === bank.id ? "selected" : ""}`}
                  style={{ borderColor: selectedBank?.id === bank.id ? bank.color : "rgba(255,255,255,0.07)", background: selectedBank?.id === bank.id ? bank.bg : "" }}
                  onClick={() => setSelectedBank(bank)}>
                  <div className="bank-icon" style={{ background: bank.bg }}>
                    <i className={`bi ${bank.icon}`} style={{ color: bank.color }} />
                  </div>
                  <span style={{ color: selectedBank?.id === bank.id ? bank.color : "rgba(200,215,240,0.8)" }}>{bank.short}</span>
                </button>
              ))}
            </div>
            {selectedBank && (
              <div className="selected-bank-name">
                <i className="bi bi-check-circle-fill" style={{ color: "#4ade80" }} /> {selectedBank.name} selected
              </div>
            )}
            <div className="pay-actions" style={{ marginTop: 18 }}>
              <button className="pay-back-btn" onClick={() => setStep("method")}><i className="bi bi-arrow-left" /> Back</button>
              <button className="pay-pay-btn" disabled={!selectedBank}
                style={{ background: selectedBank ? `linear-gradient(130deg, ${selectedBank.color}, #6366f1)` : "rgba(255,255,255,0.1)" }}
                onClick={() => { setOtpStage(false); setBankUser(""); setBankPass(""); setOtp(""); setStep("netbank-auth"); }}>
                Proceed to Bank &nbsp;<i className="bi bi-arrow-right" />
              </button>
            </div>
          </>
        )}

        {/* ── STEP 3D: Net Banking — Auth ── */}
        {step === "netbank-auth" && selectedBank && (
          <>
            <div className="bank-auth-header" style={{ borderColor: selectedBank.color }}>
              <div className="bank-auth-logo" style={{ background: selectedBank.bg, borderColor: selectedBank.color }}>
                <i className={`bi ${selectedBank.icon}`} style={{ color: selectedBank.color, fontSize: "1.6rem" }} />
              </div>
              <div>
                <div className="bank-auth-name" style={{ color: selectedBank.color }}>{selectedBank.name}</div>
                <div className="bank-auth-sub">Secure Internet Banking</div>
              </div>
            </div>
            <div className="bank-auth-amount-row">
              <i className="bi bi-lock-fill" style={{ color: "#4ade80", fontSize: "0.8rem" }} />
              <span>Paying &nbsp;<strong style={{ color: "#fff" }}>₹{course.price?.toLocaleString()}</strong>&nbsp; to Sunil BK Courses</span>
            </div>
            {!otpStage ? (
              <>
                <div className="pay-form" style={{ marginTop: 20 }}>
                  <div className="pay-field">
                    <label>Customer ID / Username</label>
                    <div className="pay-input-wrap">
                      <i className="bi bi-person pay-input-icon" />
                      <input type="text" placeholder="Enter your customer ID" value={bankUser}
                        onChange={e => setBankUser(e.target.value)} />
                    </div>
                  </div>
                  <div className="pay-field">
                    <label>Password</label>
                    <div className="pay-input-wrap">
                      <i className="bi bi-lock pay-input-icon" />
                      <input type="password" placeholder="••••••••" value={bankPass}
                        onChange={e => setBankPass(e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="pay-actions" style={{ marginTop: 18 }}>
                  <button className="pay-back-btn" onClick={() => setStep("netbank-select")}><i className="bi bi-arrow-left" /> Back</button>
                  <button className="pay-pay-btn" disabled={!bankUser.trim()}
                    style={{ background: `linear-gradient(130deg, ${selectedBank.color}, #6366f1)` }}
                    onClick={handleBankAuth}>
                    Login &nbsp;<i className="bi bi-arrow-right" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="otp-notice">
                  <i className="bi bi-phone-fill" style={{ color: "#4ade80" }} />
                  OTP sent to registered mobile number
                </div>
                <div className="pay-form" style={{ marginTop: 16 }}>
                  <div className="pay-field">
                    <label>Enter OTP</label>
                    <div className="pay-input-wrap">
                      <i className="bi bi-shield-check pay-input-icon" style={{ color: "#4ade80" }} />
                      <input type="text" placeholder="• • • • • •" maxLength={6} value={otp}
                        onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                        style={{ letterSpacing: "0.3em", textAlign: "center", fontSize: "1.2rem" }} />
                    </div>
                  </div>
                </div>
                <div className="pay-actions" style={{ marginTop: 18 }}>
                  <button className="pay-back-btn" onClick={() => setOtpStage(false)}><i className="bi bi-arrow-left" /> Back</button>
                  <button className="pay-pay-btn" disabled={otp.length < 4}
                    style={{ background: `linear-gradient(130deg, ${selectedBank.color}, #4ade80)` }}
                    onClick={handleBankAuth}>
                    <i className="bi bi-shield-check" /> Verify & Pay
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* ── PROCESSING ── */}
        {step === "processing" && (
          <div className="pay-processing">
            <div className="payment-loader">
              <div className="rz-circle" style={{ borderTopColor: course.accent }} />
              <div className="rz-logo"><i className="bi bi-lock-fill" style={{ color: course.accent }} /></div>
            </div>
            <h3>Processing Payment…</h3>
            <p>Please wait. Do not close this window.</p>
            <div className="rz-steps">
              <span className="rz-step active">Request Received</span>
              <span className="rz-step active">Validating</span>
              <span className="rz-step">Confirming Access</span>
            </div>
          </div>
        )}

        {/* ── SUCCESS ── */}
        {step === "success" && successData && (
          <div className="pay-success">
            <div className="success-icon"><i className="bi bi-check-circle-fill" style={{ color: "#4ade80" }} /></div>
            <h2>Enrollment Successful!</h2>
            <p>Welcome to <strong>{successData.course}</strong>!</p>
            <p className="success-sub">
              Confirmation sent to <strong>{successData.email}</strong>. Course access is now active.
            </p>
            <div className="success-details">
              <div><span>Student</span><strong>{successData.student}</strong></div>
              <div><span>Amount Paid</span><strong style={{ color: "#4ade80" }}>₹{successData.amount?.toLocaleString()}</strong></div>
              <div><span>Transaction ID</span><strong style={{ fontSize: "0.72rem", wordBreak: "break-all" }}>{successData.payment_id}</strong></div>
            </div>
            <button className="pay-done-btn" onClick={() => { onEnrolled(course.id); onClose(); }}>
              Access Your Course &nbsp;<i className="bi bi-play-circle-fill" />
            </button>
          </div>
        )}

        {/* ── ERROR ── */}
        {step === "error" && (
          <div className="pay-error-screen">
            <div className="error-icon"><i className="bi bi-x-circle-fill" /></div>
            <h3>Payment Failed</h3>
            <p>{apiError || "An unexpected error occurred. Please try again."}</p>
            <button className="pay-retry-btn" onClick={() => { setStep("method"); setApiError(""); }}>
              <i className="bi bi-arrow-counterclockwise" /> &nbsp;Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   COURSE VIEWER
   Shown after enrollment — displays course content
   ══════════════════════════════════════════════════════════════════ */
function CourseViewer({ course, enrollment, onClose, user }) {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState(null);
  const [completedTopics, setCompletedTopics] = useState([]);
  const [error, setError] = useState("");
  const [showCertificate, setShowCertificate] = useState(false);

  useEffect(() => {
    // Verify user is authenticated before allowing access
    if (!user) {
      setError("Authentication required. Please log in to access course content.");
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("accessToken");
    if (!token) {
      setError("Your session has expired. Please log in again.");
      setLoading(false);
      return;
    }

    const fetchContent = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/courses/${course.id}/videos/`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to load course content.");
        }
        const data = await res.json();
        setContent({
          title: course.title,
          description: course.description,
          topics: course.topics || [],
          videos: data,
          duration: course.duration,
          lessons: course.lessons,
          level: course.level,
          icon: course.icon,
          accent: course.accent,
        });
      } catch (err) {
        setError(err.message);
        setContent({
          title: course.title,
          description: course.description,
          topics: course.topics || [],
          videos: [],
          duration: course.duration,
          lessons: course.lessons,
          level: course.level,
          icon: course.icon,
          accent: course.accent,
        });
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, [course, user]);

  const toggleTopic = (idx) => {
    setCompletedTopics(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const handleVideoWatched = async (video) => {
    setActiveVideo(video);
    try {
      // Track video completion when selected
      await apiTrackVideoCompletion(course.db_id || course.id, video.id);
    } catch (err) {
      console.error("Error tracking video completion:", err.message);
    }
  };

  const handleGetCertificate = async () => {
    try {
      const result = await apiGenerateCertificate(course.db_id || course.id);
      if (result.success) {
        setShowCertificate(true);
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const progress = content?.topics?.length
    ? Math.round((completedTopics.length / content.topics.length) * 100)
    : 0;

  return (
    <div className="viewer-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="viewer-modal">
        {/* ── Header ── */}
        <div className="viewer-header" style={{ background: `linear-gradient(135deg, ${course.accent}22, #0a1018)`, borderBottomColor: `${course.accent}30` }}>
          <div className="viewer-header-left">
            <div className="viewer-course-icon" style={{ background: `${course.accent}20`, borderColor: `${course.accent}44` }}>
              <i className={course.icon} style={{ color: course.accent }} />
            </div>
            <div>
              <div className="viewer-enrolled-badge"><i className="bi bi-check-circle-fill" /> Enrolled</div>
              <h2 className="viewer-title">{course.title}</h2>
              <div className="viewer-meta">
                <span><i className="bi bi-clock" /> {course.duration}</span>
                <span><i className="bi bi-play-circle" /> {course.lessons} lessons</span>
                <span><i className="bi bi-bar-chart" /> {course.level}</span>
              </div>
            </div>
          </div>
          <button className="viewer-close" onClick={onClose}><i className="bi bi-x-lg" /></button>
        </div>

        {loading ? (
          <div className="viewer-loading">
            <div className="viewer-spinner" style={{ borderTopColor: course.accent }} />
            <p>Loading course content…</p>
          </div>
        ) : error ? (
          <div className="viewer-error" style={{ padding: '40px', textAlign: 'center', color: '#fff' }}>
            <div style={{ fontSize: '2rem', marginBottom: '15px' }}><i className="bi bi-exclamation-triangle-fill" style={{ color: '#f43f5e' }} /></div>
            <h3 style={{ color: '#f43f5e', marginBottom: '10px' }}>Access Denied</h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '20px' }}>{error}</p>
            <button onClick={onClose} style={{ padding: '10px 20px', background: '#6366f1', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer' }}>
              Close
            </button>
          </div>
        ) : (
          <div className="viewer-body">
            {/* ── Progress Bar ── */}
            <div className="progress-section">
              <div className="progress-header">
                <span>Your Progress</span>
                <strong style={{ color: course.accent }}>{progress}% Complete</strong>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${course.accent}, #6366f1)` }} />
              </div>
              {progress === 100 && (
                <div className="completion-bonus">
                  <div className="completion-badge">
                    <i className="bi bi-trophy-fill" style={{ color: "#f7c948" }} /> You've Mastered this Course!
                  </div>
                  <button className="cert-download-btn" onClick={handleGetCertificate}>
                    <i className="bi bi-award-fill" /> Get Your Certificate
                  </button>
                </div>
              )}
            </div>

            {/* ── Certificate Modal ── */}
            {showCertificate && (
              <div className="cert-overlay" onClick={() => setShowCertificate(false)}>
                <div className="cert-modal" onClick={e => e.stopPropagation()}>
                  <button className="cert-close" onClick={() => setShowCertificate(false)}><i className="bi bi-x-lg" /></button>
                  <div className="certificate-paper" id="certificate">
                    <div className="cert-border"></div>
                    <div className="cert-content">
                      <div className="cert-logo-wrap">
                        <i className="bi bi-lightning-charge-fill cert-logo-icon" />
                        <span className="cert-brand">SUNIL BK ACADEMY</span>
                      </div>
                      <h1 className="cert-title">CERTIFICATE</h1>
                      <p className="cert-subtitle">OF COURSE COMPLETION</p>

                      <div className="cert-recipient-wrap">
                        <p className="cert-presented">This is presented to</p>
                        <h2 className="cert-name">{user?.username || enrollment.student || "Aspiring Developer"}</h2>
                        <div className="cert-name-line"></div>
                      </div>

                      <p className="cert-text">
                        For successfully completing the comprehensive professional course on
                        <br />
                        <strong className="cert-course-name">{course.title}</strong>
                        <br />
                        demonstrating exceptional dedication, skill, and mastery of the subject.
                      </p>

                      <div className="cert-footer">
                        <div className="cert-signature-wrap">
                          <img src="/signature.png" alt="Signature" className="cert-signature"
                            onerror="this.style.display='none'; this.nextElementSibling.style.display='block'" />
                          <div className="placeholder-sig" style={{ display: 'none', fontFamily: 'cursive', fontSize: '1.5rem', marginBottom: '5px' }}>Sunil Kumar</div>
                          <div className="cert-sig-line"></div>
                          <p className="cert-signer">Sunil Kumar</p>
                          <p className="cert-role">Founder & Instructor</p>
                        </div>
                        <div className="cert-date-wrap">
                          <p className="cert-date">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                          <div className="cert-sig-line"></div>
                          <p className="cert-signer">Date of Issue</p>
                        </div>
                        <div className="cert-stamp">
                          <i className="bi bi-patch-check-fill" />
                        </div>
                      </div>

                      <div className="cert-id">Certificate ID: CER-{Math.random().toString(36).substr(2, 9).toUpperCase()}</div>
                    </div>
                  </div>
                  <button className="cert-print-btn" onClick={() => window.print()}>
                    <i className="bi bi-printer" /> Print or Save as PDF
                  </button>
                </div>
              </div>
            )}

            {/* ── Video Player (if videos exist) ── */}
            {content?.videos?.length > 0 && (
              <div className="video-section">
                <h3 className="section-heading"><i className="bi bi-play-circle-fill" style={{ color: course.accent }} /> Video Lessons</h3>
                {activeVideo ? (
                  <div className="active-video">
                    <video controls src={activeVideo.url} className="video-player" key={activeVideo.url} />
                    <div className="active-video-title">{activeVideo.title}</div>
                    <button className="back-to-list" onClick={() => setActiveVideo(null)}>
                      <i className="bi bi-arrow-left" /> Back to list
                    </button>
                  </div>
                ) : (
                  <div className="video-list">
                    {content.videos.map((v, i) => (
                      <button key={v.id} className="video-item" onClick={() => handleVideoWatched(v)}>
                        <div className="video-item-num" style={{ background: `${course.accent}20`, color: course.accent }}>{i + 1}</div>
                        <div className="video-item-info">
                          <span className="video-item-title">{v.title}</span>
                          <span className="video-item-sub">Click to watch</span>
                        </div>
                        <i className="bi bi-play-circle-fill video-play-icon" style={{ color: course.accent }} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Topics Checklist ── */}
            <div className="topics-section">
              <h3 className="section-heading"><i className="bi bi-list-check" style={{ color: course.accent }} /> Course Topics</h3>
              <div className="topics-checklist">
                {(content?.topics || course.topics || []).map((topic, idx) => (
                  <button key={idx} className={`topic-item ${completedTopics.includes(idx) ? "completed" : ""}`}
                    onClick={() => toggleTopic(idx)}
                    style={{ borderColor: completedTopics.includes(idx) ? `${course.accent}44` : "rgba(255,255,255,0.07)" }}>
                    <div className={`topic-checkbox ${completedTopics.includes(idx) ? "checked" : ""}`}
                      style={{ background: completedTopics.includes(idx) ? course.accent : "transparent", borderColor: completedTopics.includes(idx) ? course.accent : "rgba(255,255,255,0.2)" }}>
                      {completedTopics.includes(idx) && <i className="bi bi-check" />}
                    </div>
                    <span className="topic-name" style={{ color: completedTopics.includes(idx) ? "#fff" : "rgba(200,215,240,0.7)" }}>
                      {topic}
                    </span>
                    {completedTopics.includes(idx) && <span className="topic-done-badge">Done</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* ── No Videos Placeholder ── */}
            {(!content?.videos || content.videos.length === 0) && (
              <div className="no-videos-placeholder">
                <i className="bi bi-camera-video" style={{ color: course.accent, fontSize: "2.5rem" }} />
                <h4>Videos Coming Soon</h4>
                <p>Course videos are being uploaded. You'll get notified at <strong>{enrollment.email || "your email"}</strong>.</p>
                <div className="coming-soon-tags">
                  {(content?.topics || course.topics || []).map((t, i) => (
                    <span key={i} className="coming-soon-tag" style={{ borderColor: `${course.accent}30`, color: course.accent }}>{t}</span>
                  ))}
                </div>
              </div>
            )}

            {/* ── Enrollment Info ── */}
            <div className="enrollment-info-box">
              <div className="enrollment-row">
                <i className="bi bi-receipt" style={{ color: "#4ade80" }} />
                <span>Enrollment ID:</span>
                <code>{enrollment.enrollmentId}</code>
              </div>
              <div className="enrollment-row">
                <i className="bi bi-credit-card-2-front" style={{ color: "#60a5fa" }} />
                <span>Transaction:</span>
                <code>{enrollment.paymentId}</code>
              </div>
              <div className="enrollment-row">
                <i className="bi bi-cash-stack" style={{ color: course.accent }} />
                <span>Amount Paid:</span>
                <strong style={{ color: "#4ade80" }}>₹{enrollment.amount?.toLocaleString()}</strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   COURSE CARD
   ══════════════════════════════════════════════════════════════════ */
function CourseCard({ course, onEnroll, onView, isEnrolled }) {
  const discount = Math.round(((course.originalPrice - course.price) / course.originalPrice) * 100);
  return (
    <div className="course-card" style={{ "--accent": course.accent }}>
      {isEnrolled && (
        <div className="enrolled-ribbon">
          <i className="bi bi-check-circle-fill" /> Enrolled
        </div>
      )}
      <div className="course-badge"
        style={{ background: `${course.badgeColor}22`, color: course.badgeColor, border: `1px solid ${course.badgeColor}44` }}>
        {course.badge}
      </div>
      <div className="course-icon-wrap" style={{ borderColor: `${course.accent}55`, background: `${course.accent}12` }}>
        <i className={course.icon} style={{ color: course.accent }} />
      </div>
      <h3 className="course-title">{course.title}</h3>
      <p className="course-desc">{course.description}</p>
      <ul className="course-topics">
        {course.topics.map(t => (
          <li key={t}><i className="bi bi-check2" style={{ color: course.accent }} /> {t}</li>
        ))}
      </ul>
      <div className="course-meta">
        <span><i className="bi bi-clock" /> {course.duration}</span>
        <span><i className="bi bi-play-circle" /> {course.lessons} lessons</span>
        <span><i className="bi bi-bar-chart" /> {course.level}</span>
      </div>
      <div className="course-footer">
        <div className="course-price">
          <span className="price-now">₹{course.price?.toLocaleString()}</span>
          <div className="price-old-wrap">
            <span className="price-old">₹{course.originalPrice?.toLocaleString()}</span>
            <span className="price-off" style={{ background: `${course.accent}22`, color: course.accent }}>{discount}% OFF</span>
          </div>
        </div>
        {isEnrolled ? (
          <button className="access-course-btn" style={{ background: `linear-gradient(130deg, ${course.accent}, #6366f1)` }}
            onClick={() => onView(course)}>
            <i className="bi bi-play-circle-fill" /> Access Course
          </button>
        ) : (
          <button className="enroll-btn" style={{ background: `linear-gradient(130deg, ${course.accent}, #6366f1)` }}
            onClick={() => onEnroll(course)}>
            Enroll Now <i className="bi bi-arrow-right" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   COURSES SECTION (Main)
   ══════════════════════════════════════════════════════════════════ */
const Courses = () => {
  const { user } = useContext(AuthContext);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);   // for payment modal
  const [viewingCourse, setViewingCourse] = useState(null);     // for course viewer
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [enrolledMap, setEnrolledMap] = useState(() => {
    const list = getEnrolled();
    return Object.fromEntries(list.map(e => [e.courseId, e]));
  });

  useEffect(() => {
    fetch(`${API_BASE}/courses/`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const mappedCourses = data.map(c => ({
            ...c,
            originalPrice: c.original_price,
            accent: c.accent_color,
            badgeColor: c.badge_color
          }));
          setCourses(mappedCourses);
        }
      })
      .catch(err => console.error("Could not fetch courses from API:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleEnrolled = (courseId) => {
    const updated = Object.fromEntries(getEnrolled().map(e => [e.courseId, e]));
    setEnrolledMap(updated);
    // Auto-open course viewer
    const course = courses.find(c => c.id === courseId);
    if (course) setViewingCourse(course);
  };

  const handleEnrollClick = (course) => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    setSelectedCourse(course);
  };

  const handleViewCourse = (course) => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    setViewingCourse(course);
  };

  return (
    <section className="courses-section" id="courses">
      <div className="courses-header">
        <span className="courses-eyebrow">Learn &amp; Level Up</span>
        <h2 className="courses-heading">My Courses</h2>
        <p className="courses-subtext">
          Handcrafted courses built from real-world experience. Start from zero and become job-ready.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: "#fff", padding: "50px 0" }}>
          <div style={{ fontSize: "2rem", marginBottom: 12, opacity: 0.5 }}>⟳</div>
          Loading courses…
        </div>
      ) : courses.length === 0 ? (
        <div style={{ textAlign: "center", color: "rgba(200,215,240,0.6)", padding: "50px 0" }}>
          <i className="bi bi-inbox" style={{ fontSize: "2.5rem", marginBottom: 12, display: "block" }} />
          No courses available at the moment.
        </div>
      ) : (
        <div className="courses-grid">
          {courses.map(course => (
            <CourseCard
              key={course.id}
              course={course}
              onEnroll={() => handleEnrollClick(course)}
              onView={() => handleViewCourse(course)}
              isEnrolled={!!enrolledMap[course.id]}
            />
          ))}
        </div>
      )}

      {/* Payment Modal */}
      {selectedCourse && (
        <PaymentModal
          course={selectedCourse}
          onClose={() => setSelectedCourse(null)}
          onEnrolled={handleEnrolled}
        />
      )}

      {/* Course Viewer */}
      {viewingCourse && enrolledMap[viewingCourse.id] && user && (
        <CourseViewer
          course={viewingCourse}
          enrollment={enrolledMap[viewingCourse.id]}
          onClose={() => setViewingCourse(null)}
          user={user}
        />
      )}

      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        <div className="login-prompt-overlay" onClick={() => setShowLoginPrompt(false)}>
          <div className="login-prompt-modal" onClick={e => e.stopPropagation()}>
            <div className="login-prompt-icon">
              <i className="bi bi-person-lock" />
            </div>
            <h3>Authentication Required</h3>
            <p>Please log in to your account to enroll in courses or access your learning dashboard.</p>
            <div className="login-prompt-actions">
              <button className="login-prompt-cancel" onClick={() => setShowLoginPrompt(false)}>Maybe Later</button>
              <a href="#login" className="login-prompt-btn" onClick={() => { setShowLoginPrompt(false); window.location.href = '/#contact'; }}>
                Go to Login <i className="bi bi-box-arrow-in-right" />
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Courses;
