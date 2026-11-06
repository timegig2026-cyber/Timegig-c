import React, { useState } from 'react';
import {
  Globe,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  FileText,
  Shield,
  ArrowRight
} from 'lucide-react';

export interface UserAccount {
  email: string;
  name: string;
  password?: string;
  acceptedTermsAt: number;
}

interface AuthScreenProps {
  onLoginSuccess: (user: UserAccount) => void;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState<boolean>(true);

  // Form Fields
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [acceptTerms, setAcceptTerms] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);

  // Helper to get registered users from localStorage
  const getRegisteredUsers = (): Record<string, UserAccount & { passwordHash: string }> => {
    try {
      const data = localStorage.getItem('worldmap_registered_users');
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPass = password.trim();

    if (!trimmedEmail || !trimmedPass) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setErrorMessage('Please provide a valid email address.');
      return;
    }

    if (trimmedPass.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (!acceptTerms) {
      setErrorMessage('You must accept the Terms and Conditions to proceed.');
      return;
    }

    const users = getRegisteredUsers();
    if (users[trimmedEmail]) {
      setErrorMessage('An account with this email already exists. Please log in.');
      return;
    }

    // Save registered user
    const newUser = {
      email: trimmedEmail,
      name: name.trim() || trimmedEmail.split('@')[0],
      passwordHash: trimmedPass, // Simple storage for template demonstration
      acceptedTermsAt: Date.now(),
    };

    users[trimmedEmail] = newUser;
    localStorage.setItem('worldmap_registered_users', JSON.stringify(users));

    if (rememberMe) {
      localStorage.setItem('worldmap_active_session', JSON.stringify({
        email: newUser.email,
        name: newUser.name,
        acceptedTermsAt: newUser.acceptedTermsAt,
      }));
    }

    onLoginSuccess({
      email: newUser.email,
      name: newUser.name,
      acceptedTermsAt: newUser.acceptedTermsAt,
    });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPass = password.trim();

    if (!trimmedEmail || !trimmedPass) {
      setErrorMessage('Please enter your email and password.');
      return;
    }

    const users = getRegisteredUsers();
    const existing = users[trimmedEmail];

    if (!existing) {
      setErrorMessage('No registered user found with this email. Please sign up first.');
      return;
    }

    if (existing.passwordHash !== trimmedPass) {
      setErrorMessage('Incorrect password. Please try again.');
      return;
    }

    if (rememberMe) {
      localStorage.setItem('worldmap_active_session', JSON.stringify({
        email: existing.email,
        name: existing.name,
        acceptedTermsAt: existing.acceptedTermsAt,
      }));
    }

    onLoginSuccess({
      email: existing.email,
      name: existing.name,
      acceptedTermsAt: existing.acceptedTermsAt,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md select-none font-sans overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Header */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-6 pt-7 pb-6 text-white text-center relative overflow-hidden">
          <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Globe className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-black tracking-tight">World Map Network</h1>
          <p className="text-xs text-blue-100 mt-1">
            Sign in to access world map GPS, subscriptions, and tenant features
          </p>

          {/* Toggle Tab Bar: Sign Up / Log In */}
          <div className="mt-5 p-1 bg-black/20 rounded-xl flex items-center max-w-xs mx-auto">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setErrorMessage(null);
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isSignUp ? 'bg-white text-blue-700 shadow-sm' : 'text-blue-100 hover:text-white'
              }`}
            >
              Sign Up
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setErrorMessage(null);
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                !isSignUp ? 'bg-white text-blue-700 shadow-sm' : 'text-blue-100 hover:text-white'
              }`}
            >
              Log In
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-3.5">
            {/* Name field for Sign Up */}
            {isSignUp && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Full Name
                </label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-slate-400 absolute left-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-800"
                  />
                </div>
              </div>
            )}

            {/* Email field */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-800"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignUp ? 'At least 6 characters' : 'Enter your password'}
                  className="w-full pl-9 pr-9 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Terms & Conditions Checkbox (Required for Sign Up) */}
            {isSignUp ? (
              <div className="pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-[11px] text-slate-600 leading-tight">
                    I accept the{' '}
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="text-blue-600 hover:underline font-semibold"
                    >
                      Terms and Conditions
                    </button>{' '}
                    and Privacy Policy.
                  </span>
                </label>
              </div>
            ) : (
              /* Remember Me option for Login */
              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-blue-600 border-slate-300"
                  />
                  <span className="text-[11px] text-slate-600">Remember my login</span>
                </label>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full mt-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-1.5 active:scale-98"
            >
              <span>{isSignUp ? 'Create Account & Continue' : 'Log In to App'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Bottom Switch text */}
          <div className="mt-4 pt-3 border-t border-slate-100 text-center text-xs text-slate-500">
            {isSignUp ? (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(false);
                    setErrorMessage(null);
                  }}
                  className="text-blue-600 font-bold hover:underline"
                >
                  Log In
                </button>
              </p>
            ) : (
              <p>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(true);
                    setErrorMessage(null);
                  }}
                  className="text-blue-600 font-bold hover:underline"
                >
                  Sign Up
                </button>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Terms and Conditions Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Terms and Conditions</span>
            </div>
            <div className="text-xs text-slate-600 space-y-2 max-h-56 overflow-y-auto pr-1 leading-relaxed">
              <p>
                1. <strong>Map & Geolocation</strong>: By using this application, you agree to allow geolocation detection to locate your position on OpenStreetMap.
              </p>
              <p>
                2. <strong>Tenant & User Subscriptions</strong>: Subscriptions provide real-time verified boundaries and personalized GPS telemetry. All submitted verification materials are kept strictly private.
              </p>
              <p>
                3. <strong>Data Privacy</strong>: Your credentials and biometric verification are stored securely and never shared with third parties.
              </p>
            </div>
            <button
              onClick={() => {
                setAcceptTerms(true);
                setShowTermsModal(false);
              }}
              className="mt-4 w-full py-2 bg-blue-600 text-white text-xs font-bold rounded-xl"
            >
              I Understand & Accept
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
