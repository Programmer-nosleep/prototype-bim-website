import { useEffect, useRef, useState } from 'react';

interface CommandLineProps {
  onCommand: (command: string, args: string[]) => void;
  visible: boolean;
   onToggleVisibility: () => void; 
}

export default function CommandLine({ onCommand, visible }: CommandLineProps) {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const [command, ...args] = input.trim().split(/\s+/);
    onCommand(command.toLowerCase(), args);
    
    // Add to history
    setHistory(prev => [input, ...prev]);
    setHistoryIndex(-1);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle command history with up/down arrows
    if (e.key === 'ArrowUp' && historyIndex < history.length - 1) {
      e.preventDefault();
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setInput(history[newIndex]);
    } else if (e.key === 'ArrowDown' && historyIndex > -1) {
      e.preventDefault();
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setInput(newIndex >= 0 ? history[newIndex] : '');
    }
  };

  // Auto-focus input when visible
  useEffect(() => {
    if (visible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="command-line" style={{
      position: 'fixed',
      bottom: '60px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: 'rgba(40, 40, 45, 0.95)',
      padding: '8px 16px',
      borderRadius: '4px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
      zIndex: 1000,
      minWidth: '400px',
      maxWidth: '80%',
      color: '#fff',
      border: '1px solid #4CAF50',
    }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ marginRight: '8px', color: '#4CAF50' }}>\&gt;</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: '#fff',
            outline: 'none',
            fontFamily: 'monospace',
            fontSize: '14px',
          }}
          placeholder="Enter command... (type 'help' for commands)"
          autoComplete="off"
          spellCheck="false"
        />
      </form>
    </div>
  );
}
