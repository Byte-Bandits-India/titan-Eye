import { X } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';

export interface TagInputProps {
  className?: string;
  onChange: (tags: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  value: string[];
}

export function TagInput({ className, onChange, placeholder, suggestions, value }: TagInputProps) {
  const [draft, setDraft] = React.useState('');

  const addTag = (raw: string) => {
    const trimmed = raw.trim();

    if (!trimmed) {
      return;
    }

    const tag = trimmed[0]!.toUpperCase() + trimmed.slice(1);

    const alreadyExists = value.some((t) => t.toLowerCase() === tag.toLowerCase());

    if (!alreadyExists) {
      onChange([...value, tag]);
    }

    setDraft('');
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  return (
    <div
      className={cn(
        'rounded-xs flex min-h-10 w-full flex-wrap items-center gap-1.5 border border-border bg-card px-2 py-1.5 shadow-sm transition-all focus-within:border-transparent focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500',
        className
      )}
    >
      {value.map((tag) => (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-sm font-medium text-foreground"
          key={tag}
        >
          {tag}
          <button
            className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => removeTag(tag)}
            type="button"
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        className="min-w-[100px] flex-1 border-0 bg-transparent px-1 py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        list={suggestions ? 'tag-input-suggestions' : undefined}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(draft);
          } else if (e.key === 'Backspace' && !draft && value.length > 0) {
            removeTag(value[value.length - 1]!);
          }
        }}
        placeholder={value.length === 0 ? placeholder : ''}
        type="text"
        value={draft}
      />
      {suggestions && (
        <datalist id="tag-input-suggestions">
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
    </div>
  );
}
