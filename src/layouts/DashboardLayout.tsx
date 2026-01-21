import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  LogOut, 
  Menu, 
  Settings, 
  ChevronRight,
  Users,
  // PieChart,
  // History
} from 'lucide-react';



export const DashboardLayout = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Phân bổ', icon: LayoutDashboard, path: '/dashboard' },
    // { label: 'Lịch sử', icon: History, path: '/dashboard/history' },
    // { label: 'Báo cáo', icon: PieChart, path: '/dashboard/reports' }, 
    { label: 'Cài đặt', icon: Settings, path: '/dashboard/settings' }, 
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-800 font-sans">
      {/* Sidebar */}
      <aside 
        className={`${
          isSidebarOpen ? 'w-64' : 'w-20'
        } bg-white border-r border-slate-200 transition-all duration-300 flex flex-col z-20 shadow-sm`}
      >
        <div className="h-16 flex items-center justify-center border-b border-slate-100">
          <div className="flex items-center gap-3 font-bold text-xl tracking-tight text-[#20398B]">
             <Users className="w-8 h-8 text-[#20398B]" />
             {isSidebarOpen && <span className="animate-fade-in">JOB Tool</span>}
          </div>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                  isActive 
                    ? 'bg-[#20398B]/5 text-[#20398B] font-semibold' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
                title={!isSidebarOpen ? item.label : ''}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[#20398B]' : 'stroke-slate-400 group-hover:stroke-slate-600'}`} />
                {isSidebarOpen && (
                  <span className="flex-1 text-left text-sm">{item.label}</span>
                )}
                {isSidebarOpen && isActive && <ChevronRight className="w-4 h-4 opacity-50" />}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
           <button 
             onClick={handleLogout}
             className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all ${!isSidebarOpen && 'justify-center'}`}
           >
             <LogOut className="w-5 h-5" />
             {isSidebarOpen && <span className="font-medium text-sm">Đăng xuất</span>}
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-10 sticky top-0 shadow-sm/50">
           <div className="flex items-center gap-4">
             <button 
               onClick={() => setIsSidebarOpen(!isSidebarOpen)}
               className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
             >
               <Menu className="w-5 h-5" />
             </button>
             <h2 className="text-lg font-bold text-slate-800">
               {navItems.find(i => i.path === location.pathname)?.label || 'Dashboard'}
             </h2>
           </div>

           <div className="flex items-center gap-4">
             <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                <div className="text-right hidden md:block">
                  <p className="text-sm font-semibold text-slate-700 leading-none">{user?.name}</p>
                  <p className="text-xs text-slate-500 leading-none mt-1">{user?.role}</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-[#20398B]/10 flex items-center justify-center text-sm font-bold text-[#20398B] border border-[#20398B]/10">
                  {user?.name.charAt(0) || 'A'}
                </div>
             </div>
           </div>
        </header>

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-hidden bg-slate-50 p-4 md:p-6">
          <div className="w-full animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
