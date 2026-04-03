export const isEmpty = (text: string | null | undefined): boolean => {
	if (text === null || text === undefined) {
		return true;
	}
	const rt = text.trim();
	return rt.length === 0 || rt === 'null' || rt === 'undefined';
};
