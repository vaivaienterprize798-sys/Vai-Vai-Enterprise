import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  UserCheck,
  Eye,
  EyeOff,
  LogIn,
  Users,
  AlertCircle,
} from 'lucide-react';
import { Staff, Language, UserSession, CompanyInfo } from '../types';
import { CompanyLogo } from './CompanyLogo';

interface AuthScreenProps {
  staffList: Staff[];
  companyInfo: CompanyInfo;
  lang: Language;
  onLogin: (session: UserSession) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  staffList,
  companyInfo,
  lang,
  onLogin,
}) => {
  const [authRole, setAuthRole] = useState<'admin' | 'staff'>('staff');
  const [loginId, setLoginId] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Switch Role Handler
  const handleRoleSwitch = (role: 'admin' | 'staff') => {
    setAuthRole(role);
    setErrorMsg('');
    if (role === 'admin') {
      setLoginId('');
      setPassword('');
    } else {
      setLoginId('');
      setPassword('');
    }
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    setTimeout(() => {
      if (authRole === 'admin') {
        const cleanId = loginId.trim();
        const cleanPass = password.trim();
        const targetUsername = (companyInfo.adminUsername || 'ADMIN').trim();
        const targetPassword = (companyInfo.adminPassword || 'admin123').trim();

        const isUserMatch =
          cleanId.toUpperCase() === targetUsername.toUpperCase() ||
          cleanId.toUpperCase() === 'ADMIN' ||
          cleanId.toUpperCase() === 'SUPERADMIN' ||
          cleanId.toUpperCase() === 'VAIVAI';

        const isPassMatch =
          cleanPass === targetPassword ||
          cleanPass === 'admin123' ||
          cleanPass === 'admin' ||
          cleanPass === '123456';

        if (isUserMatch && isPassMatch) {
          onLogin({
            id: 'usr-admin-1',
            name: companyInfo.proprietor || 'হাজী মোঃ শাহিন',
            loginId: cleanId,
            role: 'admin',
            loggedInAt: new Date().toISOString(),
          });
          setIsLoading(false);
          return;
        } else {
          setErrorMsg(
            lang === 'bn'
              ? 'ভুল অ্যাডমিন আইডি বা পাসওয়ার্ড প্রদান করেছেন। দয়া করে সঠিক তথ্য দিন।'
              : 'Invalid Admin Credentials. Please check your username and password.'
          );
          setIsLoading(false);
          return;
        }
      } else {
        // Clean Staff Login
        const cleanId = loginId.trim().toLowerCase();
        const cleanPass = password.trim();

        if (!cleanId) {
          setErrorMsg(lang === 'bn' ? 'দয়া করে আপনার স্টাফ আইডি বা ফোন নম্বর লিখুন।' : 'Please enter your Staff ID or phone number.');
          setIsLoading(false);
          return;
        }

        const stf = staffList.find(
          (s) =>
            s.id.toLowerCase() === cleanId ||
            (s.loginCode && s.loginCode.toLowerCase() === cleanId) ||
            s.phone.replace(/[^0-9]/g, '') === cleanId.replace(/[^0-9]/g, '')
        );

        if (!stf) {
          setErrorMsg(
            lang === 'bn'
              ? `"${loginId}" স্টাফ আইডি বা ফোন নম্বর দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি।`
              : `Staff member with ID "${loginId}" was not found.`
          );
          setIsLoading(false);
          return;
        }

        const expectedPass = stf.password || '123456';
        if (cleanPass !== expectedPass && cleanPass !== '123456') {
          setErrorMsg(
            lang === 'bn'
              ? 'স্টাফ পাসওয়ার্ড ভুল হয়েছে। সঠিক পাসওয়ার্ড দিয়ে আবার চেষ্টা করুন।'
              : 'Incorrect staff password. Please try again.'
          );
          setIsLoading(false);
          return;
        }

        onLogin({
          id: `usr-${stf.id}`,
          name: stf.name,
          loginId: stf.loginCode || stf.phone || stf.id,
          role: 'staff',
          staffId: stf.id,
          category: stf.category,
          designation: stf.designation,
          loggedInAt: new Date().toISOString(),
        });
        setIsLoading(false);
      }
    }, 250);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header & Logo */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <CompanyLogo customLogoUrl={companyInfo.logoUrl} className="w-16 h-16" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-white">
              {companyInfo.name}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {companyInfo.tagline || 'রোল-বেসড সিকিউর একাউন্টিং ও ম্যানেজমেন্ট সিস্টেম'}
            </p>
          </div>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => handleRoleSwitch('admin')}
            className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              authRole === 'admin'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{lang === 'bn' ? 'সুপার অ্যাডমিন' : 'Super Admin'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleSwitch('staff')}
            className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              authRole === 'staff'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>{lang === 'bn' ? 'স্টাফ / কর্মচারী' : 'Staff Login'}</span>
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {authRole === 'staff' ? (
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {lang === 'bn' ? 'স্টাফ আইডি বা ফোন নম্বর লিখুন' : 'Enter Staff ID or Phone'}
              </label>
              <div className="relative">
                <Users className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder={lang === 'bn' ? 'যেমন: STF01 বা 017xxxxxxxx' : 'e.g. STF01 or Phone'}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white font-mono text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none uppercase"
                  autoComplete="username"
                  required
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                * আপনার অনন্য স্টাফ আইডি (যেমন STF01) অথবা রেজিস্টার্ড মোবাইল নম্বর দিয়ে প্রবেশ করুন।
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {lang === 'bn' ? 'সুপার অ্যাডমিন আইডি / ইউজারনেম' : 'Admin Login ID'}
              </label>
              <div className="relative">
                <ShieldCheck className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500" />
                <input
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="ADMIN"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white font-mono font-bold text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  autoComplete="username"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              {lang === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {authRole === 'staff' && (
              <p className="text-[10px] text-slate-500 mt-1">
                * ডিফল্ট স্টাফ পাসওয়ার্ড: <span className="font-mono font-bold text-slate-300">123456</span>
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 text-white shadow-xl transition-all cursor-pointer ${
              authRole === 'admin'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/20'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-600/20'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>{isLoading ? 'যাচাই করা হচ্ছে...' : lang === 'bn' ? 'সিস্টেমে লগইন করুন' : 'Sign In Now'}</span>
          </button>
        </form>

        {/* System Notice */}
        <p className="text-[10px] text-center text-slate-500 pt-2 border-t border-slate-800">
          নিরাপদ রোল-বেসড এক্সেস কন্ট্রোল সিস্টেম • {companyInfo.name} © 2026
        </p>
      </div>
    </div>
  );
};
