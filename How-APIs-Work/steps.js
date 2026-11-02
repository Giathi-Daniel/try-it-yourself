// The whole explainer as data. Times are in seconds from the start of each step.
// dur = normal length, short = length in quick mode (?short).
// Actions: cap (caption, s = short caption), packet, inspect, ms (timing bar),
// focus, lock, profile (lock and profile are drawn from the step number).
// Inline markup in inspector lines: [k:text] [s:text] [n:text] [h:text] [c:text] [ok:..] [warn:..] [err:..]

const NODES = {
  client: { label: 'Your app', sub: 'browser / phone', icon: 'laptop' },
  dns: { label: 'DNS', sub: 'name → IP', icon: 'globe' },
  lb: { label: 'Load balancer', sub: 'spreads traffic', icon: 'split' },
  api: { label: 'API server', sub: 'Node / Express', icon: 'server' },
  cache: { label: 'Cache', sub: 'Redis', icon: 'bolt' },
  db: { label: 'Database', sub: 'Postgres', icon: 'db' },
};

const WIRES = [['client', 'dns'], ['client', 'lb'], ['lb', 'api'], ['api', 'db'], ['api', 'cache']];

// node centres in % of the stage, for wide and tall screens
const LAYOUT = {
  wide: {
    client: [11, 44], dns: [30, 15], lb: [43, 44],
    api: [66, 44], cache: [66, 74], db: [89, 44],
  },
  tall: {
    client: [22, 14], dns: [78, 14], lb: [22, 50],
    api: [78, 50], cache: [22, 86], db: [78, 86],
  },
};

const STEPS = [
  {
    title: 'The call', dur: 9, short: 5, actions: [
      { at: 0, cap: "One line of code calls an API. Here's everything that happens next, in about 100 ms.",
        s: 'What really happens\nwhen you call an API?' },
      { at: 0, focus: 'client' },
      { at: 0.3, inspect: 'your-app.js', lines: [
        [0.2, '[k:const] user = [k:await] fetch('],
        [0.5, "  [s:'https://api.shop.com/users/42'],"],
        [0.8, "  { headers: { Authorization: [s:'Bearer eyJhbGci…'] } }"],
        [1.1, ').then((res) => res.json());'],
      ] },
    ],
  },
  {
    title: 'DNS', dur: 16, short: 6, actions: [
      { at: 0, cap: "Step 1 · DNS. Computers don't know names, only IP addresses. So first: where is api.shop.com?",
        s: '1. DNS turns the\nname into an IP' },
      { at: 1, packet: ['client', 'dns'], label: 'api.shop.com ?', kind: 'dns', dur: 1.8 },
      { at: 4.5, packet: ['dns', 'client'], label: '93.184.216.34', kind: 'dns', dur: 1.8 },
      { at: 0.5, inspect: 'DNS lookup', lines: [
        [0.5, '[c:// question]'],
        [0.9, 'A    api.shop.com    [warn:?]'],
        [5.5, '[c:// answer]'],
        [5.9, 'A    api.shop.com    [n:93.184.216.34]'],
        [6.4, 'TTL  [n:300]  [c:cached for 5 minutes]'],
      ] },
      { at: 7.5, cap: 'The answer gets cached, so the next call skips this step completely.' },
      { at: 6.5, ms: ['DNS', 12, 'dns'] },
    ],
  },
  {
    title: 'TCP', dur: 15, short: 6, actions: [
      { at: 0, cap: 'Step 2 · TCP. A three-way handshake opens a reliable connection to that IP.',
        s: '2. TCP handshake:\nSYN, SYN-ACK, ACK' },
      { at: 1, packet: ['client', 'lb'], label: 'SYN', kind: 'tcp', dur: 1.5 },
      { at: 3.2, packet: ['lb', 'client'], label: 'SYN-ACK', kind: 'tcp', dur: 1.5 },
      { at: 5.4, packet: ['client', 'lb'], label: 'ACK', kind: 'tcp', dur: 1.5 },
      { at: 0.5, inspect: 'TCP handshake', lines: [
        [1, '→ [k:SYN]       [c:can we talk?]'],
        [3.2, '← [k:SYN-ACK]   [c:yes, can you hear me?]'],
        [5.4, '→ [k:ACK]       [c:loud and clear]'],
      ] },
      { at: 8, cap: 'Now both sides know the line is open and every packet will arrive in order.' },
      { at: 7, ms: ['TCP', 18, 'tcp'] },
    ],
  },
  {
    title: 'TLS', dur: 18, short: 6, actions: [
      { at: 0, cap: 'Step 3 · TLS. Before anything private is sent, the connection gets encrypted.',
        s: '3. TLS encrypts it.\nThe S in HTTPS' },
      { at: 1.2, packet: ['client', 'lb'], label: 'ClientHello', kind: 'tls', dur: 1.6 },
      { at: 3.6, packet: ['lb', 'client'], label: 'Certificate', kind: 'tls', dur: 1.6 },
      { at: 6, packet: ['client', 'lb'], label: 'Key share', kind: 'tls', dur: 1.6 },
      { at: 8, lock: true },
      { at: 0.5, inspect: 'TLS 1.3 handshake', lines: [
        [1.2, '→ [k:ClientHello]  [c:ciphers I support]'],
        [3.6, '← [k:ServerHello]  [c:use AES-256-GCM]'],
        [4.0, '← [k:Certificate]  [ok:api.shop.com ✓]'],
        [6, '→ [k:Key share]    [c:both sides make keys]'],
        [8, '[ok:🔒 encrypted]  [c:nobody in between can read it]'],
      ] },
      { at: 9.5, cap: "The certificate proves the server really is api.shop.com. That's the S in HTTPS." },
      { at: 8, ms: ['TLS', 24, 'tls'] },
    ],
  },
  {
    title: 'Request', dur: 18, short: 6, actions: [
      { at: 0, cap: 'Step 4 · The request: a method, a path and some headers.',
        s: '4. The request:\nmethod, path, headers' },
      { at: 1, packet: ['client', 'lb'], label: 'GET /users/42', kind: 'req', dur: 2 },
      { at: 0.5, inspect: 'HTTP request', lines: [
        [0.5, '[k:GET] /users/42 [c:HTTP/1.1]'],
        [1.1, '[h:Host:] api.shop.com'],
        [1.7, '[h:Authorization:] Bearer eyJhbGci…'],
        [2.3, '[h:Accept:] application/json'],
        [2.9, '[c:// GET has no body]'],
      ] },
      { at: 6, cap: 'The Authorization header carries a token that says who you are.' },
      { at: 11, cap: 'A load balancer hands it to one of many API servers, so no single machine gets overloaded.' },
      { at: 11, packet: ['lb', 'api'], label: 'GET /users/42', kind: 'req', dur: 1.8 },
      { at: 12.8, ms: ['Request', 9, 'req'] },
    ],
  },
  {
    title: 'Middleware', dur: 20, short: 7, actions: [
      { at: 0, cap: 'Step 5 · Middleware. Every request runs a gauntlet before your code even sees it.',
        s: '5. Middleware checks\nevery request' },
      { at: 0, focus: 'api' },
      { at: 0.5, inspect: 'Middleware pipeline', lines: [
        [1, '[k:rate limit]  [ok:✓] [c:41 of 100 this minute]'],
        [3, '[k:auth]        [ok:✓] [c:token valid → user 42]'],
        [5, '[k:validate]    [ok:✓] [c:id is a number]'],
        [7, '[k:router]      GET /users/:id → [s:getUser()]'],
        [10, ''],
        [10, '[c:// if a check fails, it stops here:]'],
        [10.5, '[err:429] too many requests'],
        [11, '[err:401] missing or bad token'],
        [11.5, '[err:400] invalid input'],
      ] },
      { at: 9.5, cap: 'Fail any check and the request stops right there, with an error code.' },
      { at: 8, ms: ['Server', 9, 'tcp'] },
    ],
  },
  {
    title: 'Data', dur: 22, short: 7, actions: [
      { at: 0, cap: 'Step 6 · Data. The controller checks the cache first.',
        s: '6. Cache first,\nthen the database' },
      { at: 1, packet: ['api', 'cache'], label: 'GET user:42', kind: 'cache', dur: 1.4 },
      { at: 3, packet: ['cache', 'api'], label: 'MISS', kind: 'cache', dur: 1.4 },
      { at: 5, cap: 'A miss means asking the database. The id is sent as a parameter, never glued into the SQL. That blocks SQL injection.' },
      { at: 5.5, packet: ['api', 'db'], label: 'SELECT … $1', kind: 'db', dur: 1.6 },
      { at: 8.5, packet: ['db', 'api'], label: '1 row', kind: 'db', dur: 1.6 },
      { at: 12, cap: 'Then the result goes into the cache, so the next request skips the database.' },
      { at: 12, packet: ['api', 'cache'], label: 'SET user:42', kind: 'cache', dur: 1.4 },
      { at: 0.5, inspect: 'Cache + database', lines: [
        [1, '[k:cache]  GET user:42  → [err:MISS]'],
        [5.5, '[k:db]     SELECT id, name, plan'],
        [5.8, '           FROM users WHERE id = [n:$1]'],
        [6.1, '           [c:params:] [n:42]'],
        [9.5, '           → [ok:1 row] [c:in 6 ms]'],
        [12.5, '[k:cache]  SET user:42  EX [n:60]'],
      ] },
      { at: 10, ms: ['DB', 8, 'db'] },
    ],
  },
  {
    title: 'Response', dur: 18, short: 6, actions: [
      { at: 0, cap: 'Step 7 · The response: a status code, headers and a JSON body.',
        s: '7. The response:\nstatus + JSON' },
      { at: 1, packet: ['api', 'lb'], label: '200 OK', kind: 'res', dur: 1.6 },
      { at: 3, packet: ['lb', 'client'], label: '200 OK', kind: 'res', dur: 2 },
      { at: 0.5, inspect: 'HTTP response', lines: [
        [0.5, '[ok:HTTP/1.1 200 OK]'],
        [1.1, '[h:Content-Type:] application/json'],
        [1.7, '[h:Cache-Control:] private, max-age=60'],
        [2.3, ''],
        [2.6, '{'],
        [2.9, '  [h:"id"]: [n:42],'],
        [3.2, '  [h:"name"]: [s:"Amina"],'],
        [3.5, '  [h:"plan"]: [s:"pro"]'],
        [3.8, '}'],
      ] },
      { at: 8, cap: 'It travels back through the same encrypted connection.' },
      { at: 5, ms: ['Response', 15, 'res'] },
    ],
  },
  {
    title: 'Render', dur: 10, short: 5, actions: [
      { at: 0, cap: 'Your code parses the JSON and puts it on the screen.',
        s: '8. Your app\nshows it. ~95 ms!' },
      { at: 0, focus: 'client' },
      { at: 0.8, profile: true },
      { at: 4.5, cap: 'Total round trip: about 95 ms. Faster than a blink.' },
    ],
  },
  {
    title: 'Status codes', dur: 16, short: 6, actions: [
      { at: 0, cap: 'When something breaks, the status code tells you where to look.',
        s: 'Status codes\ncheat sheet' },
      { at: 0.3, inspect: 'Status codes', lines: [
        [0.5, '[ok:200] OK'],
        [1, '[ok:201] Created'],
        [1.5, '[warn:400] Bad Request     [c:your input]'],
        [2, '[warn:401] Unauthorized    [c:your token]'],
        [2.5, '[warn:403] Forbidden       [c:your access]'],
        [3, '[warn:404] Not Found       [c:your URL]'],
        [3.5, '[warn:429] Too Many        [c:slow down]'],
        [4, '[err:500] Server Error    [c:their bug]'],
      ] },
      { at: 6.5, cap: '4xx means fix your request. 5xx means the server broke.' },
    ],
  },
  {
    title: 'Recap', dur: 14, short: 6, actions: [
      { at: 0, cap: 'DNS → TCP → TLS → request → middleware → data → response. Every API call, every time.',
        s: 'Every API call.\nEvery time.' },
      { at: 0.3, inspect: 'Recap', lines: [
        [0.4, '[n:1] DNS         [c:name → IP]'],
        [0.8, '[n:2] TCP         [c:open a connection]'],
        [1.2, '[n:3] TLS         [c:encrypt it]'],
        [1.6, '[n:4] Request     [c:method + path + headers]'],
        [2.0, '[n:5] Middleware  [c:limit, auth, validate]'],
        [2.4, '[n:6] Data        [c:cache, then database]'],
        [2.8, '[n:7] Response    [c:status + JSON]'],
      ] },
    ],
  },
];
