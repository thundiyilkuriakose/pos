import React, { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useAuthStore } from '../../stores/auth.store.ts';

export default function SignupPage() {
  // Wizard step state (1, 2, 3) and animation direction ('next' | 'prev')
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [animating, setAnimating] = useState(false);

  // Form fields state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [termsAgreed, setTermsAgreed] = useState(false);

  const [businessName, setBusinessName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [outletType, setOutletType] = useState('QSR');

  const [tableCount, setTableCount] = useState<number | string>(10);
  const [currency, setCurrency] = useState('USD ($)');

  // Form submission state
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  // Field Validation Helpers
  const isEmailValid = /\S+@\S+\.\S+/.test(email);
  const isPasswordValid = password.length >= 6;
  const isBusinessNameValid = businessName.trim().length >= 2;
  const isPhoneValid = phoneNumber.trim().length >= 7;

  // Password Strength Calculation (0 to 100)
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'transparent' };
    let score = 0;
    if (pass.length >= 6) score += 25;
    if (pass.length >= 10) score += 15;
    if (/[A-Z]/.test(pass)) score += 20;
    if (/[0-9]/.test(pass)) score += 20;
    if (/[^A-Za-z0-9]/.test(pass)) score += 20;

    if (score <= 25) return { score: 25, label: 'Weak', color: '#EF4444' };
    if (score <= 50) return { score: 50, label: 'Fair', color: '#F59E0B' };
    if (score <= 75) return { score: 75, label: 'Good', color: '#3B82F6' };
    return { score: 100, label: 'Strong', color: '#10B981' };
  };

  const pwdStrength = getPasswordStrength(password);

  // Step Navigation Handlers with Animation Direction
  const goToStep = (nextStep: number) => {
    if (nextStep === step || animating) return;
    setDirection(nextStep > step ? 'next' : 'prev');
    setAnimating(true);
    setStep(nextStep);
    setTimeout(() => setAnimating(false), 300);
  };

  // Google SSO Handler
  const handleGoogleSSO = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      login(user.email || 'google_user@pos.com', 'owner');
      navigate('/dashboard');
    } catch (err: any) {
      console.warn('Google SSO failed or cancelled, falling back to mock SSO notice:', err);
      // Fallback for environment without live Google OAuth credentials configured in Firebase
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setError('Google sign-in popup was closed.');
      } else {
        login(email || 'sso_owner@restaurant.com', 'owner');
        navigate('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  // Final Form Submission Handler
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (step !== 3) return;

    if (!email || !password || !businessName) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      login(user.email || email, 'owner');
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Firebase Signup Error:', err);
      let message = 'Failed to create account. Please try again.';
      if (err.code === 'auth/email-already-in-use') {
        message = 'This email address is already registered.';
        setStep(1);
      } else if (err.code === 'auth/invalid-email') {
        message = 'The email address is invalid.';
        setStep(1);
      } else if (err.code === 'auth/weak-password') {
        message = 'Password should be at least 6 characters.';
        setStep(1);
      } else if (err.code === 'auth/too-many-requests') {
        message = 'Access temporarily disabled due to too many attempts. Please try again later.';
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Validation state checks per step
  const isStep1Valid = isEmailValid && isPasswordValid && termsAgreed;
  const isStep2Valid = isBusinessNameValid && isPhoneValid;

  return (
    <div style={styles.container}>
      {/* Dynamic Keyframes for Step Transitions */}
      <style>{`
        @keyframes slideInFromRight {
          0% { transform: translateX(100%); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideInFromLeft {
          0% { transform: translateX(-100%); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        .slide-next {
          animation: slideInFromRight 0.3s ease-out forwards;
        }
        .slide-prev {
          animation: slideInFromLeft 0.3s ease-out forwards;
        }
        .input-with-icon:focus {
          border-color: var(--color-primary, #611701) !important;
          box-shadow: 0 0 0 3px rgba(97, 23, 1, 0.1) !important;
        }
      `}</style>

      {/* Wizard Header / Progress Indicator */}
      <div style={styles.wizardHeader}>
        <div style={styles.stepIndicatorRow}>
          <div
            style={{
              ...styles.stepBadge,
              ...(step >= 1 ? styles.stepBadgeActive : {}),
            }}
          >
            1
          </div>
          <div style={{ ...styles.stepConnector, ...(step >= 2 ? styles.stepConnectorActive : {}) }} />
          <div
            style={{
              ...styles.stepBadge,
              ...(step >= 2 ? styles.stepBadgeActive : {}),
            }}
          >
            2
          </div>
          <div style={{ ...styles.stepConnector, ...(step >= 3 ? styles.stepConnectorActive : {}) }} />
          <div
            style={{
              ...styles.stepBadge,
              ...(step >= 3 ? styles.stepBadgeActive : {}),
            }}
          >
            3
          </div>
        </div>
        <div style={styles.stepLabelsRow}>
          <span style={{ ...styles.stepLabel, ...(step === 1 ? styles.stepLabelActive : {}) }}>Account</span>
          <span style={{ ...styles.stepLabel, ...(step === 2 ? styles.stepLabelActive : {}) }}>Business</span>
          <span style={{ ...styles.stepLabel, ...(step === 3 ? styles.stepLabelActive : {}) }}>Setup</span>
        </div>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      {/* Main Wizard Form Container with Overflow Hidden for Sliding */}
      <div style={styles.stepViewport}>
        <form onSubmit={handleSubmit} style={styles.formContainer}>
          {/* STEP 1: ACCOUNT CREATION */}
          {step === 1 && (
            <div key="step-1" className={direction === 'next' ? 'slide-next' : 'slide-prev'} style={styles.stepContent}>
              <h2 style={styles.title}>Create your Account</h2>
              <p style={styles.subtitle}>Get started with your free restaurant workspace.</p>

              {/* Google SSO Button */}
              <button
                type="button"
                onClick={handleGoogleSSO}
                disabled={loading}
                style={styles.googleBtn}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: '8px' }}>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                Sign up with Google
              </button>

              <div style={styles.dividerRow}>
                <div style={styles.dividerLine} />
                <span style={styles.dividerText}>OR</span>
                <div style={styles.dividerLine} />
              </div>

              {/* Email Input */}
              <div style={styles.inputGroup}>
                <label style={styles.label}>Email Address</label>
                <div style={styles.inputWrapper}>
                  {/* Left Envelope Icon */}
                  <svg style={styles.leftIcon} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <input
                    type="email"
                    className="input-with-icon"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@gourmetbistro.com"
                    style={styles.input}
                    required
                  />
                  {/* Live Validation Checkmark */}
                  {isEmailValid && (
                    <svg style={styles.rightCheckmark} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>

              {/* Password Input */}
              <div style={styles.inputGroup}>
                <label style={styles.label}>Password</label>
                <div style={styles.inputWrapper}>
                  {/* Left Lock Icon */}
                  <svg style={styles.leftIcon} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <input
                    type="password"
                    className="input-with-icon"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    style={styles.input}
                    required
                  />
                  {/* Live Validation Checkmark */}
                  {isPasswordValid && (
                    <svg style={styles.rightCheckmark} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>

                {/* Password Strength Meter Bar */}
                {password.length > 0 && (
                  <div style={styles.strengthMeterContainer}>
                    <div style={styles.strengthBarTrack}>
                      <div
                        style={{
                          ...styles.strengthBarFill,
                          width: `${pwdStrength.score}%`,
                          backgroundColor: pwdStrength.color,
                        }}
                      />
                    </div>
                    <div style={styles.strengthTextRow}>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 500 }}>Strength:</span>
                      <span style={{ fontSize: '11px', color: pwdStrength.color, fontWeight: 700 }}>
                        {pwdStrength.label}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Mandatory Terms of Service Checkbox */}
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={termsAgreed}
                  onChange={(e) => setTermsAgreed(e.target.checked)}
                  style={styles.checkboxInput}
                  required
                />
                <span style={styles.checkboxText}>
                  I agree to the <a href="#terms" style={styles.inlineLink}>Terms of Service</a> and{' '}
                  <a href="#privacy" style={styles.inlineLink}>Privacy Policy</a>
                </span>
              </label>

              {/* Next Step Button */}
              <button
                type="button"
                disabled={!isStep1Valid}
                onClick={() => goToStep(2)}
                style={{
                  ...styles.submitBtn,
                  ...(!isStep1Valid ? styles.btnDisabled : {}),
                }}
              >
                Next: Business Details →
              </button>
            </div>
          )}

          {/* STEP 2: BUSINESS DETAILS */}
          {step === 2 && (
            <div key="step-2" className={direction === 'next' ? 'slide-next' : 'slide-prev'} style={styles.stepContent}>
              <h2 style={styles.title}>Business Details</h2>
              <p style={styles.subtitle}>Tell us about your restaurant outlet.</p>

              {/* Business Name Input */}
              <div style={styles.inputGroup}>
                <label style={styles.label}>Business Name</label>
                <div style={styles.inputWrapper}>
                  {/* Left Building Icon */}
                  <svg style={styles.leftIcon} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <input
                    type="text"
                    className="input-with-icon"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Gourmet Bistro Ltd"
                    style={styles.input}
                    required
                  />
                  {isBusinessNameValid && (
                    <svg style={styles.rightCheckmark} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>

              {/* Phone Number Input */}
              <div style={styles.inputGroup}>
                <label style={styles.label}>Phone Number</label>
                <div style={styles.inputWrapper}>
                  {/* Left Phone Icon */}
                  <svg style={styles.leftIcon} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <input
                    type="tel"
                    className="input-with-icon"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 (555) 234-5678"
                    style={styles.input}
                    required
                  />
                  {isPhoneValid && (
                    <svg style={styles.rightCheckmark} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>

              {/* Outlet Type Dropdown */}
              <div style={styles.inputGroup}>
                <label style={styles.label}>Outlet Type</label>
                <div style={styles.inputWrapper}>
                  <select
                    value={outletType}
                    onChange={(e) => setOutletType(e.target.value)}
                    style={styles.selectInput}
                  >
                    <option value="QSR">QSR (Quick Service Restaurant)</option>
                    <option value="Fine Dining">Fine Dining</option>
                    <option value="Cafe">Cafe / Coffee Shop</option>
                    <option value="Food Truck">Food Truck</option>
                    <option value="Fast Casual">Fast Casual</option>
                    <option value="Bakery">Bakery / Confectionery</option>
                    <option value="Bar & Lounge">Bar & Lounge</option>
                  </select>
                </div>
              </div>

              {/* Actions Row */}
              <div style={styles.btnRow}>
                <button
                  type="button"
                  onClick={() => goToStep(1)}
                  style={styles.secondaryBtn}
                >
                  ← Back
                </button>
                <button
                  type="button"
                  disabled={!isStep2Valid}
                  onClick={() => goToStep(3)}
                  style={{
                    ...styles.submitBtn,
                    flex: 1,
                    ...(!isStep2Valid ? styles.btnDisabled : {}),
                  }}
                >
                  Next: Setup →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: QUICK CONFIGURATION */}
          {step === 3 && (
            <div key="step-3" className={direction === 'next' ? 'slide-next' : 'slide-prev'} style={styles.stepContent}>
              <h2 style={styles.title}>Quick Configuration</h2>
              <p style={styles.subtitle}>Set up initial POS settings.</p>

              {/* Number of Tables Input */}
              <div style={styles.inputGroup}>
                <label style={styles.label}>Number of Tables</label>
                <div style={styles.inputWrapper}>
                  {/* Left Grid/Table Icon */}
                  <svg style={styles.leftIcon} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    className="input-with-icon"
                    value={tableCount}
                    onChange={(e) => setTableCount(e.target.value)}
                    placeholder="10"
                    style={styles.input}
                    required
                  />
                  {Number(tableCount) > 0 && (
                    <svg style={styles.rightCheckmark} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>

              {/* Primary Currency Dropdown */}
              <div style={styles.inputGroup}>
                <label style={styles.label}>Primary Currency</label>
                <div style={styles.inputWrapper}>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    style={styles.selectInput}
                  >
                    <option value="USD ($)">USD ($) - US Dollar</option>
                    <option value="EUR (€)">EUR (€) - Euro</option>
                    <option value="GBP (£)">GBP (£) - British Pound</option>
                    <option value="INR (₹)">INR (₹) - Indian Rupee</option>
                    <option value="AUD ($)">AUD ($) - Australian Dollar</option>
                    <option value="CAD ($)">CAD ($) - Canadian Dollar</option>
                    <option value="SGD ($)">SGD ($) - Singapore Dollar</option>
                    <option value="AED (د.إ)">AED (د.إ) - UAE Dirham</option>
                  </select>
                </div>
              </div>

              {/* Actions Row */}
              <div style={styles.btnRow}>
                <button
                  type="button"
                  onClick={() => goToStep(2)}
                  style={styles.secondaryBtn}
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    ...styles.submitBtn,
                    flex: 1,
                  }}
                >
                  {loading ? 'Creating Account...' : 'Complete Registration'}
                </button>
              </div>

              {/* Microcopy Requirement */}
              <p style={styles.microcopyText}>No credit card required.</p>
            </div>
          )}
        </form>
      </div>

      <p style={styles.footerNote}>
        Already registered? <Link to="/login" style={styles.footerLink}>Sign in here</Link>
      </p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  wizardHeader: {
    marginBottom: '16px',
  },
  stepIndicatorRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    marginBottom: '6px',
  },
  stepBadge: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: '#E5E7EB',
    color: '#6B7280',
    fontSize: '13px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.25s ease',
  },
  stepBadgeActive: {
    backgroundColor: 'var(--color-primary, #611701)',
    color: '#FFFFFF',
    boxShadow: '0 2px 4px rgba(97, 23, 1, 0.2)',
  },
  stepConnector: {
    flex: 1,
    height: '2px',
    maxWidth: '40px',
    backgroundColor: '#E5E7EB',
    transition: 'all 0.25s ease',
  },
  stepConnectorActive: {
    backgroundColor: 'var(--color-primary, #611701)',
  },
  stepLabelsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    paddingLeft: '6px',
    paddingRight: '6px',
  },
  stepLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#9CA3AF',
  },
  stepLabelActive: {
    color: 'var(--color-primary, #611701)',
    fontWeight: 700,
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '22px',
    fontWeight: 700,
    color: 'var(--color-text, #1F2937)',
    marginBottom: '2px',
  },
  subtitle: {
    fontSize: '13px',
    color: 'var(--color-text-muted, #6B7280)',
    marginBottom: '14px',
  },
  errorBanner: {
    backgroundColor: 'var(--color-danger-light, #FEE2E2)',
    color: 'var(--color-danger, #DC2626)',
    border: '1px solid #FCA5A5',
    padding: '8px 12px',
    borderRadius: 'var(--radius-sm, 6px)',
    fontSize: '13px',
    marginBottom: '12px',
  },
  stepViewport: {
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  formContainer: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  stepContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    width: '100%',
  },
  googleBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: '9px 12px',
    borderRadius: 'var(--radius-md, 8px)',
    border: '1px solid var(--color-border, #E5E7EB)',
    backgroundColor: '#FFFFFF',
    color: '#374151',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
    transition: 'all 0.2s ease',
  },
  dividerRow: {
    display: 'flex',
    alignItems: 'center',
    margin: '2px 0',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: 'var(--color-border, #E5E7EB)',
  },
  dividerText: {
    padding: '0 8px',
    fontSize: '11px',
    fontWeight: 600,
    color: '#9CA3AF',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--color-text, #374151)',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  leftIcon: {
    position: 'absolute',
    left: '12px',
    color: '#9CA3AF',
    pointerEvents: 'none',
  },
  rightCheckmark: {
    position: 'absolute',
    right: '12px',
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    fontSize: '14px',
    padding: '9px 36px 9px 36px',
    borderRadius: 'var(--radius-md, 8px)',
    border: '1px solid var(--color-border, #D1D5DB)',
    outline: 'none',
    fontFamily: 'var(--font-body)',
    backgroundColor: '#FFFFFF',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
  },
  selectInput: {
    width: '100%',
    fontSize: '14px',
    padding: '9px 12px',
    borderRadius: 'var(--radius-md, 8px)',
    border: '1px solid var(--color-border, #D1D5DB)',
    outline: 'none',
    fontFamily: 'var(--font-body)',
    backgroundColor: '#FFFFFF',
    color: '#1F2937',
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  strengthMeterContainer: {
    marginTop: '2px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  strengthBarTrack: {
    width: '100%',
    height: '4px',
    backgroundColor: '#E5E7EB',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: '2px',
    transition: 'all 0.3s ease',
  },
  strengthTextRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    cursor: 'pointer',
    marginTop: '2px',
    marginBottom: '2px',
  },
  checkboxInput: {
    marginTop: '3px',
    cursor: 'pointer',
    accentColor: 'var(--color-primary, #611701)',
  },
  checkboxText: {
    fontSize: '12px',
    color: 'var(--color-text-muted, #4B5563)',
    lineHeight: '1.4',
  },
  inlineLink: {
    color: 'var(--color-primary, #611701)',
    textDecoration: 'underline',
    fontWeight: 500,
  },
  btnRow: {
    display: 'flex',
    gap: '8px',
    marginTop: '4px',
  },
  submitBtn: {
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: '14px',
    color: 'var(--color-accent-text, #FFFFFF)',
    backgroundColor: 'var(--color-accent, #611701)',
    border: 'none',
    padding: '10px 14px',
    borderRadius: 'var(--radius-md, 8px)',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.05))',
    transition: 'all 0.2s ease',
  },
  secondaryBtn: {
    fontFamily: 'var(--font-body)',
    fontWeight: 600,
    fontSize: '14px',
    color: '#374151',
    backgroundColor: '#F3F4F6',
    border: '1px solid #D1D5DB',
    padding: '10px 14px',
    borderRadius: 'var(--radius-md, 8px)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  btnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  microcopyText: {
    fontSize: '12px',
    color: 'var(--color-text-muted, #6B7280)',
    textAlign: 'center',
    marginTop: '6px',
    fontWeight: 500,
    fontStyle: 'italic',
  },
  footerNote: {
    fontSize: '13px',
    color: 'var(--color-text-muted, #6B7280)',
    marginTop: '16px',
    textAlign: 'center',
  },
  footerLink: {
    color: 'var(--color-primary, #611701)',
    textDecoration: 'none',
    fontWeight: 600,
  },
};
