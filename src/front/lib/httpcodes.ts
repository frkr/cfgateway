export const HTTP_OK = () => new Response('200 Ok', {status: 200});
export const HTTP_CREATED = () => new Response('201 Created', {status: 201});
export const HTTP_UNPROCESSABLE_ENTITY = () => new Response('422 Unprocessable Content', {status: 422});
