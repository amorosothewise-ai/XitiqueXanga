
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { resendVerification } from '../services/authService';
import { Lock, Mail, User, ArrowRight, Loader2, Chrome, AlertCircle, Send, Hexagon, TrendingUp } from 'lucide-react';

const AuthScreen: React.FC = () => {
  const { login, loginWithGoogle, register } = useAuth();
  const { addToast } = useToast();
  
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [showResend, setShowResend] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setShowResend(false);

    try {
      if (isLogin) {
        await login(email, password);
        addToast('Welcome back!', 'success');
      } else {
        await register(name, email, password);
        addToast('Account created successfully!', 'success');
      }
    } catch (err: any) {
      console.error(err);
      if (err.message === 'CONFIRMATION_REQUIRED') {
         addToast('Success! Please check your email to verify your account.', 'info');
         setIsLogin(true);
      } else if (err.message === 'EMAIL_NOT_VERIFIED') {
         addToast('Email not verified. Please check your inbox.', 'error');
         setShowResend(true);
      } else if (err.message.includes('Invalid login credentials')) {
         addToast('Invalid email or password.', 'error');
      } else {
         addToast(err.message || 'Authentication failed. Please try again.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      await resendVerification(email);
      addToast('Verification email sent!', 'success');
      setShowResend(false);
    } catch (err: any) {
      addToast(err.message || 'Failed to resend email.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
        await loginWithGoogle();
        // Redirect usually happens before this toast is seen, but added for completeness
        addToast('Redirecting to Google...', 'success');
    } catch (err) {
        addToast('Google Sign-In failed. Please check configuration.', 'error');
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans bg-slate-50">
      
      {/* Left: Brand / Hero */}
      <div className="md:w-1/2 bg-slate-900 text-white p-8 md:p-16 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -ml-20 -mb-20"></div>
        
        <div className="relative z-10">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-cyan-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-emerald-900/30">
             <div className="relative flex items-center justify-center">
                <Hexagon size={40} className="text-white fill-emerald-500/20" strokeWidth={2.5} />
                <TrendingUp size={24} className="absolute text-white font-bold" />
             </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
            Xitique <span className="text-emerald-400">Xanga</span>
          </h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-md leading-relaxed">
            The smart, transparent way to manage your rotating savings circles with friends and family.
          </p>
        </div>

        <div className="relative z-10 mt-12 md:mt-0">
          <div className="flex gap-2 mb-4">
             <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
             <div className="w-2 h-2 rounded-full bg-slate-600"></div>
             <div className="w-2 h-2 rounded-full bg-slate-600"></div>
          </div>
          <p className="text-sm text-slate-500 font-medium uppercase tracking-widest">Trusted by Communities</p>
        </div>
      </div>

      {/* Right: Form */}
      <div className="md:w-1/2 flex items-center justify-center p-6 bg-white md:bg-transparent">
        <div className="w-full max-w-md space-y-8 bg-white md:p-10 rounded-3xl md:shadow-xl md:border border-slate-100">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-slate-500">
              {isLogin ? 'Enter your details to access your dashboard.' : 'Start your financial journey today.'}
            </p>
          </div>

          {showResend && (
             <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                   <AlertCircle size={16} /> Verification Required
                </div>
                <p className="text-xs text-amber-700">You must verify your email before logging in.</p>
                <button 
                  onClick={handleResend}
                  disabled={loading}
                  className="mt-1 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <Send size={12} /> Resend Verification Email
                </button>
             </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-slate-400"><User size={20} /></span>
                  <input 
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
                    placeholder="e.g. John Doe"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-slate-400"><Mail size={20} /></span>
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Password</label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-slate-400"><Lock size={20} /></span>
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <><Loader2 className="animate-spin" size={20} /> Processing...</>
              ) : (
                <>{isLogin ? 'Sign In' : 'Create Account'} <ArrowRight size={20} /></>
              )}
            </button>
          </form>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink-0 mx-4 text-slate-400 text-sm font-semibold">OR</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <button 
             onClick={handleGoogleLogin}
             disabled={loading}
             className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold py-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-3"
          >
             <Chrome size={20} className="text-emerald-500" />
             Continue with Google
          </button>

          <div className="text-center pt-4 border-t border-slate-100">
             <p className="text-slate-500 text-sm">
               {isLogin ? "Don't have an account? " : "Already have an account? "}
               <button 
                onClick={() => {
                   setIsLogin(!isLogin);
                   setShowResend(false);
                }}
                className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
               >
                 {isLogin ? 'Sign Up' : 'Log In'}
               </button>
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
