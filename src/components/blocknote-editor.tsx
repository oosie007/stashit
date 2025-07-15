import React from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';

interface BlockNoteEditorProps {
  value?: string;
  onChange: (value: string) => void;
}

const BlockNoteEditor: React.FC<BlockNoteEditorProps> = ({ value, onChange }) => {
  const initialContent = value ? (() => {
    try {
      return JSON.parse(value);
    } catch {
      return undefined;
    }
  })() : undefined;

  const editor = useCreateBlockNote({ initialContent });

  return (
    <BlockNoteView
      editor={editor}
      onChange={() => {
        const json = JSON.stringify(editor.document);
        onChange(json);
      }}
    />
  );
};

export default BlockNoteEditor; 