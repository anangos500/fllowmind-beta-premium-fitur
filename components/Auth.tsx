

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import EyeIcon from './icons/EyeIcon';
import EyeOffIcon from './icons/EyeOffIcon';
import CheckIcon from './icons/CheckIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';

type AuthView = 'login' | 'signup' | 'forgotPassword' | 'updatePassword';

interface AuthPopoverProps {
  initialView: 'login' | 'signup';
  onClose: () => void;
}

const SignupSuccessPopup: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  const handleClose = () => {
    setIsAnimatingOut(true);
    setTimeout(onClose, 300);
  };

  return (
    <div className={`fixed inset-0 bg-black flex justify-center items-center z-[60] p-4 transition-opacity duration-300 ${isAnimatingOut ? 'bg-opacity-0' : 'bg-opacity-50'}`}>
      <div className={`bg-white rounded-3xl shadow-2xl w-full max-w-sm transition-all duration-300 ease-out text-center p-8 ${isAnimatingOut ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircleIcon className="w-10 h-10 text-green-600" />
            </div>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-3">Pendaftaran Berhasil!</h2>
        <p className="text-slate-600 mb-6">
          Luar biasa! Tinggal satu langkah lagi. Cek email Anda untuk memverifikasi akun dan mulai produktif!
        </p>
        <button
            onClick={handleClose}
            className="w-full px-4 py-3 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
            Oke, Saya Mengerti
        </button>
      </div>
    </div>
  );
};


const Auth: React.FC<AuthPopoverProps> = ({ initialView, onClose }) => {
  const [view, setView] = useState<AuthView>(initialView);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [updatePasswordSuccess, setUpdatePasswordSuccess] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showSignupSuccess, setShowSignupSuccess] = useState(false);
  
  const { 
    signInWithPassword, 
    signUp, 
    signOut,
    resetPasswordForEmail, 
    isPasswordRecovery, 
    updateUserPassword,
    clearPasswordRecoveryFlag
  } = useAuth();

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  useEffect(() => {
    if (isPasswordRecovery) {
      setView('updatePassword');
    } else {
      setView(initialView); // Sync view if initialView changes
    }
  }, [isPasswordRecovery, initialView]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200); // Animation duration
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await signInWithPassword(email, password);
      if (error) throw error;
      // onClose will be called by the parent component upon session change
    } catch (err: any) {
      setError(err.error_description || err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const { error } = await signUp(email, password, username);
      if (error) throw error;
      setShowSignupSuccess(true);
      setEmail('');
      setPassword('');
      setUsername('');
    } catch (err: any)      {
      setError(err.error_description || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const { error } = await resetPasswordForEmail(email);
      if (error) throw error;
      setForgotPasswordSuccess(true);
      setMessage('Jika email terdaftar, tautan untuk mereset password telah dikirim ke kotak masuk Anda.');
    } catch (err: any) {
      setError(err.error_description || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasMinLength || !hasUppercase || !hasNumber) {
      setError("Password tidak memenuhi persyaratan keamanan.");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const { error } = await updateUserPassword(password);
      if (error) throw error;
      setUpdatePasswordSuccess(true);
      setMessage("Password Anda berhasil diperbarui. Silakan kembali ke halaman masuk untuk login.");
    } catch (err: any) {
      setError(err.error_description || err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchView = (newView: AuthView) => {
    setView(newView);
    setError(null);
    setMessage(null);
    setPassword('');
    setForgotPasswordSuccess(false);
    setUpdatePasswordSuccess(false);
    if (newView !== 'forgotPassword') {
        setEmail('');
    }
    if (newView === 'signup') {
        setUsername('');
    }
  };
  
  const hasUppercase = /[A-Z]/.test(password);
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);

  const renderPasswordValidation = () => (
    <div className="space-y-1 mt-3 text-xs">
      <p className={`flex items-center transition-colors ${hasMinLength ? 'text-green-600' : 'text-slate-500'}`}>
        <CheckIcon className="w-3.5 h-3.5 mr-2" />
        Minimal 8 karakter
      </p>
      <p className={`flex items-center transition-colors ${hasUppercase ? 'text-green-600' : 'text-slate-500'}`}>
        <CheckIcon className="w-3.5 h-3.5 mr-2" />
        Minimal 1 huruf besar
      </p>
      <p className={`flex items-center transition-colors ${hasNumber ? 'text-green-600' : 'text-slate-500'}`}>
        <CheckIcon className="w-3.5 h-3.5 mr-2" />
        Minimal 1 angka
      </p>
    </div>
  );

  return (
    <div 
      className={`fixed inset-0 z-50 flex justify-center items-center p-4`}
    >
      {/* Overlay for mobile, and click-outside catcher for desktop */}
      <div 
        className="fixed inset-0 bg-black/20"
        onClick={handleClose}
      ></div>

      {/* Modal Content */}
      <div 
        className={`light relative bg-white rounded-2xl shadow-2xl w-full max-w-sm transition-all duration-200 ease-out ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="relative p-8">
          {view === 'login' && (
            <>
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold text-slate-800">Selamat Datang Kembali</h2>
                <p className="text-slate-500 mt-1">Masuk untuk melanjutkan</p>
              </div>
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="email">Alamat Email</label>
                  <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3 bg-slate-100 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="password">Password</label>
                  <div className="relative"><input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-3 pr-10 bg-slate-100 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">{showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}</button></div>
                </div>
                {error && <p className="text-red-500 text-sm text-center pt-2">{error}</p>}
                {message && <p className="text-green-500 text-sm text-center pt-2">{message}</p>}
                <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-300 disabled:bg-slate-400">{loading ? 'Memproses...' : 'Masuk'}</button>
              </form>
              <div className="text-center mt-6">
                <button onClick={() => switchView('forgotPassword')} className="text-sm font-semibold text-slate-500 hover:underline">Lupa password?</button>
              </div>
            </>
          )}
          
          {view === 'signup' && (
             <>
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold text-slate-800">Buat Akun Baru</h2>
                <p className="text-slate-500 mt-1">Mulai atur tugas Anda</p>
              </div>
              {error && <p className="text-red-500 text-sm text-center pb-4 -mt-2">{error}</p>}
              <form onSubmit={handleSignupSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="username">Nama Lengkap</label>
                  <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required className="w-full px-4 py-3 bg-slate-100 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="email">Alamat Email</label>
                  <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3 bg-slate-100 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="password">Password</label>
                  <div className="relative"><input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-3 pr-10 bg-slate-100 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">{showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}</button></div>
                  {password.length > 0 && renderPasswordValidation()}
                </div>
                <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-300 disabled:bg-slate-400">{loading ? 'Memproses...' : 'Daftar'}</button>
              </form>
            </>
          )}

          {view === 'forgotPassword' && (
            <>
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold text-slate-800">Reset Password</h2>
                <p className="text-slate-500 mt-1">
                    {forgotPasswordSuccess ? 'Tautan Terkirim!' : 'Masukkan email Anda untuk menerima tautan reset.'}
                </p>
              </div>
              {forgotPasswordSuccess ? (
                <div className="text-center">
                    <p className="text-green-600 text-sm mb-6">{message}</p>
                    <button onClick={() => switchView('login')} className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-300">Kembali ke Login</button>
                </div>
              ) : (
                <>
                    <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                        <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="email">Alamat Email</label>
                        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3 bg-slate-100 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-300 disabled:bg-slate-400">{loading ? 'Mengirim...' : 'Kirim Tautan'}</button>
                    </form>
                </>
              )}
            </>
          )}

          {view === 'updatePassword' && (
            <>
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold text-slate-800">Buat Password Baru</h2>
                <p className="text-slate-500 mt-1">
                    {updatePasswordSuccess ? 'Berhasil!' : 'Masukkan password baru yang aman.'}
                </p>
              </div>
              {updatePasswordSuccess ? (
                <div className="text-center">
                    <p className="text-green-600 text-sm mb-6">{message}</p>
                    <button 
                        onClick={async () => {
                            await signOut();
                            clearPasswordRecoveryFlag();
                            switchView('login');
                        }} 
                        className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-300"
                    >
                        Lanjutkan ke Login
                    </button>
                </div>
              ) : (
                <form onSubmit={handleUpdatePasswordSubmit} className="space-y-4">
                    <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="password">Password Baru</label>
                    <div className="relative"><input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-3 pr-10 bg-slate-100 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">{showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}</button></div>
                    {password.length > 0 && renderPasswordValidation()}
                    </div>
                    {error && <p className="text-red-500 text-sm text-center pt-2">{error}</p>}
                    <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-300 disabled:bg-slate-400">{loading ? 'Memperbarui...' : 'Perbarui Password'}</button>
                </form>
              )}
            </>
          )}

            <div className="mt-8 pt-4 border-t border-slate-200 text-center">
            {view === 'login' && (
                <p className="text-sm text-slate-600">
                Belum punya akun?{' '}
                <button onClick={() => switchView('signup')} className="font-semibold text-blue-600 hover:underline">
                    Daftar
                </button>
                </p>
            )}
             {view === 'signup' && (
                <p className="text-sm text-slate-600">
                Sudah punya akun?{' '}
                <button onClick={() => switchView('login')} className="font-semibold text-blue-600 hover:underline">
                    Masuk
                </button>
                </p>
            )}
            {(view === 'forgotPassword' || view === 'updatePassword') && (
                 <p className="text-sm text-slate-600">
                 Ingat password Anda?{' '}
                 <button onClick={() => switchView('login')} className="font-semibold text-blue-600 hover:underline">
                     Masuk
                 </button>
                 </p>
            )}
            </div>
        </div>
      </div>
      {showSignupSuccess && (
        <SignupSuccessPopup
          onClose={() => {
            setShowSignupSuccess(false);
            switchView('login');
          }}
        />
      )}
    </div>
  );
};

export default Auth;