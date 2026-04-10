import { useState, useEffect, useRef, useCallback } from 'react';
import type { Message } from '@/database';

export function Welcome({ requireAuth, message, messages: initialMessages = [] }: { requireAuth?: boolean; message: string; messages?: Message[] }) {
	const [messages, setMessages] = useState<Message[]>(initialMessages);
	const [loading, setLoading] = useState(false);
	const [showTokenModal, setShowTokenModal] = useState(false);
	const [tokenInput, setTokenInput] = useState('');
	const [offset, setOffset] = useState(initialMessages.length);
	const [hasMore, setHasMore] = useState(initialMessages.length >= 20);
	const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
	const [retryLoading, setRetryLoading] = useState(false);
	const [retryResult, setRetryResult] = useState<{ success: boolean; message: string } | null>(null);
	
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
	
	useEffect(() => {
		const storedToken = localStorage.getItem('admin_token');
		if (requireAuth && !storedToken) {
			setShowTokenModal(true);
		} else if (storedToken && requireAuth) {
			// If we have a token but initial load failed auth, try fetching with token
			fetchMessages(0, false);
		}
	}, [requireAuth]);

	const saveToken = () => {
		if (tokenInput.trim()) {
			localStorage.setItem('admin_token', tokenInput.trim());
			setShowTokenModal(false);
			fetchMessages(0, false);
		}
	};

	const fetchMessages = async (currentOffset: number, isRefresh = false) => {
		if (!isRefresh) setLoading(true);
		try {
			const storedToken = localStorage.getItem('admin_token');
			const headers = new Headers();
			if (storedToken) headers.set('Authorization', `Bearer ${storedToken}`);
			const res = await fetch(`/panel/messages?offset=${currentOffset}&limit=20&json=1`, { headers });
			if (res.status === 401) {
				localStorage.removeItem('admin_token');
				setShowTokenModal(true);
				if (!isRefresh) setLoading(false);
				return;
			}
			const data: { messages?: Message[] } = await res.json();
			const newMessages = data.messages || [];
			if (!isRefresh && newMessages.length < 20) {
				setHasMore(false);
			}
			setMessages(prev => {
				const combined = isRefresh ? [...newMessages, ...prev] : [...prev, ...newMessages];
				const map = new Map();
				combined.forEach(m => {
					if (!map.has(m.id)) {
						map.set(m.id, m);
					}
				});
				return Array.from(map.values()).sort((a, b) =>
					new Date(b.processed_at).getTime() - new Date(a.processed_at).getTime()
				);
			});
		} catch (e) {
			console.error('Fetch error:', e);
		}
		if (!isRefresh) setLoading(false);
	};
	
	useEffect(() => {
		if (offset > 0 && offset > messages.length - 20) {
			fetchMessages(offset);
		}
	}, [offset]);
	
	useEffect(() => {
		const interval = setInterval(() => {
			fetchMessages(0, true);
		}, 5000);
		return () => clearInterval(interval);
	}, []);
	
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				if (retryResult) {
					setRetryResult(null);
				} else if (selectedMessage) {
					setSelectedMessage(null);
				}
			}
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [selectedMessage, retryResult]);
	
	// Will be used to get the path of the URL
	const getPath = (urlStr: string) => {
		try {
			const url = new URL(urlStr);
			return url.pathname + url.search;
		} catch (e) {
			return urlStr;
		}
	};
	
	const handleRetry = async () => {
		if (!selectedMessage || retryLoading) return;
		setRetryLoading(true);
		try {
			const storedToken = localStorage.getItem('admin_token');
			const headers: Record<string, string> = {
				'Content-Type': 'application/json'
			};
			if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;
			const res = await fetch('/panel/messages', {
				method: 'POST',
				headers,
				body: JSON.stringify({
					intent: 'retry',
					message: selectedMessage
				})
			});
			if (res.ok) {
				setRetryResult({ success: true, message: 'Mensagem enviada com sucesso' });
			} else {
				setRetryResult({ success: false, message: 'Mensagem com erro' });
			}
		} catch (e) {
			console.error('Retry error:', e);
			setRetryResult({ success: false, message: 'Mensagem com erro' });
		} finally {
			setRetryLoading(false);
		}
	};
	
	return (
		<main className="min-h-screen bg-white dark:bg-gray-950 text-xs font-mono">
			<header
				className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 p-2 z-10 flex justify-between items-center shadow-sm">
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
								<div className="flex items-center gap-2">
									<span className={`${msg.lab ? 'text-amber-500' : 'text-gray-300'}`} title={msg.lab ? 'Lab' : 'Prod'}>
										<svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
										     strokeLinecap="round" strokeLinejoin="round">
											<path
												d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2" />
											<path d="M8.5 2h7" />
											<path d="M7 16h10" />
										</svg>
									</span>
									<span className="truncate mr-4 text-gray-800 dark:text-gray-200 group-hover:text-blue-500"
									      title={msg.url}>
										{msg.url}
									</span>
								</div>
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
				<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-20 p-2 sm:p-4 backdrop-blur-sm"
				     onClick={() => setSelectedMessage(null)}>
					<div
						className="bg-white dark:bg-gray-900 p-4 sm:p-6 rounded border border-gray-200 dark:border-gray-800 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
						onClick={e => e.stopPropagation()}>
						<div className="flex justify-between items-start mb-4 border-b dark:border-gray-800 pb-2">
							<div>
								<h2 className="text-sm font-bold uppercase tracking-tighter">Request Details</h2>
								<p className="text-[10px] text-gray-500 font-mono">{selectedMessage.id_parent}</p>
							</div>
							<button onClick={() => setSelectedMessage(null)}
							        className="text-gray-500 hover:text-black dark:hover:text-white text-xl leading-none">&times;</button>
						</div>
						<div className="space-y-4 overflow-y-auto flex-1 pr-2 custom-scrollbar text-[11px]">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div>
									<label className="text-[10px] uppercase text-gray-400 font-bold">Type</label>
									<p className="font-semibold">{selectedMessage.status}</p>
								</div>
								<div>
									<label className="text-[10px] uppercase text-gray-400 font-bold">Processed At</label>
									<p>{new Date(selectedMessage.processed_at).toLocaleString()}</p>
								</div>
								<div className="sm:col-span-2">
									<label className="text-[10px] uppercase text-gray-400 font-bold">URL</label>
									<p
										className="break-all bg-gray-50 dark:bg-gray-950 p-1 rounded border border-gray-100 dark:border-gray-900">{selectedMessage.url}</p>
								</div>
								<div>
									<label className="text-[10px] uppercase text-gray-400 font-bold">Filename</label>
									<p className="font-mono">{selectedMessage.filename}</p>
								</div>
							</div>
							<div>
								<label className="text-[10px] uppercase text-gray-400 font-bold">Content</label>
								<pre
									className="mt-1 p-3 bg-gray-50 dark:bg-black rounded border border-gray-100 dark:border-gray-900 overflow-x-auto whitespace-pre-wrap break-all font-mono leading-relaxed">
                  {selectedMessage.content || '(empty)'}
                </pre>
							</div>
						</div>
						<div className="mt-4 pt-2 border-t dark:border-gray-800 flex justify-end gap-2">
							{(selectedMessage.status === 'in' || selectedMessage.status === 'callback') && (
							<button
								onClick={handleRetry}
								disabled={retryLoading}
								className="px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-400 rounded text-[10px] font-bold uppercase flex items-center gap-2"
							>
								{retryLoading ? 'Sending...' : 'Retry'}
							</button>
							)}
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
			
			{retryResult && (
				<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-30 p-4 backdrop-blur-sm">
					<div
						className="bg-white dark:bg-gray-900 p-6 rounded border border-gray-200 dark:border-gray-800 max-w-xs w-full shadow-2xl text-center">
						<h3
							className={`text-sm font-bold uppercase mb-4 ${retryResult.success ? 'text-green-600' : 'text-red-600'}`}>
							{retryResult.message}
						</h3>
						<button
							onClick={() => setRetryResult(null)}
							className="w-full py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-[10px] font-bold uppercase transition-colors"
						>
							OK
						</button>
					</div>
				</div>
			)}

			{showTokenModal && (
				<div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-md">
					<div className="bg-white dark:bg-gray-900 p-6 rounded border border-gray-200 dark:border-gray-800 max-w-sm w-full shadow-2xl">
						<h2 className="text-lg font-bold uppercase tracking-wider mb-4">Authentication Required</h2>
						<p className="text-gray-500 mb-4 text-xs">Please enter your admin token to access the gateway logs.</p>
						<input
							type="password"
							value={tokenInput}
							onChange={(e) => setTokenInput(e.target.value)}
							onKeyDown={(e) => e.key === 'Enter' && saveToken()}
							placeholder="Admin Token"
							className="w-full p-2 mb-4 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
							autoFocus
						/>
						<button
							onClick={saveToken}
							className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold uppercase transition-colors"
						>
							Authenticate
						</button>
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
