import { AxiosError } from 'axios';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { apiClient } from '../../Util/apiClient';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

interface OptomAvatarProps {
  className?: string;
  email: string;
  name: string;
}

export function OptomAvatar({ className, email, name }: OptomAvatarProps) {
  const [photoUrl, setPhotoUrl] = React.useState<null | string>(null);

  React.useEffect(() => {
    let objectUrl: null | string = null;
    let cancelled = false;

    apiClient
      .get(`/users/${encodeURIComponent(email)}/photo`, { responseType: 'blob' })
      .then((res) => {
        if (cancelled) {return;}

        const blob = res.data as Blob;

        if (res.status === 204 || blob.size === 0) {return;}

        objectUrl = URL.createObjectURL(blob);
        setPhotoUrl(objectUrl);
      })
      .catch((err: AxiosError) => {
        if (err.response?.status === 404) {return;}

        console.error(`Failed to load photo for ${email}:`, err.message);
      });

    return () => {
      cancelled = true;

      if (objectUrl) {URL.revokeObjectURL(objectUrl);}
    };
  }, [email]);

  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Avatar className={cn('w-9 h-9 shrink-0', className)}>
      {photoUrl && <AvatarImage alt={name} src={photoUrl} />}
      <AvatarFallback className="bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 font-bold text-xs">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
