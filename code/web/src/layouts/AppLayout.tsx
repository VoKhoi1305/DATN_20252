import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Topbar from './Topbar';
import Sidebar from './Sidebar';

function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      {/* Sidebar — desktop, full height */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Sidebar — mobile overlay */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            <Sidebar />
          </div>
        </>
      )}

      {/* Main area — takes remaining width, scrolls independently */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar — fixed at top of main area */}
        <Topbar onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />

        {/* Page content — only this scrolls */}
        <main className="flex-1 overflow-y-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
