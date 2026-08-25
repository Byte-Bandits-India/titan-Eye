import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Images,
  Languages,
  Phone,
  Store,
  Users,
  Video,
  X,
} from 'lucide-react';
import * as React from 'react';
import { createPortal } from 'react-dom';

import type { Customer, CustomerStatus, OptometristPatientDetailsProps, RxValues } from '../../types';

import {
  dropCallAction,
  initiateCallAction,
  rejectCallAction,
  updateCustomerAction,
} from '../../Actions/customerActions';
import { CardFrame } from '../../components/shared/CardFrame';
import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { useToast } from '../../components/ui/toast';
import {
  API_BASE_URL,
  isOptometristRxComplete,
  optometristFields,
  optometristHeaders,
} from '../../options/Option';
import { useAppDispatch } from '../../store';
import { OptometristCallDrawer } from './components/OptometristCallDrawer';

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
  children,
  imageAlt,
  imageSrc,
  leftValues,
  rightValues,
  title,
}: {
  children?: React.ReactNode;
  imageAlt: string;
  imageSrc: string;
  leftValues?: RxValues;
  rightValues?: RxValues;
  title: string;
}) {
  return (
    <CardFrame className="items-center justify-center gap-3 p-4 sm:p-6 md:p-8">
      <div className="flex w-full items-center justify-between gap-2 sm:gap-4">
        <RxEyeColumn eyeLabel="Right" values={rightValues} />

        <div className="flex flex-1 flex-col items-center gap-2">
          <p className="text-center text-lg font-extrabold text-foreground">{title}</p>
          <img alt={imageAlt} className="max-h-40 w-auto object-contain" src={imageSrc} />
        </div>

        <RxEyeColumn eyeLabel="Left" values={leftValues} />
      </div>
      {children}
    </CardFrame>
  );
}

type LightboxImage = { alt: string; src: string };

function ImageLightbox({
  images,
  onClose,
  startIndex,
}: {
  images: LightboxImage[];
  onClose: () => void;
  startIndex: number;
}) {
  const [index, setIndex] = React.useState(startIndex);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        setIndex((i) => (i + 1) % images.length);
      } else if (e.key === 'ArrowLeft') {
        setIndex((i) => (i - 1 + images.length) % images.length);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [images.length, onClose]);

  const current = images[index];

  if (!current) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        className="absolute right-4 top-4 cursor-pointer rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        onClick={onClose}
        title="Close"
        type="button"
      >
        <X size={26} />
      </button>

      {images.length > 1 && (
        <span className="absolute left-1/2 top-5 -translate-x-1/2 text-sm font-medium text-white/80">
          {index + 1} / {images.length}
        </span>
      )}

      {images.length > 1 && (
        <button
          className="absolute left-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white sm:left-4"
          onClick={(e) => {
            e.stopPropagation();
            setIndex((i) => (i - 1 + images.length) % images.length);
          }}
          title="Previous"
          type="button"
        >
          <ChevronLeft size={32} />
        </button>
      )}

      <img
        alt={current.alt}
        className="max-h-[85vh] max-w-[92vw] rounded-md object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        src={current.src}
      />

      {images.length > 1 && (
        <button
          className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white sm:right-4"
          onClick={(e) => {
            e.stopPropagation();
            setIndex((i) => (i + 1) % images.length);
          }}
          title="Next"
          type="button"
        >
          <ChevronRight size={32} />
        </button>
      )}
    </div>,
    document.body
  );
}

function SpotlightOverlay({ targetRef }: { targetRef: React.RefObject<HTMLElement | null> }) {
  const [rect, setRect] = React.useState<DOMRect | null>(null);

  React.useEffect(() => {
    const update = () => {
      if (targetRef.current) {
        setRect(targetRef.current.getBoundingClientRect());
      }
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [targetRef]);

  if (!rect) {
    return null;
  }

  const padding = 6;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-50">
      <div
        className="absolute rounded-md ring-4 ring-blue-400"
        style={{
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
          height: rect.height + padding * 2,
          left: rect.left - padding,
          top: rect.top - padding,
          width: rect.width + padding * 2,
        }}
      />
    </div>,
    document.body
  );
}

export function OptometristPatientDetails({
  activeCallTakenByMe,
  onBack,
  readOnly = false,
  selectedCustomer,
}: OptometristPatientDetailsProps) {
  const dispatch = useAppDispatch();
  const { toast } = useToast();

  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false);
  const [isConsultationOpen, setIsConsultationOpen] = React.useState(false);
  const [isConsultationMinimized, setIsConsultationMinimized] = React.useState(false);
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = React.useState(false);
  const [isAcceptHighlighted, setIsAcceptHighlighted] = React.useState(false);
  const [openLightbox, setOpenLightbox] = React.useState<'autoRef' | 'pgp' | null>(null);
  const acceptButtonRef = React.useRef<HTMLButtonElement | null>(null);

  const highlightAcceptButton = () => {
    acceptButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setIsAcceptHighlighted(true);
    window.setTimeout(() => setIsAcceptHighlighted(false), 2000);
  };

  const buildTimestamp = (): string =>
    new Date().toLocaleString('en-US', {
      day: 'numeric',
      hour: 'numeric',
      hour12: true,
      minute: '2-digit',
      month: 'short',
      second: '2-digit',
      year: 'numeric',
    });

  const applyStatusUpdate = async (status: CustomerStatus) => {
    if (!selectedCustomer) {
      return;
    }

    setIsUpdatingStatus(true);

    const updatedCustomer: Customer = {
      ...selectedCustomer,
      lastUpdatedOn: buildTimestamp(),
      status,
    };

    if (
      status === 'Test Completed' ||
      status === 'Completed' ||
      status === 'Closed' ||
      status === 'Cancelled' ||
      status === 'Created' ||
      status === 'Drop'
    ) {
      updatedCustomer.callActive = false;
    }

    if (status === 'Created' || status === 'Drop') {
      updatedCustomer.callTakenBy = null;
    }

    try {
      await dispatch(updateCustomerAction(selectedCustomer.id, updatedCustomer));
      const displayStatus = status === 'Created' ? 'Queued' : status;
      toast({
        description: `Customer status updated to ${displayStatus}.`,
        title: 'Status Updated',
        type: 'success',
      });
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      toast({
        description: `Failed to update status: ${err.message || 'Database error'}`,
        title: 'Error Updating Status',
        type: 'error',
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAcceptCall = async () => {
    if (!selectedCustomer) {
      return;
    }

    setIsUpdatingStatus(true);

    try {
      await dispatch(initiateCallAction(selectedCustomer.id));
      toast({
        description: 'Customer status updated to Accepted.',
        title: 'Status Updated',
        type: 'success',
      });
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      toast({
        description: err.message || 'Failed to accept this call.',
        title: 'Error Accepting Call',
        type: 'error',
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleCompleteClick = () => {
    if (!isOptometristRxComplete(selectedCustomer?.optometristRxData)) {
      toast({
        description:
          'Sph, Cyl, Axis and VA are required for both eyes. Start the consultation and fill in the Subjective/Final prescription before marking as Completed.',
        title: 'Prescription Incomplete',
        type: 'error',
      });

      return;
    }

    void applyStatusUpdate('Test Completed');
  };

  const handleDropCall = async () => {
    if (!selectedCustomer) {
      return;
    }

    try {
      await dispatch(dropCallAction(selectedCustomer.id));
      toast({
        description: 'Call dropped and routed to the next available Optometrist doctor.',
        title: 'Call Dropped',
        type: 'info',
      });
      onBack();
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      toast({
        description: `Failed to drop call: ${err.message || 'Database error'}`,
        title: 'Error Dropping Call',
        type: 'error',
      });
    }
  };

  const handleBackClick = () => {
    if (selectedCustomer?.status === 'Initiated') {
      setIsLeaveConfirmOpen(true);

      return;
    }

    onBack();
  };

  const handleConfirmLeave = async () => {
    if (!selectedCustomer) {
      setIsLeaveConfirmOpen(false);
      onBack();

      return;
    }

    try {
      await dispatch(rejectCallAction(selectedCustomer.id));
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      toast({
        description: err.message || 'Failed to release this call.',
        title: 'Error Releasing Call',
        type: 'error',
      });
    } finally {
      setIsLeaveConfirmOpen(false);
      onBack();
    }
  };

  const languages = [selectedCustomer?.preferredLanguage, selectedCustomer?.preferredLanguage2].filter(
    (lang): lang is string => Boolean(lang) && lang !== 'None'
  );

  const hasOtherActiveCall = Boolean(activeCallTakenByMe && activeCallTakenByMe.id !== selectedCustomer?.id);

  const autoRefImages: LightboxImage[] = selectedCustomer?.storeFeedbackImage1
    ? [
        {
          alt: 'Auto Ref attachment',
          src: `${API_BASE_URL}/customers/${encodeURIComponent(selectedCustomer.id)}/feedback-image/1`,
        },
      ]
    : [];

  const pgpImages: LightboxImage[] = selectedCustomer?.storeFeedbackImage2
    ? [
        {
          alt: 'PGP attachment',
          src: `${API_BASE_URL}/customers/${encodeURIComponent(selectedCustomer.id)}/feedback-image/2`,
        },
      ]
    : [];

  return (
    <main className="font-pro mx-auto w-full max-w-[1400px] flex-1 space-y-4 px-3 py-4 duration-200 animate-in fade-in sm:space-y-6 sm:px-6 sm:py-8 md:px-8">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <h1 className="text-lg font-bold text-foreground sm:text-xl">Customer Details</h1>

        <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
          <Button
            className="active:scale-98 flex h-10 cursor-pointer items-center gap-1.5 rounded-md border-gray-200 bg-white px-4 text-sm font-normal text-gray-600 shadow-sm transition-all hover:bg-slate-50 dark:border-border dark:bg-card dark:text-foreground"
            onClick={handleBackClick}
            type="button"
            variant="secondary"
          >
            <ChevronLeft size={16} />
            Back
          </Button>

          {readOnly ? null : selectedCustomer?.status === 'Accepted' ||
            selectedCustomer?.status === 'Testing' ? (
            <div className="inline-flex h-10 items-center overflow-hidden rounded-md border border-border">
              <button
                className="h-full cursor-pointer bg-white px-4 text-sm font-normal text-foreground transition-colors hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-card"
                disabled={isUpdatingStatus}
                onClick={handleCompleteClick}
                type="button"
              >
                Completed
              </button>
              <div className="h-full w-px bg-border" />
              <button
                className="h-full cursor-pointer bg-white px-4 text-sm font-normal text-foreground transition-colors hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-card"
                disabled={isUpdatingStatus}
                onClick={handleDropCall}
                type="button"
              >
                Dropped
              </button>
            </div>
          ) : (
            selectedCustomer?.status !== 'Completed' &&
            selectedCustomer?.status !== 'Closed' && (
              <Button
                className={`active:scale-98 relative flex h-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-6 text-sm font-normal text-white shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                  isAcceptHighlighted ? 'z-[60] animate-pulse' : ''
                }`}
                disabled={isUpdatingStatus || hasOtherActiveCall}
                onClick={handleAcceptCall}
                ref={acceptButtonRef}
                title={hasOtherActiveCall ? 'You already have an active call in progress.' : undefined}
                type="button"
                variant="primary"
              >
                Accept
              </Button>
            )
          )}
        </div>
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
        >
          {autoRefImages.length > 0 && (
            <Button
              className="active:scale-98 flex h-8 cursor-pointer items-center gap-1.5 rounded-md border-gray-200 bg-white px-3 text-xs font-normal text-gray-600 shadow-sm transition-all hover:bg-slate-50 dark:border-border dark:bg-card dark:text-foreground"
              onClick={() => setOpenLightbox('autoRef')}
              type="button"
              variant="secondary"
            >
              <Images size={14} />
              View
            </Button>
          )}
        </RxDeviceCard>

        <RxDeviceCard
          imageAlt="PGP"
          imageSrc="/images/pgp.png"
          leftValues={selectedCustomer?.rxData?.pgpLe}
          rightValues={selectedCustomer?.rxData?.pgpRe}
          title="PGP"
        >
          {pgpImages.length > 0 && (
            <Button
              className="active:scale-98 flex h-8 cursor-pointer items-center gap-1.5 rounded-md border-gray-200 bg-white px-3 text-xs font-normal text-gray-600 shadow-sm transition-all hover:bg-slate-50 dark:border-border dark:bg-card dark:text-foreground"
              onClick={() => setOpenLightbox('pgp')}
              type="button"
              variant="secondary"
            >
              <Images size={14} />
              View
            </Button>
          )}
        </RxDeviceCard>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-medium text-foreground">Store Action / Feedback</h2>

        <CardFrame className="p-5">
          {selectedCustomer?.storeFeedback ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {selectedCustomer.storeFeedback}
            </p>
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

      {!readOnly && selectedCustomer?.status !== 'Completed' && selectedCustomer?.status !== 'Closed' && (
        <div className="flex flex-col items-center gap-2">
          <Button
            className="active:scale-98 flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-md text-sm font-normal text-white shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            disabled={!selectedCustomer || hasOtherActiveCall}
            onClick={() => {
              if (!selectedCustomer) {
                return;
              }

              if (hasOtherActiveCall) {
                toast({
                  description: 'Finish or drop your current consultation before starting another.',
                  title: 'Consultation Already In Progress',
                  type: 'error',
                });

                return;
              }

              if (selectedCustomer.status !== 'Accepted') {
                highlightAcceptButton();

                return;
              }

              if (isConsultationOpen && isConsultationMinimized) {
                setIsConsultationMinimized(false);
              } else {
                setIsConsultationOpen(true);
                setIsConsultationMinimized(false);
              }
            }}
            title={
              hasOtherActiveCall
                ? 'You already have an active consultation in progress.'
                : selectedCustomer && selectedCustomer.status !== 'Accepted'
                  ? 'Accept the patient in order to consult this patient'
                  : undefined
            }
            type="button"
            variant="primary"
          >
            <Video size={16} />
            {isConsultationOpen && isConsultationMinimized ? 'Resume Consultation' : 'Start Consultation'}
          </Button>

          {hasOtherActiveCall ? (
            <p className="text-sm text-muted-foreground">
              You already have an active consultation in progress.
            </p>
          ) : (
            selectedCustomer &&
            selectedCustomer.status !== 'Accepted' && (
              <p className="text-sm text-muted-foreground">Accept the customer to start consulting.</p>
            )
          )}
        </div>
      )}

      {openLightbox === 'autoRef' && autoRefImages.length > 0 && (
        <ImageLightbox images={autoRefImages} onClose={() => setOpenLightbox(null)} startIndex={0} />
      )}

      {openLightbox === 'pgp' && pgpImages.length > 0 && (
        <ImageLightbox images={pgpImages} onClose={() => setOpenLightbox(null)} startIndex={0} />
      )}

      {isAcceptHighlighted && <SpotlightOverlay targetRef={acceptButtonRef} />}

      {isConsultationOpen && selectedCustomer && (
        <OptometristCallDrawer
          customer={selectedCustomer}
          minimized={isConsultationMinimized}
          onClose={() => {
            setIsConsultationOpen(false);
            setIsConsultationMinimized(false);
          }}
          onMinimize={() => setIsConsultationMinimized(true)}
        />
      )}

      <Dialog onOpenChange={setIsLeaveConfirmOpen} open={isLeaveConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave without accepting?</DialogTitle>
            <DialogDescription>
              You haven't accepted this call yet. Going back now will release this customer so the call can be
              transferred to another available Optometrist, or the request will be declined if no one else is
              available.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setIsLeaveConfirmOpen(false)} type="button" variant="secondary">
              Stay
            </Button>
            <Button onClick={handleConfirmLeave} type="button" variant="primary">
              Leave &amp; Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
