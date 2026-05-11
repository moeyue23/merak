import { client } from '@/client/client.gen';
import { useState } from 'react';
import { useLoaderData, useFetcher, type ActionFunctionArgs } from 'react-router';
import { Mail, MailOpen, Trash2, Clock, Loader2, Inbox } from 'lucide-react';
import { timeAgo } from '@/lib/time';

interface InboxMessage {
  id: number;
  title: string;
  content: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export async function loader() {
  try {
    const res = await client.instance.get('/inbox');
    return (res.data as { data: InboxMessage[] }).data;
  } catch {
    return [] as InboxMessage[];
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const fd = await request.formData();
  const id = fd.get('id') as string;

  try {
    if (request.method === 'PUT') {
      await client.instance.put(`/inbox/${id}/read`);
    } else if (request.method === 'DELETE') {
      await client.instance.delete(`/inbox/${id}`);
    }
  } catch {
    return { ok: false };
  }
  return { ok: true };
}

export default function InboxPage() {
  const messages = useLoaderData() as InboxMessage[];
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const readFetcher = useFetcher();
  const deleteFetcher = useFetcher();

  const selected = messages.find(m => m.id === selectedId);

  const handleSelect = (msg: InboxMessage) => {
    setSelectedId(msg.id);
    if (!msg.is_read) {
      readFetcher.submit({ id: msg.id }, { method: 'put', action: '/app/inbox' });
    }
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    deleteFetcher.submit({ id }, { method: 'delete', action: '/app/inbox' });
    if (selectedId === id) setSelectedId(null);
  };

  const isDeleting = deleteFetcher.state !== 'idle';

  return (
    <div className="flex h-dvh -m-6">
      {/* Left panel — message list */}
      <div className="w-95 flex flex-col border-r bg-sidebar">
        <div className="flex items-center gap-2 px-5 py-4 border-b">
          <Inbox className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Inbox</h2>
          <span className="ml-auto text-sm text-muted-foreground">{messages.length}</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No messages</div>
          ) : (
            messages.map(msg => (
              <button
                key={msg.id}
                onClick={() => handleSelect(msg)}
                className={`w-full text-left px-5 py-3 border-b hover:bg-accent/50 transition-colors cursor-pointer
                  ${selectedId === msg.id ? 'bg-accent' : ''}
                  ${!msg.is_read ? 'bg-accent/20' : ''}
                `}
              >
                <div className="flex items-start gap-3">
                  {!msg.is_read ? (
                    <Mail className="h-4 w-4 mt-1 shrink-0 text-primary" />
                  ) : (
                    <MailOpen className="h-4 w-4 mt-1 shrink-0 text-muted-foreground" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`truncate text-sm ${!msg.is_read ? 'font-semibold' : ''}`}>
                        {msg.title}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {timeAgo(msg.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{msg.content}</p>
                  </div>
                  <button
                    onClick={e => handleDelete(e, msg.id)}
                    className="shrink-0 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                    title="Delete"
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right panel — detail */}
      <div className="flex-1 flex flex-col overflow-y-auto bg-background">
        {selected ? (
          <div className="p-8 max-w-3xl">
            <div className="flex items-start gap-2 mb-6">
              <div className="flex-1">
                <h3 className="text-2xl font-semibold">{selected.title}</h3>
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{new Date(selected.created_at).toLocaleString()}</span>
                </div>
              </div>
              <button
                onClick={e => handleDelete(e, selected.id)}
                className="shrink-0 p-2 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                title="Delete"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{selected.content}</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Inbox className="h-12 w-12 mx-auto text-muted-foreground/40" />
              <p className="mt-4 text-muted-foreground">Select a message to read</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
