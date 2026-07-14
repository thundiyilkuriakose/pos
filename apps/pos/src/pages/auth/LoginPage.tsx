import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useAuthStore } from '../../stores/auth.store.ts';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      login(user.email || email, 'manager');
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Firebase Auth Error:', err);
      let message = 'Invalid email or password.';
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential'
      ) {
        message = 'Invalid email or password.';
      } else if (err.code === 'auth/too-many-requests') {
        message = 'Access temporarily disabled due to too many failed attempts. Please try again later.';
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.formContainer}>
      <h2 style={styles.title}>Welcome Back</h2>
      <p style={styles.subtitle}>Sign in to manage your outlet operations.</p>
      
      {error && <div style={styles.errorBanner}>{error}</div>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="manager@outlet.com"
            style={styles.input}
            required
          />
        </div>

        <div style={styles.inputGroup}>
          <div style={styles.pwdLabelWrapper}>
            <label style={styles.label}>Password</label>
            <a href="#forgot" style={styles.forgotLink}>Forgot?</a>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={styles.input}
            required
          />
        </div>

        <button type="submit" disabled={loading} style={styles.submitBtn}>
          {loading ? 'Authenticating...' : 'Sign In'}
        </button>
      </form>

      <p style={styles.footerNote}>
        Don't have a business account? <Link to="/signup" style={styles.footerLink}>Register here</Link>
      </p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  formContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '28px',
    fontWeight: 700,
    color: 'var(--color-text)',
    marginBottom: 'var(--space-xs)',
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--color-text-muted)',
    marginBottom: 'var(--space-xl)',
  },
  errorBanner: {
    backgroundColor: 'var(--color-danger-light)',
    color: 'var(--color-danger)',
    border: '1px solid var(--color-danger)',
    padding: 'var(--space-sm)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '14px',
    marginBottom: 'var(--space-md)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-md)',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-xs)',
  },
  pwdLabelWrapper: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--color-text)',
  },
  forgotLink: {
    fontSize: '13px',
    color: 'var(--color-primary)',
    textDecoration: 'none',
    fontWeight: 500,
  },
  input: {
    fontSize: '15px',
    padding: '10px 14px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    outline: 'none',
    fontFamily: 'var(--font-body)',
  },
  submitBtn: {
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: '15px',
    color: 'var(--color-accent-text)',
    backgroundColor: 'var(--color-accent)',
    border: 'none',
    padding: '12px',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-sm)',
    marginTop: 'var(--space-sm)',
    transition: 'all var(--transition-fast)',
  },
  footerNote: {
    fontSize: '14px',
    color: 'var(--color-text-muted)',
    marginTop: 'var(--space-xl)',
    textAlign: 'center',
  },
  footerLink: {
    color: 'var(--color-primary)',
    textDecoration: 'none',
    fontWeight: 600,
  },
};
