
export async function readR2Text(bucket: R2Bucket, filename?: string): Promise<string | null> {
	if (!filename) return null;
	try {
		const r2Object = await bucket.get(filename);
		if (r2Object) {
			return await r2Object.text();
		}
	} catch (e) {
		console.error('Error reading file from R2:', e);
	}
	return null;
}

export async function readR2Json<T>(bucket: R2Bucket, filename?: string, logError: boolean = true): Promise<T | null> {
	const text = await readR2Text(bucket, filename);
	if (!text) return null;
	try {
		return JSON.parse(text) as T;
	} catch (e) {
		if (logError) {
			console.error('Error parsing JSON from R2:', e);
		}
	}
	return null;
}
