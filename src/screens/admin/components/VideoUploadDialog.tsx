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
      <DialogContent className="w-full max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-foreground">Add Video</DialogTitle>
        </DialogHeader>

        <div className="w-full min-w-0 space-y-4 py-1">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Video Title</label>
            <Input
              className="w-full"
              disabled={isUploading}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Video title (optional, defaults to file name)"
              value={title}
            />
          </div>

          <div
            className={cn(
              'relative w-full overflow-hidden rounded-xl border-2 border-dashed p-6 text-center transition-colors',
              isDragging
                ? 'border-purple-500 bg-purple-50/50 dark:border-purple-400 dark:bg-purple-950/20'
                : 'border-border bg-slate-50/50 hover:border-slate-400 dark:bg-zinc-900/30'
            )}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input {...getInputProps()} className="sr-only" disabled={isUploading} />

            {selectedFile ? (
              <div className="flex w-full min-w-0 items-center justify-between gap-3 text-left">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                    <FilmIcon size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground" title={selectedFile.name}>
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatBytes(selectedFile.size)}</p>
                  </div>
                </div>
                <Button
                  className="h-8 w-8 shrink-0 rounded-lg p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                  disabled={isUploading}
                  onClick={() => selectedFileEntry && removeFile(selectedFileEntry.id)}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  <XIcon size={16} />
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
                  <UploadIcon size={20} />
                </div>
                <p className="text-sm font-medium text-foreground">Drag and drop a video here</p>
                <p className="text-xs text-muted-foreground">MP4, WebM, MOV supported (up to 1GB)</p>
                <Button
                  className="mt-2 h-8 px-4 text-xs font-medium"
                  onClick={openFileDialog}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  Browse Files
                </Button>
              </div>
            )}
          </div>

          {errors.length > 0 && <p className="text-xs font-medium text-red-500">{errors[0]}</p>}
        </div>

        <DialogFooter className="mt-4 border-t border-border pt-3">
          <Button
            className="h-9 px-4 text-sm font-medium"
            disabled={isUploading}
            onClick={() => handleOpenChange(false)}
            type="button"
            variant="secondary"
          >
            Cancel
          </Button>
          <Button
            className="h-9 gap-2 px-5 text-sm font-medium shadow-sm"
            disabled={!selectedFile || isUploading}
            onClick={handleSubmit}
            type="button"
            variant="primary"
          >
            {isUploading && <Spinner className="size-4" />}
            {isUploading ? 'Uploading…' : 'Upload Video'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
