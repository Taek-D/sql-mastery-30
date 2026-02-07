import Editor from '@monaco-editor/react';

interface SQLEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
}

export function SQLEditor({ value, onChange, onRun }: SQLEditorProps) {
  return (
    <div className="editor-area">
      <div className="editor-toolbar">
        <div className="editor-toolbar-left">
          SQL Editor
        </div>
        <div className="editor-toolbar-right">
          <span className="kbd">Ctrl</span>+<span className="kbd">Enter</span> 실행
          <button className="btn btn-primary" onClick={onRun}>
            ▶ 실행
          </button>
        </div>
      </div>
      <Editor
        height="100%"
        defaultLanguage="sql"
        theme="vs-dark"
        value={value}
        onChange={(v) => onChange(v ?? '')}
        onMount={(editor) => {
          editor.addAction({
            id: 'run-query',
            label: 'Run Query',
            keybindings: [2048 | 3], // Ctrl+Enter
            run: () => onRun(),
          });
        }}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          padding: { top: 12 },
          suggestOnTriggerCharacters: true,
          quickSuggestions: true,
          tabSize: 4,
          renderLineHighlight: 'line',
          folding: false,
        }}
      />
    </div>
  );
}
