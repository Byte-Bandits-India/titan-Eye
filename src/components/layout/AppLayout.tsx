import type { AppLayoutProps } from '../../types';

import { useAppSelector } from '../../store';
import { NotificationPopover } from '../shared/NotificationPopover';
import { Footer } from './Footer';
import { Header } from './Header';

export function AppLayout({
  activeTab,
  children,
  consoleLabel,
  onSearchChange,
  onSelectCustomer,
  searchPlaceholder,
  searchValue,
  setActiveTab,
}: AppLayoutProps) {
  const user = useAppSelector((state) => state.auth.user);
  const isStore = user?.role === 'store';

  return (
    <div className="font-pro flex min-h-screen flex-1 flex-col bg-[#F2F3F3]">
      <Header
        activeTab={activeTab}
        consoleLabel={consoleLabel}
        onSearchChange={onSearchChange}
        onSelectCustomer={onSelectCustomer}
        searchPlaceholder={searchPlaceholder}
        searchValue={searchValue}
        setActiveTab={setActiveTab}
      />
      {children}
      <Footer />
      {isStore ? (
        <NotificationPopover onSelectCustomer={onSelectCustomer} showTrigger={false} variant="toast" />
      ) : (
        <NotificationPopover onSelectCustomer={onSelectCustomer} showTrigger={false} variant="drawer" />
      )}
    </div>
  );
}
