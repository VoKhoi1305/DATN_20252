import { Bell, Menu } from 'lucide-react';
import { getUser } from '@/stores/auth.store';
import { getMessages } from '@/locales';

const MSG = getMessages().layout;

interface TopbarProps {
  onMenuToggle?: () => void;
}

function Topbar({ onMenuToggle }: TopbarProps) {
  const user = getUser();

  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((w) => w[0])
        .slice(-2)
        .join('')
        .toUpperCase()
    : '?';

  return (
    <header className="h-12 bg-zinc-950 border-b-2 border-red-700 flex-shrink-0 flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <button
          onClick={onMenuToggle}
          className="lg:hidden text-zinc-400 hover:text-zinc-50 p-1"
          aria-label={MSG.ariaMenu}
        >
          <Menu size={18} />
        </button>
        <span className="text-[13px] font-semibold text-zinc-50 tracking-wide">
          {MSG.brandName}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          className="relative text-zinc-400 hover:text-zinc-50 p-1"
          aria-label={MSG.ariaNotifications}
        >
          <Bell size={16} />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[12px] text-zinc-400 hidden sm:inline">
            {user?.fullName}
          </span>
          <div className="w-7 h-7 rounded bg-red-700 flex items-center justify-center text-[11px] font-semibold text-zinc-50">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Topbar;
