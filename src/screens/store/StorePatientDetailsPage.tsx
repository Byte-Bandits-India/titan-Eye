import { Calendar, ChevronLeft, Languages, Phone, Store, Users } from 'lucide-react';

import type { RxValues, StorePatientDetailsPageProps } from '../../types';

import { CardFrame } from '../../components/shared/CardFrame';
import { Button } from '../../components/ui/button';
import { optometristFields, optometristHeaders } from '../../options/Option';

function RxStatRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center gap-6 text-[14px]">
      <span className="w-5 shrink-0 font-semibold text-foreground">{label}</span>
      <span className="text-foreground">{value || '0.00'}</span>
    </div>
  );
}

function RxEyeColumn({ eyeLabel, values }: { eyeLabel: string; values?: RxValues }) {
  return (
    <div className="flex w-20 shrink-0 flex-col gap-1">
      <p className="mb-0.5 w-full text-center text-[14px] font-medium text-foreground">{eyeLabel}</p>
      <RxStatRow label="S" value={values?.sph} />
      <RxStatRow label="C" value={values?.cyl} />
      <RxStatRow label="A" value={values?.axis} />
      <RxStatRow label="PD" value={values?.pd} />
      <div className="h-1.5" />
      <RxStatRow label="A" value={values?.add} />
      <RxStatRow label="B" value={values?.base} />
      <RxStatRow label="P" value={values?.prism} />
    </div>
  );
}

function RxDeviceCard({
  imageAlt,
  imageSrc,
  leftValues,
  rightValues,
  title,
}: {
  imageAlt: string;
  imageSrc: string;
  leftValues?: RxValues;
  rightValues?: RxValues;
  title: string;
}) {
  return (
    <CardFrame className="items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="flex w-full items-center justify-between gap-2 sm:gap-4">
        <RxEyeColumn eyeLabel="Right" values={rightValues} />

        <div className="flex flex-1 flex-col items-center gap-2">
          <p className="text-center text-lg font-extrabold text-foreground">{title}</p>
          <img alt={imageAlt} className="max-h-40 w-auto object-contain" src={imageSrc} />
        </div>

        <RxEyeColumn eyeLabel="Left" values={leftValues} />
      </div>
    </CardFrame>
  );
}

export function StorePatientDetailsPage({ onBack, selectedCustomer }: StorePatientDetailsPageProps) {
  const languages = [selectedCustomer?.preferredLanguage, selectedCustomer?.preferredLanguage2].filter(
    (lang): lang is string => Boolean(lang) && lang !== 'None'
  );

  return (
    <main className="font-pro mx-auto w-full max-w-[1400px] flex-1 space-y-4 px-3 py-4 duration-200 animate-in fade-in sm:space-y-6 sm:px-6 sm:py-8 md:px-8">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <h1 className="text-lg font-medium text-foreground sm:text-xl">Customer Details</h1>

        <Button
          className="active:scale-98 flex h-10 shrink-0 cursor-pointer items-center gap-1.5 self-start rounded-md border-gray-200 bg-white px-4 text-sm font-normal text-gray-600 shadow-sm transition-all hover:bg-slate-50 dark:border-border dark:bg-card dark:text-foreground sm:self-auto"
          onClick={onBack}
          type="button"
          variant="outline"
        >
          <ChevronLeft size={16} />
          Back
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:[grid-template-columns:1fr_1.63fr_1.63fr]">
        <CardFrame className="p-4 sm:p-6 md:p-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">{selectedCustomer?.name || '—'}</h2>

            <div className="space-y-3.5">
              <div className="flex items-center gap-3 text-[15px] text-foreground">
                <Store className="shrink-0 text-[#4B5568]" size={18} />
                <span>
                  <span className="text-[#4B5568]">Store Code :</span> {selectedCustomer?.storeName || '—'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[15px] text-foreground">
                <Calendar className="shrink-0 text-[#4B5568]" size={18} />
                <span>
                  <span className="text-[#4B5568]">Age :</span>{' '}
                  {selectedCustomer?.age ? `${selectedCustomer.age} yrs` : '—'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[15px] text-foreground">
                <Users className="shrink-0 text-[#4B5568]" size={18} />
                <span>
                  <span className="text-[#4B5568]">Gender :</span> {selectedCustomer?.gender || '—'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[15px] text-foreground">
                <Phone className="shrink-0 text-[#4B5568]" size={18} />
                <span>
                  <span className="text-[#4B5568]">Mobile :</span> {selectedCustomer?.mobile || '—'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[15px] text-foreground">
                <Languages className="shrink-0 text-[#4B5568]" size={18} />
                <span>
                  <span className="text-[#4B5568]">Language :</span>{' '}
                  {languages.length > 0 ? languages.join(', ') : '—'}
                </span>
              </div>
            </div>
          </div>
        </CardFrame>

        <RxDeviceCard
          imageAlt="Auto Ref"
          imageSrc="/images/autoref.png"
          leftValues={selectedCustomer?.rxData?.autoRefLe}
          rightValues={selectedCustomer?.rxData?.autoRefRe}
          title="Auto Ref"
        />

        <RxDeviceCard
          imageAlt="PGP"
          imageSrc="/images/pgp.png"
          leftValues={selectedCustomer?.rxData?.pgpLe}
          rightValues={selectedCustomer?.rxData?.pgpRe}
          title="PGP"
        />
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-medium text-foreground">Store Action / Feedback</h2>

        <CardFrame className="p-5">
          {selectedCustomer?.storeFeedback ? (
            <div
              className="text-sm leading-relaxed text-foreground"
              dangerouslySetInnerHTML={{ __html: selectedCustomer.storeFeedback }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No store action or feedback recorded yet.</p>
          )}
        </CardFrame>
      </div>

      {selectedCustomer?.optometristRxData && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-foreground">Optometrist RX</h2>

          <CardFrame className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-t border-border">
                  <th className="px-3 py-2 text-left font-medium text-foreground">R X</th>
                  {optometristHeaders.map((header) => (
                    <th className="px-3 py-2 text-center font-medium text-foreground" key={header}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(['re', 'le'] as const).map((eye) => (
                  <tr className="border-t border-border" key={eye}>
                    <td className="px-3 py-2 font-medium text-foreground">{eye.toUpperCase()}</td>
                    {optometristFields.map((field) => (
                      <td className="px-3 py-2 text-center text-foreground" key={field}>
                        {selectedCustomer.optometristRxData?.[eye]?.[field] || '0.00'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardFrame>
        </div>
      )}

      {selectedCustomer?.optometristRxData && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-foreground">Optometrist Action / Feedback</h2>

          <CardFrame className="p-5">
            {selectedCustomer.optometristFeedback ? (
              <div
                className="text-sm leading-relaxed text-foreground"
                dangerouslySetInnerHTML={{ __html: selectedCustomer.optometristFeedback }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">No optometrist action or feedback recorded yet.</p>
            )}
          </CardFrame>
        </div>
      )}
    </main>
  );
}
