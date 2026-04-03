export default async function (size = 16) {
	
	return Array.from(
		new Uint8Array(
			await crypto.subtle.digest("sha-512",
				crypto.getRandomValues(new Uint8Array(size))
			))).map(b => b.toString(16).padStart(2, "0"))
	.join("")
	
}