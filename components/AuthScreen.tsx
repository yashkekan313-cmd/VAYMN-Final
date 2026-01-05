
import React, { useState } from 'react';
import { UserRole, User } from '../types';

interface AuthScreenProps {
  mode: 'LOGIN' | 'SIGNUP';
  role: UserRole;
  onLogin: (id: string, pass: string, role: UserRole) => void;
  onSignup: (user: User) => void;
  onBackToHome: () => void;
  onToggleSignup: () => void;
  onBackToLogin: () => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ 
  mode, role, onLogin, onSignup, onBackToHome, onToggleSignup, onBackToLogin 
}) => {
  const [libId, setLibId] = useState('');
  const [pass, setPass] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'LOGIN') {
      onLogin(libId, pass, role);
    } else {
      if (!libId || !pass || !name || !email) {
        alert("Please fill all fields");
        return;
      }
      // Fix: Adding missing xp and badges properties to comply with the User interface definition
      const newUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        libraryId: libId,
        password: pass,
        email,
        role,
        xp: 0,
        badges: [],
      };
      onSignup(newUser);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F7F9FC] animate-fade-in">
      <div className="bg-white p-8 rounded-[14px] shadow-xl w-full max-w-md border border-[#E5EAF0]">
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={mode === 'SIGNUP' ? onBackToLogin : onBackToHome}
            className="text-slate-400 hover:text-[#5DA9E9] transition-colors p-2"
          >
            <i className="fas fa-arrow-left text-xl"></i>
          </button>
          <div className="text-right">
            <h2 className="text-2xl font-bold text-[#1F2A44]">
              {mode === 'LOGIN' ? `${role === 'ADMIN' ? 'Admin' : 'User'} Login` : 'Create Account'}
            </h2>
            <p className="text-xs text-[#5DA9E9] uppercase tracking-widest font-bold">VAYMN Library</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === 'SIGNUP' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-[#1F2A44] mb-1.5">Full Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-[#F7F9FC] border border-[#E5EAF0] rounded-[12px] focus:ring-2 focus:ring-[#5DA9E9] focus:border-transparent transition-all outline-none text-[#1F2A44]"
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1F2A44] mb-1.5">Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-[#F7F9FC] border border-[#E5EAF0] rounded-[12px] focus:ring-2 focus:ring-[#5DA9E9] focus:border-transparent transition-all outline-none text-[#1F2A44]"
                  placeholder="Enter your email"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-semibold text-[#1F2A44] mb-1.5">Library ID</label>
            <input 
              type="text" 
              value={libId}
              onChange={(e) => setLibId(e.target.value)}
              className="w-full px-4 py-3 bg-[#F7F9FC] border border-[#E5EAF0] rounded-[12px] focus:ring-2 focus:ring-[#5DA9E9] focus:border-transparent transition-all outline-none text-[#1F2A44]"
              placeholder="Enter Library ID"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1F2A44] mb-1.5">Password</label>
            <input 
              type="password" 
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="w-full px-4 py-3 bg-[#F7F9FC] border border-[#E5EAF0] rounded-[12px] focus:ring-2 focus:ring-[#5DA9E9] focus:border-transparent transition-all outline-none text-[#1F2A44]"
              placeholder="Enter password"
            />
          </div>

          <button 
            type="submit"
            className="w-full py-4 bg-[#1F2A44] hover:bg-[#2a3a5e] text-white rounded-[12px] font-bold transition-all shadow-md active:scale-[0.98]"
          >
            {mode === 'LOGIN' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-8 text-center">
          {mode === 'LOGIN' ? (
            <p className="text-[#1F2A44] text-sm opacity-70">
              Don't have an account? {' '}
              <button onClick={onToggleSignup} className="text-[#5DA9E9] font-bold hover:underline">Sign Up</button>
            </p>
          ) : (
            <p className="text-[#1F2A44] text-sm opacity-70">
              Already have an account? {' '}
              <button onClick={onBackToLogin} className="text-[#5DA9E9] font-bold hover:underline">Log In</button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
