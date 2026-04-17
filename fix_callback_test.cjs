const fs = require('fs');
const filepath = 'test/mq/mqcallback/MQCallback.spec.ts';
let code = fs.readFileSync(filepath, 'utf8');

code = code.replace(/expect\(stored\?\.status\)\.toBe\('lost'\);/, "expect(stored?.status).toBe('error');");

fs.writeFileSync(filepath, code);
