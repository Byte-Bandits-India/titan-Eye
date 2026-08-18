import { FilmIcon, UploadIcon, XIcon } from 'lucide-react';
import * as React from 'react';

import { formatBytes, useFileUpload } from '../../../hooks/use-file-upload';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Spinner } from '../../../components/ui/spinner';
import { cn } from '../../../lib/utils';

const MAX_VIDEO_SIZE = 1024 * 1024 * 1024; // 1GB

export type VideoUploadDialogProps = {
  isUploading: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadFile: (file: File, title: string) => Promise<void>;
  open: boolean;
};

export function VideoUploadDialog({ isUploading, onOpenChange, onUploadFile, open }: VideoUploadDialogProps) {
  const [title, setTitle] = React.useState('');

  const [
    { files, isDragging, errors },
    {
      removeFile,
      clearFiles,
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      getInputProps,
    },
  ] = useFileUpload({
    accept: 'video/*',
    maxSize: MAX_VIDEO_SIZE,
    multiple: false,
  });

  const selectedFileEntry = files[0];
  const selectedFile = selectedFileEntry?.file instanceof File ? selectedFileEntry.file : null;

  const resetState = () => {
    setTitle('');
    clearFiles();
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetState();
    }

    onOpenChange(nextOpen);
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      return;
    }

    await onUploadFile(selectedFile, title.trim() || selectedFile.name);
    resetState();
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Video</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            disabled={isUploading}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Video title (optional)"
            value={title}
          />

          <div
            className={cn(
              'relative rounded-lg border border-dashed p-6 text-center transition-colors',
              isDragging
                ? 'bg-primary/5 border-primary'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            )}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input {...getInputProps()} className="sr-only" disabled={isUploading} />

            {selectedFile ? (
              <div className="flex items-center justify-between gap-2 text-left">
                <div className="flex min-w-0 items-center gap-2">
                  <FilmIcon className="size-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(selectedFile.size)}</p>
                  </div>
                </div>
                <Button
                  disabled={isUploading}
                  onClick={() => selectedFileEntry && removeFile(selectedFileEntry.id)}
                  size="icon-sm"
                  variant="ghost"
                >
                  <XIcon />
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <UploadIcon className="size-5 text-muted-foreground" />
                <p className="text-sm font-medium">Drag and drop a video here</p>
                <p className="text-xs text-muted-foreground">or click below to browse</p>
                <Button className="mt-1" onClick={openFileDialog} size="sm" type="button" variant="outline">
                  Select video
                </Button>
              </div>
            )}
          </div>

          {errors.length > 0 && <p className="text-xs text-red-500">{errors[0]}</p>}
        </div>

        <DialogFooter>
          <Button disabled={isUploading} onClick={() => handleOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button disabled={!selectedFile || isUploading} onClick={handleSubmit} variant="gradient">
            {isUploading && <Spinner className="size-4" />}
            {isUploading ? 'Saving...' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
