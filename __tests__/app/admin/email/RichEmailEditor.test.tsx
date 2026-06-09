import { render, screen } from '@testing-library/react';

import { RichEmailEditor } from '@/app/(portal)/admin/email/_components/RichEmailEditor';

const editorChain = {
  focus: jest.fn(() => editorChain),
  toggleBold: jest.fn(() => editorChain),
  toggleItalic: jest.fn(() => editorChain),
  toggleUnderline: jest.fn(() => editorChain),
  toggleHeading: jest.fn(() => editorChain),
  toggleBulletList: jest.fn(() => editorChain),
  toggleOrderedList: jest.fn(() => editorChain),
  setTextAlign: jest.fn(() => editorChain),
  extendMarkRange: jest.fn(() => editorChain),
  setLink: jest.fn(() => editorChain),
  unsetLink: jest.fn(() => editorChain),
  setHorizontalRule: jest.fn(() => editorChain),
  insertTable: jest.fn(() => editorChain),
  setImage: jest.fn(() => editorChain),
  undo: jest.fn(() => editorChain),
  redo: jest.fn(() => editorChain),
  run: jest.fn(),
};

jest.mock('@tiptap/react', () => ({
  EditorContent: () => <div data-testid="editor-content" />,
  useEditor: () => ({
    chain: () => editorChain,
    can: () => ({ undo: () => true, redo: () => true }),
    commands: { setContent: jest.fn() },
    getAttributes: jest.fn(() => ({})),
    getHTML: jest.fn(() => '<p></p>'),
    getText: jest.fn(() => ''),
    isActive: jest.fn(() => false),
  }),
}));

jest.mock('@/app/actions/admin-broadcast', () => ({
  uploadEmailBroadcastImage: jest.fn(),
}));

describe('RichEmailEditor', () => {
  it('shows the email image upload file type and size limit', () => {
    render(<RichEmailEditor value="" onChange={jest.fn()} onDirty={jest.fn()} />);

    expect(screen.getByText('JPG/PNG/GIF, 2MB 이하')).toBeInTheDocument();
  });
});
