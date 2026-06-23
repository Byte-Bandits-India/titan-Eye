import { APP_CONFIG } from '../../constants';

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 px-8 py-4 mt-auto">
      <div className="flex flex-col md:flex-row items-center justify-between gap-2 text-[10px] text-gray-400">
        <span>© {new Date().getFullYear()} {APP_CONFIG.COMPANY_NAME}. All Rights Reserved.</span>
        <span>
          {APP_CONFIG.COMPANY_NAME}, {APP_CONFIG.COMPANY_ADDRESS}
        </span>
        <span className="text-blue-600 font-bold hover:underline cursor-pointer">
          {APP_CONFIG.COMPANY_URL}
        </span>
      </div>
    </footer>
  );
}
