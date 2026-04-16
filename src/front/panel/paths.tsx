import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import type { Route } from '../routes/+types/panel.paths';
import { PATH_ROUTE_METHODS, type PathRoute, type PathRouteHeaderEntry, type PathRouteMethod } from '@/pathroute';

type LoaderData = {
	requireAuth?: boolean;
	message: string;
	routes: PathRoute[];
	methods: PathRouteMethod[];
};

type FormState = {
	id?: string;
	path: string;
	destiny: string;
	callback: string;
	methodDestiny: PathRouteMethod;
	methodCallback: PathRouteMethod;
	contentTypeDestiny: string;
	contentTypeCallback: string;
	headersDestiny: PathRouteHeaderEntry[];
	headersCallback: PathRouteHeaderEntry[];
	enabled: boolean;
};

const emptyForm: FormState = {
	path: '',
	destiny: '',
	callback: '',
	methodDestiny: 'POST',
	methodCallback: 'POST',
	contentTypeDestiny: '',
	contentTypeCallback: '',
	headersDestiny: [],
	headersCallback: [],
	enabled: true
};

function HeaderFields({
	label,
	headers,
	onChange
}: {
	label: string;
	headers: PathRouteHeaderEntry[];
	onChange: (headers: PathRouteHeaderEntry[]) => void;
}) {
	const addHeader = () => {
		onChange([...headers, { key: '', value: '' }]);
	};
	
	const updateHeader = (index: number, field: 'key' | 'value', value: string) => {
		onChange(headers.map((header, currentIndex) => currentIndex === index ? {
			...header,
			[field]: value
		} : header));
	};
	
	const removeHeader = (index: number) => {
		onChange(headers.filter((_, currentIndex) => currentIndex !== index));
	};
	
	return (
		<div>
			<div className="flex items-center justify-between mb-2">
				<label className="block text-[10px] uppercase text-gray-400 font-bold">{label}</label>
				<button
					type="button"
					onClick={addHeader}
					className="px-2 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded uppercase font-bold text-[10px]"
				>
					Add
				</button>
			</div>
			<div className="space-y-2">
				{headers.map((header, index) => (
					<div key={`${label}-${index}`} className="grid grid-cols-[1fr_1fr_72px] gap-2">
						<input
							type="text"
							value={header.key}
							onChange={(event) => updateHeader(index, 'key', event.target.value)}
							placeholder="Header"
							className="w-full p-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded"
						/>
						<input
							type="text"
							value={header.value}
							onChange={(event) => updateHeader(index, 'value', event.target.value)}
							placeholder="Value"
							className="w-full p-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded"
						/>
						<button
							type="button"
							onClick={() => removeHeader(index)}
							className="px-2 py-2 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200 rounded uppercase font-bold text-[10px]"
						>
							Remove
						</button>
					</div>
				))}
				{headers.length === 0 && (
					<p className="text-[11px] text-gray-400">No headers configured.</p>
				)}
			</div>
		</div>
	);
}

export default function PathsPanel({ loaderData }: Route.ComponentProps) {
	const { requireAuth, routes: initialRoutes = [], methods = PATH_ROUTE_METHODS } = loaderData as LoaderData;
	const [routes, setRoutes] = useState<PathRoute[]>(initialRoutes);
	const [form, setForm] = useState<FormState>(emptyForm);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [showTokenModal, setShowTokenModal] = useState(false);
	const [tokenInput, setTokenInput] = useState('');
	const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
	
	const methodOptions = useMemo(() => methods.length > 0 ? methods : [...PATH_ROUTE_METHODS], [methods]);
	
	useEffect(() => {
		const storedToken = localStorage.getItem('admin_token');
		
		if (requireAuth && !storedToken) {
			setShowTokenModal(true);
			return;
		}
		
		if (storedToken) {
			void fetchRoutes();
		}
	}, [requireAuth]);
	
	const withAuthHeaders = () => {
		const storedToken = localStorage.getItem('admin_token');
		const headers = new Headers({
			'Content-Type': 'application/json'
		});
		
		if (storedToken) {
			headers.set('Authorization', `Bearer ${storedToken}`);
		}
		
		return headers;
	};
	
	const fetchRoutes = async () => {
		setLoading(true);
		
		try {
			const response = await fetch('/panel/paths/data?json=1', {
				headers: withAuthHeaders()
			});
			
			if (response.status === 401) {
				localStorage.removeItem('admin_token');
				setShowTokenModal(true);
				return;
			}
			
			const data = await response.json() as LoaderData;
			setRoutes(data.routes || []);
		} catch (e) {
			console.error('Fetch path routes error:', e);
			setFeedback({ success: false, message: 'Unable to load path routes.' });
		} finally {
			setLoading(false);
		}
	};
	
	const saveToken = () => {
		if (!tokenInput.trim()) {
			return;
		}
		
		localStorage.setItem('admin_token', tokenInput.trim());
		setShowTokenModal(false);
		void fetchRoutes();
	};
	
	const resetForm = () => {
		setForm(emptyForm);
	};
	
	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setSaving(true);
		setFeedback(null);
		
		try {
			const response = await fetch('/panel/paths/data?json=1', {
				method: 'POST',
				headers: withAuthHeaders(),
				body: JSON.stringify({
					intent: 'save',
					id: form.id,
					route: {
						path: form.path,
						destiny: form.destiny,
						callback: form.callback,
						methodDestiny: form.methodDestiny,
						methodCallback: form.methodCallback,
						contentTypeDestiny: form.contentTypeDestiny,
						contentTypeCallback: form.contentTypeCallback,
						headersDestiny: form.headersDestiny,
						headersCallback: form.headersCallback,
						enabled: form.enabled
					}
				})
			});
			
			if (response.status === 401) {
				localStorage.removeItem('admin_token');
				setShowTokenModal(true);
				return;
			}
			
			const data = await response.json() as LoaderData & { success?: boolean; error?: string };
			if (!response.ok || data.success === false) {
				throw new Error(data.error || 'Unable to save path route.');
			}
			
			setRoutes(data.routes || []);
			resetForm();
			setFeedback({ success: true, message: 'Path route saved.' });
		} catch (e) {
			console.error('Save path route error:', e);
			setFeedback({ success: false, message: e instanceof Error ? e.message : 'Unable to save path route.' });
		} finally {
			setSaving(false);
		}
	};
	
	const handleDelete = async (route: PathRoute) => {
		setSaving(true);
		setFeedback(null);
		
		try {
			const response = await fetch('/panel/paths/data?json=1', {
				method: 'POST',
				headers: withAuthHeaders(),
				body: JSON.stringify({
					intent: 'delete',
					id: route.id
				})
			});
			
			if (response.status === 401) {
				localStorage.removeItem('admin_token');
				setShowTokenModal(true);
				return;
			}
			
			const data = await response.json() as LoaderData & { success?: boolean; error?: string };
			if (!response.ok || data.success === false) {
				throw new Error(data.error || 'Unable to delete path route.');
			}
			
			setRoutes(data.routes || []);
			if (form.id === route.id) {
				resetForm();
			}
			setFeedback({ success: true, message: 'Path route deleted.' });
		} catch (e) {
			console.error('Delete path route error:', e);
			setFeedback({ success: false, message: e instanceof Error ? e.message : 'Unable to delete path route.' });
		} finally {
			setSaving(false);
		}
	};
	
	return (
		<main className="min-h-screen bg-white dark:bg-gray-950 text-xs font-mono">
			<header className="border-b border-gray-200 dark:border-gray-800 p-3 flex justify-between items-center gap-4">
				<div className="flex items-center gap-3">
					<Link to="/panel" className="text-blue-500 hover:underline uppercase font-bold">
						Logs
					</Link>
					<h1 className="font-bold uppercase tracking-wider">Path Routes</h1>
					<span className="text-gray-400">({routes.length} registros)</span>
				</div>
				{loading && <span className="animate-pulse text-blue-500 font-bold">LOADING...</span>}
			</header>
			
			<div className="grid grid-cols-1 xl:grid-cols-[520px_1fr] gap-4 p-4">
				<section className="border border-gray-200 dark:border-gray-800 rounded p-4 bg-gray-50 dark:bg-gray-900/40">
					<h2 className="font-bold uppercase mb-4">{form.id ? 'Edit Path' : 'New Path'}</h2>
					<form className="space-y-3" onSubmit={handleSubmit}>
						<div>
							<label className="block text-[10px] uppercase text-gray-400 font-bold mb-1">Path</label>
							<input
								type="text"
								value={form.path}
								onChange={(event) => setForm((prev) => ({ ...prev, path: event.target.value }))}
								placeholder="davi"
								className="w-full p-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded"
							/>
						</div>
						<div>
							<label className="block text-[10px] uppercase text-gray-400 font-bold mb-1">Destiny URL</label>
							<input
								type="url"
								value={form.destiny}
								onChange={(event) => setForm((prev) => ({ ...prev, destiny: event.target.value }))}
								placeholder="https://destiny.example.com/webhook"
								className="w-full p-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded"
							/>
						</div>
						<div>
							<label className="block text-[10px] uppercase text-gray-400 font-bold mb-1">Callback URL</label>
							<input
								type="url"
								value={form.callback}
								onChange={(event) => setForm((prev) => ({ ...prev, callback: event.target.value }))}
								placeholder="https://callback.example.com/webhook"
								className="w-full p-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded"
							/>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
							<div>
								<label className="block text-[10px] uppercase text-gray-400 font-bold mb-1">Destiny Method</label>
								<select
									value={form.methodDestiny}
									onChange={(event) => setForm((prev) => ({ ...prev, methodDestiny: event.target.value as PathRouteMethod }))}
									className="w-full p-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded"
								>
									{methodOptions.map((method) => (
										<option key={`destiny-${method}`} value={method}>{method}</option>
									))}
								</select>
							</div>
							<div>
								<label className="block text-[10px] uppercase text-gray-400 font-bold mb-1">Callback Method</label>
								<select
									value={form.methodCallback}
									onChange={(event) => setForm((prev) => ({ ...prev, methodCallback: event.target.value as PathRouteMethod }))}
									className="w-full p-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded"
								>
									{methodOptions.map((method) => (
										<option key={`callback-${method}`} value={method}>{method}</option>
									))}
								</select>
							</div>
						</div>
						<div>
							<label className="block text-[10px] uppercase text-gray-400 font-bold mb-1">Destiny Content-Type</label>
							<input
								type="text"
								value={form.contentTypeDestiny}
								onChange={(event) => setForm((prev) => ({ ...prev, contentTypeDestiny: event.target.value }))}
								placeholder="application/json"
								className="w-full p-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded"
							/>
						</div>
						<div>
							<label className="block text-[10px] uppercase text-gray-400 font-bold mb-1">Callback Content-Type</label>
							<input
								type="text"
								value={form.contentTypeCallback}
								onChange={(event) => setForm((prev) => ({ ...prev, contentTypeCallback: event.target.value }))}
								placeholder="application/json"
								className="w-full p-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded"
							/>
						</div>
						<HeaderFields
							label="Destiny Headers"
							headers={form.headersDestiny}
							onChange={(headersDestiny) => setForm((prev) => ({ ...prev, headersDestiny }))}
						/>
						<HeaderFields
							label="Callback Headers"
							headers={form.headersCallback}
							onChange={(headersCallback) => setForm((prev) => ({ ...prev, headersCallback }))}
						/>
						<label className="flex items-center gap-2 text-[11px] text-gray-500">
							<input
								type="checkbox"
								checked={form.enabled}
								onChange={(event) => setForm((prev) => ({ ...prev, enabled: event.target.checked }))}
							/>
							Enabled
						</label>
						<div className="flex gap-2">
							<button
								type="submit"
								disabled={saving}
								className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded uppercase font-bold disabled:bg-blue-400"
							>
								{saving ? 'Saving...' : form.id ? 'Update' : 'Create'}
							</button>
							<button
								type="button"
								onClick={resetForm}
								className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded uppercase font-bold"
							>
								Clear
							</button>
						</div>
					</form>
					{feedback && (
						<p className={`mt-4 text-[11px] ${feedback.success ? 'text-green-600' : 'text-red-600'}`}>
							{feedback.message}
						</p>
					)}
				</section>
				
				<section className="border border-gray-200 dark:border-gray-800 rounded overflow-hidden">
					<div className="grid grid-cols-[1.2fr_2fr_90px_90px] gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-800 uppercase text-[10px] text-gray-400 font-bold">
						<span>Path</span>
						<span>Destiny</span>
						<span>Method</span>
						<span>Status</span>
					</div>
					<div className="divide-y divide-gray-100 dark:divide-gray-900">
						{routes.map((route) => (
							<div key={route.id} className="px-4 py-3 flex flex-col gap-3 md:grid md:grid-cols-[1.2fr_2fr_90px_90px_140px] md:items-center">
								<span className="break-all text-gray-800 dark:text-gray-100">/{route.path}</span>
								<span className="break-all text-gray-500">{route.destiny}</span>
								<span className="font-bold">{route.methodDestiny}</span>
								<div className={`flex items-center text-lg ${route.enabled ? 'text-green-600' : 'text-red-600'}`}>
									<span aria-label={route.enabled ? 'Enabled' : 'Disabled'}>
										{route.enabled ? '✅' : '❌'}
									</span>
								</div>
								<div className="flex gap-2 md:justify-end">
									<button
										type="button"
										onClick={() => setForm({
											id: route.id,
											path: route.path,
											destiny: route.destiny,
											callback: route.callback,
											methodDestiny: route.methodDestiny,
											methodCallback: route.methodCallback,
											contentTypeDestiny: route.contentTypeDestiny,
											contentTypeCallback: route.contentTypeCallback,
											headersDestiny: route.headersDestiny,
											headersCallback: route.headersCallback,
											enabled: route.enabled
										})}
										className="px-3 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded uppercase font-bold"
									>
										Edit
									</button>
									<button
										type="button"
										onClick={() => void handleDelete(route)}
										className="px-3 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200 rounded uppercase font-bold"
									>
										Delete
									</button>
								</div>
							</div>
						))}
						{routes.length === 0 && !loading && (
							<p className="p-6 text-center text-gray-500">No path routes configured yet.</p>
						)}
					</div>
				</section>
			</div>
			
			{showTokenModal && (
				<div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-md">
					<div className="bg-white dark:bg-gray-900 p-6 rounded border border-gray-200 dark:border-gray-800 max-w-sm w-full shadow-2xl">
						<h2 className="text-lg font-bold uppercase tracking-wider mb-4">Authentication Required</h2>
						<p className="text-gray-500 mb-4 text-xs">Please enter your admin token to manage path routes.</p>
						<input
							type="password"
							value={tokenInput}
							onChange={(event) => setTokenInput(event.target.value)}
							onKeyDown={(event) => event.key === 'Enter' && saveToken()}
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
		</main>
	);
}
