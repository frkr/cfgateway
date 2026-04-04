import { useState, useEffect, useRef } from "react";
import type { Message } from "../lib/database";

export function Welcome({ message, messages: initialMessages = [] }: { message: string; messages?: Message[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [intervalSeconds, setIntervalSeconds] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (intervalSeconds === null) return;

    const fetchMessages = async () => {
      setLoading(true);
      try {
        const res = await fetch("/panel/messages");
        const data: { messages?: Message[] } = await res.json();
        setMessages(data.messages || []);
      } catch (e) {
        console.error("Fetch error:", e);
      }
      setLoading(false);
    };

    fetchMessages();
    timerRef.current = setInterval(fetchMessages, intervalSeconds * 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [intervalSeconds]);

  return (
    <main className="flex items-center justify-center pt-16 pb-4">
      <div className="flex-1 flex flex-col items-center gap-16 min-h-0">
        <div className="max-w-[800px] w-full space-y-6 px-4">
          
          <p className="text-center text-lg">{message}</p>
          
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <label htmlFor="interval">Atualizar a cada:</label>
              <select
                id="interval"
                value={intervalSeconds ?? ""}
                onChange={(e) => setIntervalSeconds(e.target.value === "" ? null : Number(e.target.value))}
                className="border p-2 rounded"
              >
                <option value="">Stopped</option>
                <option value="30">30 segundos</option>
                <option value="10">10 segundos</option>
                <option value="5">5 segundos</option>
              </select>
            </div>
            {loading && <span className="text-sm text-gray-500">atualizando...</span>}
          </div>
          
          <nav className="rounded-3xl border border-gray-200 p-6 dark:border-gray-700 space-y-4">
            <p className="leading-6 text-gray-700 dark:text-gray-200 text-center font-bold">
              Mensagens Processadas ({messages.length}) {intervalSeconds === null ? "(parado)" : ""}
            </p>
            {messages.length === 0 ? (
              <p className="text-center text-gray-500">Nenhuma mensagem processada ainda.</p>
            ) : (
              <ul className="space-y-2 max-h-96 overflow-y-auto">
                {messages.map((msg) => (
                  <li key={msg.id} className="border p-3 rounded text-sm">
                    <p><strong>ID:</strong> {msg.id}</p>
                    <p><strong>Arquivo:</strong> {msg.filename}</p>
                    <p><strong>Status:</strong> {msg.status}</p>
                    <p><strong>Processado em:</strong> {new Date(msg.processed_at).toLocaleString()}</p>
                    {msg.content && (
                      <p><strong>Conteúdo:</strong> {msg.content}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </nav>
          
        </div>
      </div>
    </main>
  );
}