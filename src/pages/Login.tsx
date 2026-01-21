import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, ArrowRight, Eye, EyeOff, Users } from 'lucide-react';

export const Login = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin') {
      login();
      navigate('/dashboard');
    } else {
      setError('Thông tin đăng nhập không chính xác (thử admin/admin)');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4 font-sans text-slate-800">
      
      {/* Logo & Headline Section */}
      <div className="text-center mb-8 animate-fade-in">
        <div className="inline-flex justify-center mb-4">
           {/* Logo Image */}
           {/* Logo Image */}
           <Users 
             className="h-20 w-auto text-[#20398B] drop-shadow-sm hover:scale-105 transition-transform duration-300"
           />
        </div>
        <h1 className="text-3xl font-extrabold text-[#20398B] tracking-tight">
          Chào mừng trở lại
        </h1>
        <p className="text-slate-500 mt-2 text-sm font-medium">
          Đăng nhập vào <span className="font-bold bg-gradient-to-r from-[#20398B] to-indigo-600 bg-clip-text text-transparent">JOB Allocator</span>
        </p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-100 p-8 md:p-10 animate-fade-in">
         <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Username/Email Field */}
            <div className="space-y-2">
               <label className="block text-sm font-semibold text-slate-700">
                 Email
               </label>
               <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                     <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-[#20398B] transition-colors" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-white text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#20398B]/20 focus:border-[#20398B] transition-all font-medium placeholder:text-slate-400"
                    placeholder="Nhập email"
                  />
               </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
               <div className="flex justify-between items-center">
                   <label className="block text-sm font-semibold text-slate-700">Mật khẩu</label>
                   <a href="#" className="text-sm font-medium text-[#20398B] hover:text-indigo-700 hover:underline">
                     Quên mật khẩu?
                   </a>
               </div>
               <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                     <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-[#20398B] transition-colors" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-11 pr-11 py-3 bg-white text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#20398B]/20 focus:border-[#20398B] transition-all font-medium placeholder:text-slate-400"
                    placeholder="Nhập mật khẩu"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
               </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#20398B] focus:ring-[#20398B] cursor-pointer accent-[#20398B]"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-600 cursor-pointer select-none">
                Ghi nhớ đăng nhập
              </label>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-100 flex items-center gap-2 text-red-600 text-sm font-medium animate-pulse">
                 <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                 {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold text-[15px] bg-gradient-to-r from-[#20398B] to-indigo-600 hover:from-[#1a2e72] hover:to-indigo-500 active:scale-[0.98] transition-all shadow-md shadow-indigo-900/20"
            >
              Đăng nhập <ArrowRight className="w-4 h-4" />
            </button>
         </form>
      </div>

      {/* Footer */}
      <p className="mt-8 text-center text-xs text-slate-400">
        © 2026 JOB System. All rights reserved.
      </p>
    </div>
  );
};
