import { APP_CONFIG } from '../../options/Option';

export function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-200 bg-white px-8 py-4">
      <div className="flex flex-col items-center justify-between gap-2 text-[10px] text-gray-400 md:flex-row">
        <span>
          © {new Date().getFullYear()} {APP_CONFIG.COMPANY_NAME}. All Rights Reserved.
        </span>
        <span>
          {APP_CONFIG.COMPANY_NAME}, {APP_CONFIG.COMPANY_ADDRESS}
        </span>
        <span className="cursor-pointer font-bold text-blue-600 hover:underline">
          {APP_CONFIG.COMPANY_URL}
        </span>
      </div>
    </footer>
  );
}
