import * as React from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

interface RichTextEditorProps {
  value: string;
  onChange?: (val: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

export function RichTextEditor({ value, onChange, placeholder, readOnly = false }: RichTextEditorProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const quillRef = React.useRef<Quill | null>(null);
  const isUpdatingRef = React.useRef(false);

  React.useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = '';

    const editorContainer = document.createElement('div');
    containerRef.current.appendChild(editorContainer);

    const quill = new Quill(editorContainer, {
      theme: 'snow',
      readOnly: readOnly,
      placeholder: readOnly ? '' : (placeholder || 'Write something amazing...'),
      modules: {
        toolbar: readOnly ? false : [
          ['bold', 'italic', 'underline', 'strike'],
          [{ 'align': [] }],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          [{ 'indent': '-1'}, { 'indent': '+1' }],
          [{ 'header': [1, 2, 3, false] }],
          [{ 'size': ['small', false, 'large', 'huge'] }],
          ['link', 'image', 'video'],
          [{ 'color': [] }, { 'background': [] }],
          ['clean']
        ]
      }
    });

    quillRef.current = quill;

    if (value) {
      quill.clipboard.dangerouslyPasteHTML(value);
    }

    quill.on('text-change', () => {
      if (isUpdatingRef.current) return;
      const html = editorContainer.querySelector('.ql-editor')?.innerHTML || '';
      if (onChange) {
        onChange(html === '<p><br></p>' ? '' : html);
      }
    });

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      quillRef.current = null;
    };
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

  return (
    <div className={`w-full rounded-lg overflow-hidden border border-gray-300 shadow-sm ${readOnly ? 'bg-slate-50/50 cursor-not-allowed' : 'bg-white'}`}>
      <style>{`
        .ql-container .ql-editor {
          min-height: ${readOnly ? '100px' : '200px'};
        }
        .ql-container.ql-snow {
          border: none !important;
        }
      `}</style>
      <div ref={containerRef} />
    </div>
  );
}
