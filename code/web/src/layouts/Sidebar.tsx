import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Activity,
  AlertTriangle,
  Briefcase,
  ClipboardCheck,
  Route,
  Map,
  Clapperboard,
  Settings,
  SlidersHorizontal,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { getUser } from '@/stores/auth.store';
import { getMessages } from '@/locales';

const MSG = getMessages().layout;

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  section?: string;
  roles?: string[];
}

const navItems: NavItem[] = [
  { label: MSG.navDashboard, icon: <LayoutDashboard size={16} />, path: '/dashboard' },
  { label: MSG.navProfiles, icon: <Users size={16} />, path: '/ho-so' },
  { label: MSG.navEvents, icon: <Activity size={16} />, path: '/events' },
  { label: MSG.navAlerts, icon: <AlertTriangle size={16} />, path: '/alerts' },
  { label: MSG.navAlertRules, icon: <SlidersHorizontal size={16} />, path: '/quy-tac-canh-bao' },
  { label: MSG.navEscalationRules, icon: <TrendingUp size={16} />, path: '/quy-tac-leo-thang' },
  { label: MSG.navCases, icon: <Briefcase size={16} />, path: '/cases' },
  { label: MSG.navApprovals, icon: <ClipboardCheck size={16} />, path: '/xet-duyet' },
  { label: MSG.navTrace, icon: <Route size={16} />, path: '/truy-vet' },
  { label: MSG.navMap, icon: <Map size={16} />, path: '/ban-do' },
  { label: MSG.navScenarios, icon: <Clapperboard size={16} />, path: '/kich-ban' },
  {
    label: MSG.navAdmin,
    icon: <Settings size={16} />,
    path: '/admin/tai-khoan',
    section: 'admin',
    roles: ['IT_ADMIN', 'LANH_DAO'],
  },
];

interface SidebarProps {
  collapsed?: boolean;
}

function Sidebar({ collapsed = false }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getUser();
  const userRole = user?.role ?? '';

  const visibleItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(userRole),
  );

  const mainItems = visibleItems.filter((item) => item.section !== 'admin');
  const adminItems = visibleItems.filter((item) => item.section === 'admin');

  return (
    <aside
      className={cn(
        'bg-zinc-900 min-h-screen h-full flex flex-col flex-shrink-0 overflow-y-auto py-2',
        collapsed ? 'w-12' : 'w-[200px]',
      )}
    >
      <nav className="flex flex-col gap-0.5 px-1.5 flex-1">
        {mainItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 rounded text-[12px] transition-colors text-left w-full',
                isActive
                  ? 'bg-zinc-800 text-zinc-50 border-l-2 border-red-700'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200',
              )}
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {adminItems.length > 0 && (
        <>
          <div className="border-t border-zinc-700 mx-3 my-1.5" />
          <nav className="flex flex-col gap-0.5 px-1.5">
            {!collapsed && (
              <span className="px-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-0.5">
                {MSG.navAdminSection}
              </span>
            )}
            {adminItems.map((item) => {
              const isActive = location.pathname.startsWith('/admin');
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    'flex items-center gap-2 px-2 py-1.5 rounded text-[12px] transition-colors text-left w-full',
                    isActive
                      ? 'bg-zinc-800 text-zinc-50 border-l-2 border-red-700'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200',
                  )}
                >
                  {item.icon}
                  {!collapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </>
      )}
    </aside>
  );
}

export default Sidebar;
