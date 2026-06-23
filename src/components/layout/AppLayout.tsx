import { Header } from './Header';
import { Footer } from './Footer';
import type { AppLayoutProps } from '../../types';

export function AppLayout({ consoleLabel, children }: AppLayoutProps) {
  return (
    <div className="flex-1 flex flex-col bg-[#e8eaf0] min-h-screen">
      <Header consoleLabel={consoleLabel} />
      {children}
      <Footer />
    </div>
  );
}
