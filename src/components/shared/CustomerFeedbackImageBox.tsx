import { Camera, ImagePlus, X } from 'lucide-react';
import * as React from 'react';

import { useFileUpload } from '../../hooks/use-file-upload';
import { apiClient } from '../../Util/apiClient';
import { cn } from '../../lib/utils';
import { API_BASE_URL } from '../../options/Option';
import { Spinner } from '../ui/spinner';
import { useToast } from '../ui/toast';

const MAX_FEEDBACK_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

type CustomerFeedbackImageBoxProps = {
  customerId: string;
  hasImage: boolean;
  slot: 1 | 2;
};

export function CustomerFeedbackImageBox({ customerId, hasImage, slot }: CustomerFeedbackImageBoxProps) {
  const { toast } = useToast();
  const [present, setPresent] = React.useState(hasImage);
  const [cacheBust, setCacheBust] = React.useState(0);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isRemoving, setIsRemoving] = React.useState(false);
  const [prevHasImage, setPrevHasImage] = React.useState(hasImage);

  if (hasImage !== prevHasImage) {
    setPrevHasImage(hasImage);
    setPresent(hasImage);
  }

  const handleUpload = React.useCallback(
    async (file: File) => {
      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append('image', file);
        await apiClient.post(`/customers/${encodeURIComponent(customerId)}/feedback-image/${slot}`, formData);
        setPresent(true);
        setCacheBust((v) => v + 1);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        toast({
          description: err.message || 'Failed to upload image.',
          title: 'Upload Failed',
          type: 'error',
        });
      } finally {
        setIsUploading(false);
      }
    },
    [customerId, slot, toast]
  );

  const [
    { errors, isDragging },
    { getInputProps, handleDragEnter, handleDragLeave, handleDragOver, handleDrop, openFileDialog },
  ] = useFileUpload({
    accept: 'image/*',
    maxSize: MAX_FEEDBACK_IMAGE_SIZE,
    multiple: false,
    onFilesAdded: (added) => {
      const file = added[0]?.file instanceof File ? added[0].file : null;

      if (file) {
        void handleUpload(file);
      }
    },
  });

  const cameraInputRef = React.useRef<HTMLInputElement>(null);

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';

    if (!file) {
      return;
    }

    if (file.size > MAX_FEEDBACK_IMAGE_SIZE) {
      toast({
        description: `File exceeds the maximum size of ${(MAX_FEEDBACK_IMAGE_SIZE / (1024 * 1024)).toFixed(0)}MB.`,
        title: 'File Too Large',
        type: 'error',
      });

      return;
    }

    void handleUpload(file);
  };

  const handleRemove = async () => {
    setIsRemoving(true);

    try {
      await apiClient.delete(`/customers/${encodeURIComponent(customerId)}/feedback-image/${slot}`);
      setPresent(false);
      setCacheBust((v) => v + 1);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      toast({
        description: err.message || 'Failed to remove image.',
        title: 'Remove Failed',
        type: 'error',
      });
    } finally {
      setIsRemoving(false);
    }
  };

  const imageUrl = `${API_BASE_URL}/customers/${encodeURIComponent(customerId)}/feedback-image/${slot}?v=${cacheBust}`;
  const disabled = isUploading || isRemoving || !customerId;

  return (
    <div
      className={cn(
        'relative flex h-[176px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed p-2 text-center transition-colors',
        isDragging
          ? 'bg-primary/5 border-primary'
          : 'border-muted-foreground/25 hover:border-muted-foreground/50'
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input {...getInputProps()} className="sr-only" disabled={disabled} />
      <input
        accept="image/*"
        capture="environment"
        className="sr-only"
        disabled={disabled}
        onChange={handleCameraChange}
        ref={cameraInputRef}
        type="file"
      />

      {present ? (
        <>
          <img
            alt={`Store feedback attachment ${slot}`}
            className="h-full max-h-28 w-full rounded object-cover"
            src={imageUrl}
          />
          <button
            className="absolute right-1 top-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={disabled}
            onClick={handleRemove}
            title="Remove image"
            type="button"
          >
            <X className="h-3 w-3" />
          </button>
        </>
      ) : (
        <div className="flex items-center gap-2.5 text-muted-foreground">
          <button
            className="flex cursor-pointer flex-col items-center gap-1 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={disabled}
            onClick={() => cameraInputRef.current?.click()}
            type="button"
          >
            {isUploading ? <Spinner className="size-4" /> : <Camera className="size-5" />}
            <span className="text-[11px] font-medium">{isUploading ? 'Uploading…' : 'Camera'}</span>
          </button>
          <div className="h-8 w-px bg-border" />
          <button
            className="flex cursor-pointer flex-col items-center gap-1 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={disabled}
            onClick={openFileDialog}
            type="button"
          >
            {isUploading ? <Spinner className="size-4" /> : <ImagePlus className="size-5" />}
            <span className="text-[11px] font-medium">{isUploading ? 'Uploading…' : 'Upload'}</span>
          </button>
        </div>
      )}

      {errors.length > 0 && <p className="mt-1 text-[10px] text-red-500">{errors[0]}</p>}
    </div>
  );
}
