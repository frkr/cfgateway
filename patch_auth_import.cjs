const fs = require('fs');
const file = 'src/front/.server/panel/auth.ts';
let code = fs.readFileSync(file, 'utf8');

const replacement = `import { createCookie } from "react-router";
import crypto from "node:crypto";`;

code = code.replace(/import { createCookie } from "react-router";\nimport \* as crypto from "node:crypto";/, replacement);

fs.writeFileSync(file, code);
