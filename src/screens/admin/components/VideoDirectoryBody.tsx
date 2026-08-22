import { FilmIcon, LinkIcon, MonitorPlayIcon, PlayIcon, Trash2Icon, UploadIcon } from 'lucide-react';
import * as React from 'react';

import type { ManagedVideo } from '../../../types';

import { CardFrame, CardHeader } from '../../../components/shared/CardFrame';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { API_BASE_URL } from '../../../options/Option';
import { formatBytes } from '../../../hooks/use-file-upload';
import { getYoutubeEmbedUrl } from '../../../utils/youtube';

export type VideoDirectoryBodyProps = {
  onDelete: (video: ManagedVideo) => void;
  onSetTvModeVideo: (video: ManagedVideo) => void;
  onUploadClick: () => void;
  tvModeVideoId: null | number;
  videos: ManagedVideo[];
};

export function VideoDirectoryBody({
  onDelete,
  onSetTvModeVideo,
  onUploadClick,
  tvModeVideoId,
  videos,
}: VideoDirectoryBodyProps) {
  const [previewVideo, setPreviewVideo] = React.useState<ManagedVideo | null>(null);

  return (
    <CardFrame className="!mt-4 flex h-[600px] flex-col">
      <CardHeader
        icon={FilmIcon}
        iconGradient="from-purple-500 to-purple-800"
        right={
          <Button className="h-9 gap-2 px-3 text-sm font-medium" onClick={onUploadClick} variant="primary">
            <UploadIcon size={14} />
            Add Video
          </Button>
        }
        title="Video Library"
      />

      <div className="relative min-h-0 flex-1 overflow-auto">
        {videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <FilmIcon className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No videos added yet</p>
            <p className="text-sm text-muted-foreground">
              Upload a file or paste a YouTube link to make it available in the admin console.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="sticky top-0 z-10">
              <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
                <TableHead className="text-sm font-medium text-muted-foreground">Title</TableHead>
                <TableHead className="text-sm font-medium text-muted-foreground">Source</TableHead>
                <TableHead className="text-sm font-medium text-muted-foreground">Uploaded By</TableHead>
                <TableHead className="text-sm font-medium text-muted-foreground">Uploaded On</TableHead>
                <TableHead className="w-32 text-right text-sm font-medium text-muted-foreground">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {videos.map((video) => {
                const isTvModeVideo = tvModeVideoId === video.id;

                return (
                  <TableRow key={video.id}>
                    <TableCell className="max-w-[280px] text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{video.title}</span>
                        {isTvModeVideo && (
                          <Badge className="shrink-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                            TV Mode
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {video.sourceType === 'youtube' ? 'YouTube' : formatBytes(video.size ?? 0)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{video.uploadedBy}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(video.uploadedAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          onClick={() => setPreviewVideo(video)}
                          size="icon-sm"
                          title="Play"
                          variant="ghost"
                        >
                          <PlayIcon size={14} />
                        </Button>
                        <Button
                          disabled={isTvModeVideo}
                          onClick={() => onSetTvModeVideo(video)}
                          size="icon-sm"
                          title={isTvModeVideo ? 'Currently playing in TV Mode' : 'Set as TV Mode video'}
                          variant="ghost"
                        >
                          <MonitorPlayIcon className={isTvModeVideo ? 'text-emerald-600' : ''} size={14} />
                        </Button>
                        <Button onClick={() => onDelete(video)} size="icon-sm" title="Delete" variant="ghost">
                          <Trash2Icon className="text-red-500" size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog onOpenChange={(open) => !open && setPreviewVideo(null)} open={Boolean(previewVideo)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewVideo?.title}</DialogTitle>
          </DialogHeader>
          {previewVideo &&
            (previewVideo.sourceType === 'youtube' && previewVideo.youtubeUrl ? (
              <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
                {(() => {
                  const embedUrl = getYoutubeEmbedUrl(previewVideo.youtubeUrl, { autoplay: true });

                  return embedUrl ? (
                    <iframe
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="h-full w-full"
                      src={embedUrl}
                      title={previewVideo.title}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center gap-2 text-sm text-white">
                      <LinkIcon size={14} />
                      Invalid YouTube link
                    </div>
                  );
                })()}
              </div>
            ) : (
              <video
                className="w-full rounded-lg bg-black"
                controls
                src={`${API_BASE_URL}/videos/${previewVideo.id}/stream`}
              />
            ))}
        </DialogContent>
      </Dialog>
    </CardFrame>
  );
}
