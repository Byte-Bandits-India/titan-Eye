import type { AppLayoutProps } from '../../types';

import { Footer } from './Footer';
import { Header } from './Header';

export function AppLayout({ activeTab, children, consoleLabel, onSearchChange, onSelectCustomer, searchPlaceholder, searchValue, setActiveTab }: AppLayoutProps) {
  return (
    <div className="flex-1 flex flex-col bg-[#F2F3F3] min-h-screen">
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
    </div>
  );
}
