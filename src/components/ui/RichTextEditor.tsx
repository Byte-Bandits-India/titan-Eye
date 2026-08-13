import Quill from 'quill';
import * as React from 'react';
import 'quill/dist/quill.snow.css';

interface RichTextEditorProps {
  minHeight?: string;
  onChange?: (val: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  value: string;
}

export function RichTextEditor({
  minHeight,
  onChange,
  placeholder,
  readOnly = false,
  value,
}: RichTextEditorProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const quillRef = React.useRef<null | Quill>(null);
  const isUpdatingRef = React.useRef(false);

  React.useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    containerRef.current.innerHTML = '';

    const editorContainer = document.createElement('div');
    containerRef.current.appendChild(editorContainer);

    const quill = new Quill(editorContainer, {
      modules: {
        toolbar: readOnly
          ? false
          : [
              ['bold', 'italic', 'underline', 'strike'],
              [{ align: [] }],
              [{ list: 'ordered' }, { list: 'bullet' }],
              [{ indent: '-1' }, { indent: '+1' }],
              [{ header: [1, 2, 3, false] }],
              [{ size: ['small', false, 'large', 'huge'] }],
              ['link', 'image', 'video'],
              [{ color: [] }, { background: [] }],
              ['clean'],
            ],
      },
      placeholder: readOnly ? '' : placeholder || 'Write something amazing...',
      readOnly,
      theme: 'snow',
    });

    quillRef.current = quill;

    if (value) {
      quill.clipboard.dangerouslyPasteHTML(value);
    }

    quill.on('text-change', () => {
      if (isUpdatingRef.current) {
        return;
      }

      const html = editorContainer.querySelector('.ql-editor')?.innerHTML || '';

      if (onChange) {
        onChange(html === '<p><br></p>' ? '' : html);
      }
    });

    const container = containerRef.current;

    return () => {
      if (container) {
        container.innerHTML = '';
      }

      quillRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly]);

  // Update value from props
  React.useEffect(() => {
    if (quillRef.current) {
      const editorElement = containerRef.current?.querySelector('.ql-editor');

      if (editorElement && editorElement.innerHTML !== value) {
        isUpdatingRef.current = true;
        const range = quillRef.current.getSelection();
        quillRef.current.clipboard.dangerouslyPasteHTML(value || '');

        if (range) {
          quillRef.current.setSelection(range.index, range.length);
        }

        isUpdatingRef.current = false;
      }
    }
  }, [value]);

  // Direct DOM style overrides to ensure they work in production
  React.useEffect(() => {
    if (containerRef.current) {
      const editorElement = containerRef.current.querySelector('.ql-editor') as HTMLElement;

      if (editorElement) {
        editorElement.style.minHeight = minHeight || (readOnly ? '100px' : '150px');
      }

      const containerElement = containerRef.current.querySelector('.ql-container') as HTMLElement;

      if (containerElement) {
        containerElement.style.border = 'none';
      }
    }
  }, [minHeight, readOnly, value]);

  return (
    <div
      className={`w-full overflow-hidden rounded-lg border border-gray-300 shadow-sm ${readOnly ? 'cursor-not-allowed bg-slate-50/50' : 'bg-white'}`}
    >
      <div ref={containerRef} />
    </div>
  );
}
