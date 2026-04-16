import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import "./courses.css";

const fallbackCourses = [
  {
    id: "python",
    icon: "bi bi-filetype-py",
    badge: "Bestseller",
    badgeColor: "#f7c948",
    title: "Python for Beginners",
    description: "Start your coding journey with Python. Learn variables, loops, functions, OOP, and build real projects from scratch.",
    price: 999,
    originalPrice: 2999,
    duration: "8 Weeks",
    lessons: 42,
    level: "Beginner",
    accent: "#f7c948",
    topics: ["Basics & Syntax", "OOP Concepts", "File Handling", "Mini Projects"],
  },
  {
    id: "fullstack",
    icon: "bi bi-easel2",
    badge: "Popular",
    badgeColor: "#00d4ff",
    title: "Full-Stack Web Dev",
    description: "Master HTML, CSS, JavaScript, React & Django to build complete production-ready full-stack web applications.",
    price: 1499,
    originalPrice: 3999,
    duration: "12 Weeks",
    lessons: 78,
    level: "Intermediate",
    accent: "#00d4ff",
    topics: ["HTML & CSS", "JavaScript + React", "Django Backend", "Deployment"],
  },
  {
    id: "mysql",
    icon: "bi bi-database-gear",
    badge: "New",
    badgeColor: "#a78bfa",
    title: "MySQL Masterclass",
    description: "Deep dive into relational databases. Learn queries, joins, indexing, stored procedures and integrate with Python/Django.",
    price: 799,
    originalPrice: 1999,
    duration: "5 Weeks",
    lessons: 31,
    level: "Beginner",
    accent: "#a78bfa",
    topics: ["SQL Basics", "Joins & Subqueries", "Indexing", "Django ORM"],
  },
];

import API_BASE from "../apiConfig";

/* ── Helpers ─────────────────────────────────────────────────────── */
function formatCardNumber(v) {
  return v.replace(/\D/g, "").substring(0, 16).replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(v) {
  const c = v.replace(/\D/g, "").substring(0, 4);
  return c.length >= 2 ? c.slice(0, 2) + "/" + c.slice(2) : c;
}

/* Detect card brand */
function detectBrand(num) {
  const n = num.replace(/\s/g, "");
  if (/^4/.test(n)) return { label: "Visa", icon: "bi-credit-card-2-front" };
  if (/^5[1-5]/.test(n)) return { label: "Mastercard", icon: "bi-credit-card" };
  if (/^6/.test(n)) return { label: "RuPay", icon: "bi-credit-card-fill" };
  return { label: "", icon: "bi-credit-card-2-front" };
}

async function callCreateOrder(studentData, course, method = "simulated") {
  const res = await fetch(`${API_BASE}/courses/create-order/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: studentData.name,
      email: studentData.email,
      phone: studentData.phone,
      course_id: course.id,
      course_name: course.title,
      amount: course.price,
      method: method
    }),
  });
  if (!res.ok) {
    const e = await res.json();
    throw new Error(e.error || "Backend error creating order.");
  }
  return res.json();
}

async function callVerify(enrollmentId, transactionId, method = "simulated", extraData = {}) {
  const res = await fetch(`${API_BASE}/courses/verify-payment/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      enrollment_id: enrollmentId,
      transaction_id: transactionId,
      method: method,
      ...extraData
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Payment verification failed.");
  return data;
}

/* ══════════════════════════════════════════════════════════════════
   PAYMENT MODAL
   Steps: info → method → card | upi → loading → success | error
   ══════════════════════════════════════════════════════════════════ */
function PaymentModal({ course, onClose }) {
  const [step, setStep] = useState("info");
  const [student, setStudent] = useState({ name: "", email: "", phone: "" });
  const [card, setCard] = useState({ number: "", name: "", expiry: "", cvv: "" });
  const [upiId, setUpiId] = useState("");
  const [flipped, setFlipped] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [successData, setSuccessData] = useState(null);

  const brand = detectBrand(card.number);

  /* ── Validators ── */
  const validateInfo = () => {
    const e = {};
    if (!student.name.trim()) e.name = "Name is required";
    if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/.test(student.email)) e.email = "Valid email required";
    if (!/^\d{10}$/.test(student.phone)) e.phone = "Enter a 10-digit number";
    return e;
  };

  const validateCard = () => {
    const e = {};
    if (card.number.replace(/\s/g, "").length < 16) e.number = "Enter complete 16-digit card number";
    if (!card.name.trim()) e.cname = "Cardholder name is required";
    if (!/^\d{2}\/\d{2}$/.test(card.expiry)) e.expiry = "Enter valid MM/YY";
    if (card.cvv.length < 3) e.cvv = "Enter 3 or 4 digit CVV";
    return e;
  };

  const validateUpi = () => {
    if (!/^[\w.\-]+@[\w]+$/.test(upiId)) return { upi: "Enter a valid UPI ID (e.g. name@okaxis)" };
    return {};
  };

  /* ── Real Payment Handler (Razorpay) ── */
  const handlePayment = async (method) => {
    setStep("loading");
    try {
      const orderData = await callCreateOrder(student, course, method);
      
      if (method === 'razorpay' && orderData.key) {
        // Load Razorpay Script
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        script.onload = () => {
          const options = {
            key: orderData.key,
            amount: orderData.amount,
            currency: orderData.currency,
            name: "My Portfolio Courses",
            description: `Enrolling in ${course.title}`,
            order_id: orderData.order_id,
            handler: async (response) => {
              try {
                const vData = await callVerify(orderData.enrollment_id, response.razorpay_payment_id, 'razorpay', {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                });
                setSuccessData(vData);
                setStep("success");
              } catch (err) {
                setApiError(err.message);
                setStep("error");
              }
            },
            prefill: {
              name: student.name,
              email: student.email,
              contact: student.phone
            },
            theme: { color: course.accent }
          };
          const rzp = new window.Razorpay(options);
          rzp.open();
        };
        document.body.appendChild(script);
      } else {
        // Simulated success for other methods
        setTimeout(async () => {
          try {
            const vData = await callVerify(orderData.enrollment_id, "SIM_" + Math.random().toString(36).substring(7), method);
            setSuccessData(vData);
            setStep("success");
          } catch (err) {
            setApiError(err.message);
            setStep("error");
          }
        }, 2000);
      }
    } catch (err) {
      setApiError(err.message);
      setStep("error");
    }
  };

  /* ── Pay via Card ── */
  const handleCardPay = async () => {
    const e = validateCard();
    if (Object.keys(e).length) { setErrors(e); return; }
    handlePayment("card");
  };

  /* ── Pay via UPI ── */
  const handleUpiPay = async () => {
    const e = validateUpi();
    if (Object.keys(e).length) { setErrors(e); return; }
    handlePayment("upi");
  };

  /* ── Pay via eSewa ── */
  const handleEsewaPay = async () => {
    handlePayment("esewa");
  };

  /* ── Display values on animated card ── */
  const cardNumDisplay = card.number || "•••• •••• •••• ••••";
  const cardNameDisplay = card.name || "FULL NAME";
  const cardExpiryDisplay = card.expiry || "MM/YY";

  return (
    <div className="pay-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pay-modal">

        {/* Close */}
        <button className="pay-close" onClick={onClose}>
          <i className="bi bi-x-lg"></i>
        </button>

        {/* ╔═══════════════════════════╗
            ║  STEP 1 — Student Info   ║
            ╚═══════════════════════════╝ */}
        {step === "info" && (
          <>
            <div className="pay-header">
              <div className="pay-icon" style={{ borderColor: course.accent, background: `${course.accent}15` }}>
                <i className={course.icon} style={{ color: course.accent }}></i>
              </div>
              <h2 className="pay-title">Enroll Now</h2>
              <p className="pay-course-name">{course.title}</p>
            </div>

            {/* Price summary */}
            <div className="pay-summary">
              <div className="pay-row">
                <span>Original Price</span>
                <span className="line-through">₹{course.originalPrice.toLocaleString()}</span>
              </div>
              <div className="pay-row">
                <span>Your Discount</span>
                <span className="discount-green">– ₹{(course.originalPrice - course.price).toLocaleString()}</span>
              </div>
              <div className="pay-divider"></div>
              <div className="pay-row total-row" style={{ marginTop: '10px' }}>
                <span>Amount to Pay</span>
                <span style={{ color: course.accent, fontSize: '1.4rem', fontWeight: 'bold' }}>₹{course.price.toLocaleString()}</span>
              </div>
            </div>

            <div className="pay-form">
              {[
                { key: "name",  label: "Full Name",     type: "text",  ph: "Sunil Luhar",     icon: "bi-person"   },
                { key: "email", label: "Email Address", type: "email", ph: "you@example.com", icon: "bi-envelope" },
                { key: "phone", label: "Phone Number",  type: "tel",   ph: "9876543210",      icon: "bi-phone"    },
              ].map(({ key, label, type, ph, icon }) => (
                <div key={key} className="pay-field">
                  <label>{label}</label>
                  <div className="pay-input-wrap">
                    <i className={`bi ${icon} pay-input-icon`}></i>
                    <input type={type} placeholder={ph} value={student[key]}
                      onChange={(e) => { setStudent({ ...student, [key]: e.target.value }); setErrors({ ...errors, [key]: "" }); }}
                      className={errors[key] ? "has-error" : ""} />
                  </div>
                  {errors[key] && <span className="pay-error">{errors[key]}</span>}
                </div>
              ))}
            </div>

            <button className="pay-next-btn"
              style={{ background: `linear-gradient(130deg, ${course.accent}, #6366f1)` }}
              onClick={() => {
                const e = validateInfo();
                if (Object.keys(e).length) { setErrors(e); return; }
                setErrors({});
                setStep("method");
              }}>
              Continue to Payment &nbsp;<i className="bi bi-arrow-right"></i>
            </button>
          </>
        )}

        {/* ╔═══════════════════════════════╗
            ║  STEP 2 — Method Selection   ║
            ╚═══════════════════════════════╝ */}
        {step === "method" && (
          <>
            <div className="pay-header">
              <h2 className="pay-title">Select Payment</h2>
              <p className="pay-course-name">
                <i className="bi bi-lock-fill" style={{ fontSize: "0.7rem", marginRight: 5 }}></i>
                ₹{course.price.toLocaleString()} · {course.title}
              </p>
            </div>

            <div className="method-grid">
              {/* Card Option */}
              {/* Razorpay / UPI Option */}
              <button className="method-card" onClick={() => handlePayment("razorpay")}>
                <div className="method-icon-wrap upi-icon">
                  <i className="bi bi-qr-code"></i>
                </div>
                <div className="method-info">
                  <strong>Razorpay (UPI / Card / NetBanking)</strong>
                  <span>GPay · PhonePe · Credit Card</span>
                </div>
                <div className="method-chips">
                  <span style={{ color: "#4285F4" }}>Secure</span>
                  <span style={{ color: "#6739B7" }}>India</span>
                </div>
                <i className="bi bi-chevron-right method-arrow"></i>
              </button>

              {/* Card Option (Simulated fallback) */}
              <button className="method-card" onClick={() => { setErrors({}); setStep("card"); }}>
                <div className="method-icon-wrap card-icon" style={{ background: "rgba(99, 102, 241, 0.15)" }}>
                  <i className="bi bi-credit-card-2-front"></i>
                </div>
                <div className="method-info">
                  <strong>Simulated Card</strong>
                  <span>For testing without real money</span>
                </div>
                <i className="bi bi-chevron-right method-arrow"></i>
              </button>
            </div>

            <div className="payment-brand" style={{ marginTop: "22px" }}>
              <i className="bi bi-shield-lock-fill"></i>
              <span>256-bit SSL encryption · Secure <strong>Checkout</strong></span>
            </div>

            <button className="pay-back-btn" style={{ marginTop: "14px", width: "100%", justifyContent: "center" }}
              onClick={() => setStep("info")}>
              <i className="bi bi-arrow-left"></i> Back to Details
            </button>
          </>
        )}

        {/* ╔══════════════════════════╗
            ║  STEP 3A — Card Form    ║
            ╚══════════════════════════╝ */}
        {step === "card" && (
          <>
            <div className="pay-header" style={{ marginBottom: "18px" }}>
              <h2 className="pay-title">Card Details</h2>
              <p className="pay-course-name">₹{course.price.toLocaleString()} · {course.title}</p>
            </div>

            {/* 3D Animated Card */}
            <div className={`card-3d-wrap ${flipped ? "flipped" : ""}`}>
              <div className="card-3d-inner">
                {/* Front face */}
                <div className="card-face card-front"
                  style={{ background: `linear-gradient(145deg, ${course.accent}44 0%, #111827 55%, #6366f1aa 100%)` }}>
                  <div className="cf-top">
                    <div className="cf-chip">
                      <div className="cf-chip-line"></div>
                      <div className="cf-chip-line"></div>
                      <div className="cf-chip-line"></div>
                    </div>
                    <i className={`bi ${brand.icon} cf-brand-icon`} style={{ color: "#fff" }}></i>
                  </div>
                  <div className="cf-number">{cardNumDisplay}</div>
                  <div className="cf-bottom">
                    <div className="cf-info-group">
                      <span className="cf-label">Card Holder</span>
                      <span className="cf-val">{cardNameDisplay}</span>
                    </div>
                    <div className="cf-info-group">
                      <span className="cf-label">Expires</span>
                      <span className="cf-val">{cardExpiryDisplay}</span>
                    </div>
                    <div className="cf-sheen"></div>
                  </div>
                </div>

                {/* Back face */}
                <div className="card-face card-back">
                  <div className="cb-stripe"></div>
                  <div className="cb-sig-area">
                    <div className="cb-sig-bar"></div>
                    <div className="cb-cvv-box">
                      <span className="cf-label">CVV</span>
                      <span className="cb-cvv-val">{card.cvv || "•••"}</span>
                    </div>
                  </div>
                  <p className="cb-hint">This card is issued by your bank</p>
                </div>
              </div>
            </div>

            {/* Card inputs */}
            <div className="card-inputs">
              <div className="pay-field">
                <label>Card Number</label>
                <div className="pay-input-wrap">
                  <i className="bi bi-credit-card pay-input-icon"></i>
                  <input type="text" placeholder="1234  5678  9012  3456"
                    value={card.number} maxLength={19}
                    onChange={(e) => {
                      setCard({ ...card, number: formatCardNumber(e.target.value) });
                      setErrors({ ...errors, number: "" });
                    }}
                    className={errors.number ? "has-error" : ""}
                  />
                  {brand.label && <span className="card-brand-badge">{brand.label}</span>}
                </div>
                {errors.number && <span className="pay-error">{errors.number}</span>}
              </div>

              <div className="pay-field">
                <label>Cardholder Name</label>
                <div className="pay-input-wrap">
                  <i className="bi bi-person pay-input-icon"></i>
                  <input type="text" placeholder="AS ON CARD"
                    value={card.name}
                    onChange={(e) => {
                      setCard({ ...card, name: e.target.value.toUpperCase() });
                      setErrors({ ...errors, cname: "" });
                    }}
                    className={errors.cname ? "has-error" : ""}
                  />
                </div>
                {errors.cname && <span className="pay-error">{errors.cname}</span>}
              </div>

              <div className="card-row-2">
                <div className="pay-field">
                  <label>Expiry Date</label>
                  <div className="pay-input-wrap">
                    <i className="bi bi-calendar3 pay-input-icon"></i>
                    <input type="text" placeholder="MM / YY"
                      value={card.expiry} maxLength={5}
                      onChange={(e) => {
                        setCard({ ...card, expiry: formatExpiry(e.target.value) });
                        setErrors({ ...errors, expiry: "" });
                      }}
                      className={errors.expiry ? "has-error" : ""}
                    />
                  </div>
                  {errors.expiry && <span className="pay-error">{errors.expiry}</span>}
                </div>

                <div className="pay-field">
                  <label>CVV <i className="bi bi-question-circle cvv-tooltip-icon" title="3-digit code on back of card"></i></label>
                  <div className="pay-input-wrap">
                    <i className="bi bi-lock pay-input-icon"></i>
                    <input type="password" placeholder="•••"
                      value={card.cvv} maxLength={4}
                      onFocus={() => setFlipped(true)}
                      onBlur={() => setFlipped(false)}
                      onChange={(e) => {
                        setCard({ ...card, cvv: e.target.value.replace(/\D/g, "") });
                        setErrors({ ...errors, cvv: "" });
                      }}
                      className={errors.cvv ? "has-error" : ""}
                    />
                  </div>
                  {errors.cvv && <span className="pay-error">{errors.cvv}</span>}
                </div>
              </div>
            </div>

            <div className="pay-actions" style={{ marginTop: "18px" }}>
              <button className="pay-back-btn" onClick={() => setStep("method")}>
                <i className="bi bi-arrow-left"></i> Back
              </button>
              <button className="pay-pay-btn"
                style={{ background: `linear-gradient(130deg, ${course.accent}, #6366f1)` }}
                onClick={handleCardPay}>
                Confirm Payment &nbsp;<i className="bi bi-lock-fill"></i>
              </button>
            </div>
          </>
        )}

        {/* ╔══════════════════════════╗
            ║  STEP 3B — UPI Form     ║
            ╚══════════════════════════╝ */}
        {step === "upi" && (
          <>
            <div className="pay-header" style={{ marginBottom: "20px" }}>
              <h2 className="pay-title">UPI Payment</h2>
              <p className="pay-course-name">₹{course.price.toLocaleString()} · {course.title}</p>
            </div>

            {/* UPI app logos */}
            <div className="upi-apps-grid">
              {[
                { name: "Google Pay", short: "G Pay", color: "#4285F4", bg: "#4285F415", icon: "bi-google" },
                { name: "PhonePe",   short: "PhonePe", color: "#6739B7", bg: "#6739B715", icon: "bi-phone-fill" },
                { name: "Paytm",     short: "Paytm",   color: "#00BAF2", bg: "#00BAF215", icon: "bi-wallet2" },
                { name: "BHIM",      short: "BHIM",    color: "#00875A", bg: "#00875A15", icon: "bi-bank2" },
              ].map((app) => (
                <div className="upi-app-tile" key={app.name}
                  style={{ background: app.bg, borderColor: `${app.color}30` }}>
                  <div className="upi-app-icon-wrap" style={{ background: `${app.color}20` }}>
                    <i className={`bi ${app.icon}`} style={{ color: app.color }}></i>
                  </div>
                  <span style={{ color: app.color }}>{app.short}</span>
                </div>
              ))}
            </div>

            <div className="upi-or-divider">
              <span>Enter Your UPI ID</span>
            </div>

            <div className="pay-field">
              <label>UPI ID / VPA</label>
              <div className="pay-input-wrap">
                <i className="bi bi-at pay-input-icon"></i>
                <input type="text" placeholder="yourname@okaxis or 9876543210@ybl"
                  value={upiId}
                  onChange={(e) => { setUpiId(e.target.value); setErrors({ ...errors, upi: "" }); }}
                  className={errors.upi ? "has-error" : ""}
                />
                {upiId && /^[\w.\-]+@[\w]+$/.test(upiId) && (
                  <span className="upi-valid-tick"><i className="bi bi-check-circle-fill"></i></span>
                )}
              </div>
              {errors.upi && <span className="pay-error">{errors.upi}</span>}
              <p className="upi-hint">
                <i className="bi bi-info-circle"></i>
                &nbsp;Examples: name@paytm · 98765@gpay · name@oksbi
              </p>
            </div>

            <div className="upi-secure-badges">
              <span><i className="bi bi-shield-check" style={{ color: "#4ade80" }}></i> Secure Channel</span>
              <span><i className="bi bi-bank" style={{ color: "#60a5fa" }}></i> Verified Transfer</span>
              <span><i className="bi bi-lightning-charge" style={{ color: "#f7c948" }}></i> Instant Access</span>
            </div>

            <div className="pay-actions" style={{ marginTop: "20px" }}>
              <button className="pay-back-btn" onClick={() => setStep("method")}>
                <i className="bi bi-arrow-left"></i> Back
              </button>
              <button className="pay-pay-btn"
                style={{ background: "linear-gradient(130deg, #6739B7, #4285F4)" }}
                onClick={handleUpiPay}>
                Verify & Pay &nbsp;<i className="bi bi-arrow-right-circle"></i>
              </button>
            </div>
          </>
        )}

        {/* ── LOADING ── */}
        {step === "loading" && (
          <div className="pay-processing">
            <div className="payment-loader">
              <div className="rz-circle" style={{ borderTopColor: course.accent }}></div>
              <div className="rz-logo">
                <i className="bi bi-lock-fill" style={{ color: course.accent }}></i>
              </div>
            </div>
            <h3>Securing Enrollment…</h3>
            <p>Processing your request. Please do not close this window.</p>
            <div className="rz-steps">
              <span className="rz-step active">Request Received</span>
              <span className="rz-step active">Validating</span>
              <span className="rz-step">Finalizing Access</span>
            </div>
          </div>
        )}

        {/* ── SUCCESS ── */}
        {step === "success" && successData && (
          <div className="pay-success">
            <div className="success-icon">
              <i className="bi bi-check-circle-fill" style={{ color: "#4ade80" }}></i>
            </div>
            <h2>Enrollment Successful!</h2>
            <p>Welcome to <strong>{successData.course}</strong>!</p>
            <p className="success-sub">
              Confirmation sent to <strong>{successData.email}</strong>. Your course access is now activated.
            </p>
            <div className="success-details">
              <div><span>Student</span><strong>{successData.student}</strong></div>
              <div>
                <span>Amount Paid</span>
                <strong style={{ color: "#4ade80" }}>₹{successData.amount?.toLocaleString()}</strong>
              </div>
              <div>
                <span>Reference ID</span>
                <strong style={{ fontSize: "0.72rem", wordBreak: "break-all" }}>{successData.payment_id}</strong>
              </div>
            </div>
            <button className="pay-done-btn" onClick={onClose}>
              Go to Dashboard &nbsp;<i className="bi bi-arrow-right-circle"></i>
            </button>
          </div>
        )}

        {/* ── ERROR ── */}
        {step === "error" && (
          <div className="pay-error-screen">
            <div className="error-icon"><i className="bi bi-x-circle-fill"></i></div>
            <h3>Process Failed</h3>
            <p>{apiError || "An unexpected error occurred. Please try again."}</p>
            <button className="pay-retry-btn"
              onClick={() => { setStep("method"); setApiError(""); }}>
              <i className="bi bi-arrow-counterclockwise"></i> &nbsp;Try Again
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   COURSE CARD
   ══════════════════════════════════════════════════════════════════ */
function CourseCard({ course, onEnroll }) {
  const discount = Math.round(((course.originalPrice - course.price) / course.originalPrice) * 100);
  return (
    <div className="course-card" style={{ "--accent": course.accent }}>
      <div className="course-badge"
        style={{ background: `${course.badgeColor}22`, color: course.badgeColor, border: `1px solid ${course.badgeColor}44` }}>
        {course.badge}
      </div>
      <div className="course-icon-wrap"
        style={{ borderColor: `${course.accent}55`, background: `${course.accent}12` }}>
        <i className={course.icon} style={{ color: course.accent }}></i>
      </div>
      <h3 className="course-title">{course.title}</h3>
      <p className="course-desc">{course.description}</p>
      <ul className="course-topics">
        {course.topics.map((t) => (
          <li key={t}>
            <i className="bi bi-check2" style={{ color: course.accent }}></i> {t}
          </li>
        ))}
      </ul>
      <div className="course-meta">
        <span><i className="bi bi-clock"></i> {course.duration}</span>
        <span><i className="bi bi-play-circle"></i> {course.lessons} lessons</span>
        <span><i className="bi bi-bar-chart"></i> {course.level}</span>
      </div>
      <div className="course-footer">
        <div className="course-price">
          <span className="price-now">₹{course.price.toLocaleString()}</span>
          <span className="price-old">₹{course.originalPrice.toLocaleString()}</span>
          <span className="price-off" style={{ background: `${course.accent}22`, color: course.accent }}>
            {discount}% OFF
          </span>
        </div>
        <button className="enroll-btn"
          style={{ background: `linear-gradient(130deg, ${course.accent}, #6366f1)` }}
          onClick={() => onEnroll(course)}>
          Enroll Now <i className="bi bi-arrow-right"></i>
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN COURSES SECTION
   ══════════════════════════════════════════════════════════════════ */
const Courses = () => {
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courses, setCourses] = useState(fallbackCourses);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/courses/`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setCourses(data);
        }
      })
      .catch(err => console.error("Error fetching courses:", err))
      .finally(() => setLoading(false));
  }, []);

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
        <div style={{ textAlign: 'center', color: '#fff', padding: '50px 0' }}>
          Loading courses...
        </div>
      ) : (
        <div className="courses-grid">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} onEnroll={setSelectedCourse} />
          ))}
        </div>
      )}

      {selectedCourse && (
        <PaymentModal course={selectedCourse} onClose={() => setSelectedCourse(null)} />
      )}
    </section>
  );
};

export default Courses;
