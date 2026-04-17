const fs = require('fs');
const filepath = 'test/front/.server/panel/panel.spec.ts';
let code = fs.readFileSync(filepath, 'utf8');

// We need to fix the test because an empty POST request now fails the await request.json() with 400 before checking auth (in the body). Wait, the order of auth checking has changed.

code = code.replace(/it\('should return 401 Unauthorized without token', async \(\) => {\n\t\tconst request = new Request\('http:\/\/example\.com\/panel', \{ method: 'POST' \}\);\n\t\tconst context = {\n\t\t\tcloudflare: \{\n\t\t\t\tenv: \{\n\t\t\t\t\t\.\.\.env,\n\t\t\t\t\tADMIN_TOKEN: 'supersecret'\n\t\t\t\t\}\n\t\t\t\}\n\t\t\} as any;\n\n\t\tconst response = await action\(\{ request, context, params: \{\} \}\);\n\t\texpect\(response\)\.toBeInstanceOf\(Response\);\n\t\texpect\(\(response as Response\)\.status\)\.toBe\(401\);\n\t\}\);/, `it('should return 401 Unauthorized without token', async () => {
		const request = new Request('http://example.com/panel', { method: 'POST', body: JSON.stringify({ intent: 'retry' }) });
		const context = {
			cloudflare: {
				env: {
					...env,
					ADMIN_TOKEN: 'supersecret'
				}
			}
		} as any;

		const response = await action({ request, context, params: {} });
		expect(response).toBeInstanceOf(Response);
		expect((response as Response).status).toBe(401);
	});`);

fs.writeFileSync(filepath, code);
