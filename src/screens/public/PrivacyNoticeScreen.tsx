import { useNavigate } from 'react-router-dom';

import { COMPLIANCE_CONFIG } from '../../options/complianceConfig';

export function PrivacyNoticeScreen() {
  const navigate = useNavigate();
  const notice = COMPLIANCE_CONFIG.PRIVACY_NOTICE;
  const childrenPolicy = COMPLIANCE_CONFIG.CHILDREN_POLICY;

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      window.close();
    }
  };

  return (
    <div className="min-h-screen bg-white px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <button
          className="mb-6 cursor-pointer text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          onClick={handleBack}
          type="button"
        >
          &larr; Back
        </button>

        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {notice.title}
        </h1>

        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Effective Date: {notice.effectiveDate} | Version: {notice.version}
        </p>

        <p className="mt-6 text-base leading-relaxed text-slate-700 dark:text-slate-300">
          Titan Eye+ (Titan Company Limited) is committed to safeguarding the privacy and security of your personal and health information. This Privacy Notice explains how we collect, process, protect, and retain your data when you participate in remote tele-optometry eye tests at our stores.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-slate-900 dark:text-white">
          1. Data Protection Principles
        </h2>
        <div className="mt-3 space-y-2">
          {notice.principles.map((item, idx) => (
            <p className="text-base leading-relaxed text-slate-700 dark:text-slate-300" key={idx}>
              {item}
            </p>
          ))}
        </div>

        <h2 className="mt-8 text-xl font-semibold text-slate-900 dark:text-white">
          2. Purpose of Data Collection
        </h2>
        <div className="mt-3 space-y-2">
          {notice.purposesOfCollection.map((p, idx) => (
            <p className="text-base leading-relaxed text-slate-700 dark:text-slate-300" key={idx}>
              {idx + 1}. {p}
            </p>
          ))}
        </div>

        <h2 className="mt-8 text-xl font-semibold text-slate-900 dark:text-white">
          3. Categories of Data Collected & Processed
        </h2>
        <div className="mt-3 space-y-4">
          {notice.categoriesOfData.map((cat, idx) => (
            <div className="space-y-1" key={idx}>
              <h3 className="text-base font-medium text-slate-900 dark:text-white">
                {cat.category}
              </h3>
              <p className="text-base leading-relaxed text-slate-700 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-slate-200">Fields collected:</span> {cat.fields}
              </p>
              <p className="text-base leading-relaxed text-slate-700 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-slate-200">Purpose:</span> {cat.purpose}
              </p>
            </div>
          ))}
        </div>

        <h2 className="mt-8 text-xl font-semibold text-slate-900 dark:text-white">
          4. Tele-Consultation Calling & Non-Recording Guarantee
        </h2>
        <p className="mt-3 text-base leading-relaxed text-slate-700 dark:text-slate-300">
          {notice.videoCallingDisclosure}
        </p>

        <h2 className="mt-8 text-xl font-semibold text-slate-900 dark:text-white">
          5. {childrenPolicy.noticeTitle}
        </h2>
        <p className="mt-3 text-base leading-relaxed text-slate-700 dark:text-slate-300">
          {childrenPolicy.policyStatement}
        </p>

        <h2 className="mt-8 text-xl font-semibold text-slate-900 dark:text-white">
          6. Data Retention Schedule
        </h2>
        <p className="mt-3 text-base leading-relaxed text-slate-700 dark:text-slate-300">
          {notice.retentionSummary}
        </p>

        <h2 className="mt-8 text-xl font-semibold text-slate-900 dark:text-white">
          7. Your Rights Under Data Privacy Laws
        </h2>
        <div className="mt-3 space-y-2">
          {notice.rights.map((r, idx) => (
            <p className="text-base leading-relaxed text-slate-700 dark:text-slate-300" key={idx}>
              {r}
            </p>
          ))}
        </div>

        <h2 className="mt-8 text-xl font-semibold text-slate-900 dark:text-white">
          8. Grievance Redressal & Data Protection Officer Contact
        </h2>
        <p className="mt-3 text-base leading-relaxed text-slate-700 dark:text-slate-300">
          If you have any questions, wish to exercise your data rights, or have privacy concerns, please contact our designated Grievance Officer:
        </p>
        <div className="mt-3 space-y-1 text-base text-slate-700 dark:text-slate-300">
          <p>
            <span className="font-semibold text-slate-900 dark:text-slate-200">Name:</span> {notice.dpoName}
          </p>
          <p>
            <span className="font-semibold text-slate-900 dark:text-slate-200">Designation:</span> {notice.dpoDesignation}
          </p>
          <p>
            <span className="font-semibold text-slate-900 dark:text-slate-200">Email:</span>{' '}
            <a className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400" href={`mailto:${notice.dpoEmail}`}>
              {notice.dpoEmail}
            </a>
          </p>
          <p>
            <span className="font-semibold text-slate-900 dark:text-slate-200">Telephone:</span> {notice.dpoPhone}
          </p>
          <p>
            <span className="font-semibold text-slate-900 dark:text-slate-200">Address:</span> {notice.dpoAddress}
          </p>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-6 dark:border-slate-800 sm:flex-row">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            &copy; {new Date().getFullYear()} Titan Eye+ &mdash; Titan Company Limited. All rights reserved.
          </p>
          <button
            className="cursor-pointer text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
            onClick={handleBack}
            type="button"
          >
            Close / Return
          </button>
        </div>
      </div>
    </div>
  );
}

export default PrivacyNoticeScreen;
