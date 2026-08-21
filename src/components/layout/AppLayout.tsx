import type { AppLayoutProps } from '../../types';

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
      <NotificationPopover onSelectCustomer={onSelectCustomer} showTrigger={false} variant="toast" />
    </div>
  );
}
