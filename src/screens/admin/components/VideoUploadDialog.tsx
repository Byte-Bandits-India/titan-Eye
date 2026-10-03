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
import { useToast } from '../../../components/ui/toast';
import { cn } from '../../../lib/utils';

const MAX_VIDEO_SIZE = 1024 * 1024 * 1024; // 1GB

export type VideoUploadDialogProps = {
  isUploading: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadFile: (file: File, title: string) => Promise<void>;
  open: boolean;
};

export const VideoUploadDialog = React.memo(
  function VideoUploadDialog({ isUploading, onOpenChange, onUploadFile, open }: VideoUploadDialogProps) {
    const { toast } = useToast();
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
      accept: 'video/mp4,video/webm,video/ogg,video/quicktime,.mp4,.webm,.mov,.ogg',
      maxSize: MAX_VIDEO_SIZE,
      multiple: false,
      onFilesAdded: (added) => {
        const file = added[0]?.file instanceof File ? added[0].file : null;

        if (file) {
          const lowerName = file.name.toLowerCase();
          const dangerousExts = ['.exe', '.bat', '.cmd', '.sh', '.dll', '.php', '.jsp', '.asp', '.js'];

          if (dangerousExts.some((ext) => lowerName.endsWith(ext))) {
            toast({
              description: 'Executable and script files are strictly forbidden for security reasons.',
              title: 'Security Violation',
              type: 'error',
            });
            clearFiles();

            return;
          }

          const validExts = ['.mp4', '.webm', '.mov', '.ogg', '.ogv'];

          if (!validExts.some((ext) => lowerName.endsWith(ext))) {
            toast({
              description: 'Only valid video files (.mp4, .webm, .mov, .ogg) are accepted.',
              title: 'Invalid File Format',
              type: 'error',
            });
            clearFiles();

            return;
          }
        }
      },
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

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!selectedFile || !title.trim()) {
        return;
      }

      if (/[<>{}]|script/i.test(title)) {
        toast({
          description: 'Video title contains invalid special characters or HTML/script tags.',
          title: 'Invalid Title',
          type: 'error',
        });

        return;
      }

      const lowerName = selectedFile.name.toLowerCase();
      const dangerousExts = ['.exe', '.bat', '.cmd', '.sh', '.dll', '.php', '.jsp', '.asp', '.js'];

      if (dangerousExts.some((ext) => lowerName.endsWith(ext))) {
        toast({
          description: 'Executable and script files are strictly forbidden for security reasons.',
          title: 'Security Violation',
          type: 'error',
        });
        resetState();

        return;
      }

      await onUploadFile(selectedFile, title.trim());
      resetState();
    };

    return (
      <Dialog onOpenChange={handleOpenChange} open={open}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload TV Mode Video</DialogTitle>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Video Title</label>
              <Input
                disabled={isUploading}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Titan Eye+ Promotional Video 2024"
                value={title}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Video File (MP4, WebM, etc.)</label>
              {!selectedFile ? (
                <div
                  className={cn(
                    'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors',
                    isDragging
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-muted/30 hover:border-muted-foreground/50 hover:bg-muted/50'
                  )}
                  onClick={openFileDialog}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <input {...getInputProps()} />
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <UploadIcon size={18} />
                  </div>
                  <p className="text-sm font-medium text-foreground">Click to upload or drag and drop</p>
                  <p className="mt-1 text-sm text-muted-foreground">MP4, WebM, OGG up to 1GB</p>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3 shadow-xs">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                      <FilmIcon size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">{formatBytes(selectedFile.size)}</p>
                    </div>
                  </div>

                  <Button
                    disabled={isUploading}
                    onClick={() => selectedFileEntry && removeFile(selectedFileEntry.id)}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <XIcon size={16} />
                  </Button>
                </div>
              )}

              {errors.length > 0 && <p className="text-sm text-destructive">{errors[0]}</p>}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button disabled={isUploading} onClick={() => handleOpenChange(false)} type="button" variant="secondary">
                Cancel
              </Button>
              <Button
                className="gap-2"
                disabled={!selectedFile || !title.trim() || isUploading}
                type="submit"
                variant="primary"
              >
                {isUploading && <Spinner className="size-4" />}
                {isUploading ? 'Uploading...' : 'Upload Video'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  },
  (prev, next) =>
    prev.open === next.open &&
    prev.isUploading === next.isUploading
);
