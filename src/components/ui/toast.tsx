import { useEffect, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

let toastId = 0;
const listeners: Set<(toast: Toast) => void> = new Set();

export function toast(message: string, type: 'success' | 'error' = 'error') {
  const t: Toast = { id: ++toastId, message, type };
  listeners.forEach(fn => fn(t));
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((t: Toast) => {
    setToasts(prev => [...prev, t]);
    setTimeout(() => {
      setToasts(prev => prev.filter(x => x.id !== t.id));
    }, 3000);
  }, []);

  useEffect(() => {
    listeners.add(addToast);
    return () => {
      listeners.delete(addToast);
    };
  }, [addToast]);

  return (
    <div className="fixed bottom-4 right-4 z-100 flex flex-col gap-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className={cn(
            'flex items-center gap-2 px-4 py-3 rounded-lg text-sm shadow-lg ring-1 ring-foreground/10 animate-in slide-in-from-right',
            t.type === 'error'
              ? 'bg-destructive text-destructive-foreground'
              : 'bg-primary text-primary-foreground'
          )}
        >
          <span>{t.message}</span>
          <button
            onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
            className="ml-2 cursor-pointer opacity-70 hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
