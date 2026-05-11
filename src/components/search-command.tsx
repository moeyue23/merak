import { useEffect, useRef, useState } from 'react';
import { Search, Inbox, CircleDot, FolderKanban, Command, ArrowRight } from 'lucide-react';

interface ResultItem {
  id: number;
  type: 'issue' | 'inbox' | 'project';
  title: string;
  subtitle?: string;
  href: string;
}

// Empty data — will be connected to search API later

const TYPE_ICON = {
  issue: CircleDot,
  inbox: Inbox,
  project: FolderKanban,
};

const TYPE_LABEL = {
  issue: 'Issues',
  inbox: 'Inbox',
  project: 'Projects',
};

export function SearchCommand() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const [results, setResults] = useState<ResultItem[]>([]);
  const filtered = query
    ? results.filter(
        r =>
          r.title.toLowerCase().includes(query.toLowerCase()) ||
          r.subtitle?.toLowerCase().includes(query.toLowerCase())
      )
    : results;

  const grouped = filtered.reduce<Record<string, ResultItem[]>>((acc, item) => {
    (acc[item.type] ??= []).push(item);
    return acc;
  }, {});

  return (
    <>
      {/* Trigger button — shown in sidebar header */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg border border-border/50 bg-input/30 text-sm text-muted-foreground hover:bg-input/50 hover:text-foreground transition-colors cursor-pointer"
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[10px] font-medium text-muted-foreground/60">
          <Command className="h-2.5 w-2.5" />K
        </kbd>
      </button>

      {/* Command palette overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-card rounded-xl ring-1 ring-foreground/10 shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 border-b">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search issues, inbox, projects..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="flex-1 py-3.5 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <kbd className="shrink-0 px-1.5 py-0.5 rounded border text-[10px] text-muted-foreground/60">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto py-2">
              {Object.entries(grouped).length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No results found
                </div>
              ) : (
                Object.entries(grouped).map(([type, items]) => (
                  <div key={type}>
                    <div className="px-4 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {TYPE_LABEL[type as keyof typeof TYPE_LABEL]}
                    </div>
                    {items.map(item => {
                      const Icon = TYPE_ICON[item.type];
                      return (
                        <a
                          key={`${item.type}-${item.id}`}
                          href={item.href}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent transition-colors group"
                        >
                          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm truncate">{item.title}</div>
                            {item.subtitle && (
                              <div className="text-xs text-muted-foreground truncate">
                                {item.subtitle}
                              </div>
                            )}
                          </div>
                          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
