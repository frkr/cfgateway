import { useState, useEffect, useRef, useCallback } from "react";
import type { Message } from '@/database';

export function Welcome({ message, messages: initialMessages = [] }: { message: string; messages?: Message[] }) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(initialMessages.length);
  const [hasMore, setHasMore] = useState(initialMessages.length >= 20);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  const observer = useRef<IntersectionObserver | null>(null);
  const lastMessageElementRef = useCallback((node: HTMLElement | null) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setOffset(prevOffset => prevOffset + 20);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  const fetchMessages = async (currentOffset: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/panel/messages?offset=${currentOffset}&limit=20&json=1`);
      const data: { messages?: Message[] } = await res.json();
      const newMessages = data.messages || [];
      if (newMessages.length < 20) {
        setHasMore(false);
      }
      setMessages(prev => {
         const combined = [...prev, ...newMessages];
         // Unique by id to avoid duplicates
         const unique = Array.from(new Map(combined.map(m => [m.id, m])).values());
         return unique;
      });
    } catch (e) {
      console.error("Fetch error:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (offset > 0 && offset > messages.length - 20) {
        fetchMessages(offset);
    }
  }, [offset]);

  const getPath = (urlStr: string) => {
    try {
      const url = new URL(urlStr);
      return url.pathname + url.search;
    } catch (e) {
      return urlStr;
    }
  };

  return (
    <main className="min-h-screen bg-white dark:bg-gray-950 text-xs font-mono">
      <header className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 p-2 z-10 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
            <h1 className="font-bold uppercase tracking-wider">CF Gateway Logs</h1>
            <span className="text-gray-400">({messages.length} registros)</span>
        </div>
        {loading && <span className="animate-pulse text-blue-500 font-bold">LOADING...</span>}
      </header>

      <div className="pt-10 pb-4 px-1">
        <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-900">
          {messages.map((msg, index) => {
            const isLast = messages.length === index + 1;
            return (
              <div
                key={msg.id}
                ref={isLast ? lastMessageElementRef : null}
                onClick={() => setSelectedMessage(msg)}
                className="flex justify-between items-center py-0.5 px-2 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer group"
              >
                <span className="truncate mr-4 text-gray-800 dark:text-gray-200 group-hover:text-blue-500" title={msg.url}>
                    {getPath(msg.url)}
                </span>
                <span className="text-gray-400 shrink-0 tabular-nums">
                    {new Date(msg.processed_at).toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
        {!hasMore && messages.length > 0 && (
          <p className="text-center text-gray-500 py-4 border-t mt-2">--- END OF LOGS ---</p>
        )}
        {messages.length === 0 && !loading && (
            <p className="text-center text-gray-500 py-10 text-sm">No messages processed yet.</p>
        )}
        {loading && (
            <div className="flex justify-center p-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            </div>
        )}
      </div>

      {selectedMessage && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-20 p-2 sm:p-4 backdrop-blur-sm" onClick={() => setSelectedMessage(null)}>
          <div className="bg-white dark:bg-gray-900 p-4 sm:p-6 rounded border border-gray-200 dark:border-gray-800 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4 border-b dark:border-gray-800 pb-2">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-tighter">Request Details</h2>
                <p className="text-[10px] text-gray-500 font-mono">{selectedMessage.id}</p>
              </div>
              <button onClick={() => setSelectedMessage(null)} className="text-gray-500 hover:text-black dark:hover:text-white text-xl leading-none">&times;</button>
            </div>
            <div className="space-y-4 overflow-y-auto flex-1 pr-2 custom-scrollbar text-[11px]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase text-gray-400 font-bold">Status</label>
                    <p className="font-semibold">{selectedMessage.status}</p>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-gray-400 font-bold">Processed At</label>
                    <p>{new Date(selectedMessage.processed_at).toLocaleString()}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] uppercase text-gray-400 font-bold">URL</label>
                    <p className="break-all bg-gray-50 dark:bg-gray-950 p-1 rounded border border-gray-100 dark:border-gray-900">{selectedMessage.url}</p>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-gray-400 font-bold">Parent ID</label>
                    <p className="font-mono">{selectedMessage.id_parent}</p>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-gray-400 font-bold">Filename</label>
                    <p className="font-mono">{selectedMessage.filename}</p>
                  </div>
              </div>
              <div>
                <label className="text-[10px] uppercase text-gray-400 font-bold">Content</label>
                <pre className="mt-1 p-3 bg-gray-50 dark:bg-black rounded border border-gray-100 dark:border-gray-900 overflow-x-auto whitespace-pre-wrap break-all font-mono leading-relaxed">
                  {selectedMessage.content || "(empty)"}
                </pre>
              </div>
            </div>
            <div className="mt-4 pt-2 border-t dark:border-gray-800 flex justify-end">
                <button
                    onClick={() => setSelectedMessage(null)}
                    className="px-4 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-[10px] font-bold uppercase"
                >
                    Close
                </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 10px;
        }
      `}</style>
    </main>
  );
}
