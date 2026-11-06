// The whole explainer as data. Times are seconds from the start of each step.
// dur = normal length, short = length in quick mode (?short).
//
// Actions: cap (caption, s = the shorter one), inspect + lines, packet, file,
// level, click, nodes, pstep, brace, lit.
// Captions take *stars* around words to highlight.
// Inspector lines take [t:tag] [a:attribute] [v:value] [p:selector] [c:comment] [k:keyword].

// The tree the browser builds out of the page's HTML.
const DOM_TREE = {
  name: 'html',
  children: [
    { name: 'head', children: [{ name: 'title' }, { name: 'link' }] },
    {
      name: 'body',
      children: [
        { name: 'nav', children: [{ name: 'a.logo' }, { name: 'a' }, { name: 'button' }] },
        { name: 'main', children: [{ name: 'h1' }, { name: 'p' }, { name: 'button' }] },
      ],
    },
  ],
};

// Where the boxes sit, in % of the stage, for wide and tall screens.
const LAYOUT = {
  files: {
    wide: { client: [22, 50], server: [73, 50] },
    tall: { client: [50, 20], server: [50, 68] },
  },
  stack: {
    wide: { client: [18, 50], server: [50, 50], db: [82, 50] },
    tall: { client: [50, 17], server: [50, 50], db: [50, 83] },
  },
};

const STEPS = [
  {
    title: 'The files', scene: 'files', dur: 14, short: 5, actions: [
      { at: 0, cap: 'A website is just *files*, sitting on a computer somewhere else.',
        s: 'A website is just\n*files on a computer*' },
      { at: 0, lit: 'server' },
      { at: 1.4, file: 0 },
      { at: 2.4, file: 1 },
      { at: 3.4, file: 2 },
      { at: 7, cap: 'That computer is called a *server*. Its whole job is to hand those files out.' },
      { at: 0.5, inspect: 'On the server', lines: [
        [1.4, '[t:index.html]   [c:what is on the page]'],
        [2.4, '[p:style.css]    [c:what it looks like]'],
        [3.4, '[k:script.js]    [c:what it does]'],
        [8, ''],
        [8.3, '[c:// that is the whole website.]'],
      ] },
    ],
  },
  {
    title: 'The request', scene: 'files', dur: 16, short: 6, actions: [
      { at: 0, cap: 'You type an address. Your browser asks that server to send them over.',
        s: 'Your browser\n*asks for them*' },
      { at: 0, file: 2 },
      { at: 1, packet: ['client', 'server'], label: 'GET nimbus.dev', kind: 'req', dur: 1.8 },
      { at: 4, packet: ['server', 'client'], label: 'index.html', kind: 'html', dur: 1.8 },
      { at: 5.4, packet: ['server', 'client'], label: 'style.css', kind: 'css', dur: 1.8 },
      { at: 6.8, packet: ['server', 'client'], label: 'script.js', kind: 'js', dur: 1.8 },
      { at: 10, cap: 'They arrive as plain text. Everything after this happens on *your* device.' },
      { at: 0.5, inspect: 'Over the wire', lines: [
        [1, '[k:GET] / [c:HTTP/1.1]'],
        [1.4, '[a:Host:] nimbus.dev'],
        [4, ''],
        [4.2, '[v:200 OK]'],
        [4.6, '[a:Content-Type:] text/html'],
        [5.2, ''],
        [5.4, '[t:<!DOCTYPE html>]'],
        [5.8, '[t:<html] [a:lang][v:="en"][t:>]…'],
      ] },
    ],
  },
  {
    title: 'HTML', scene: 'layers', level: 1, dur: 22, short: 7, actions: [
      { at: 0, cap: 'HTML is the *structure*. Headings, paragraphs, links, buttons.',
        s: '*HTML*\nis the structure' },
      { at: 0.5, inspect: 'index.html', lines: [
        [0.6, '[t:<nav>]'],
        [1.0, '  [t:<a] [a:class][v:="logo"][t:>]Nimbus[t:</a>]'],
        [1.5, '  [t:<a] [a:href][v:="#"][t:>]Features[t:</a>]'],
        [2.0, '  [t:<button>]Sign up[t:</button>]'],
        [2.4, '[t:</nav>]'],
        [2.8, ''],
        [3.1, '[t:<h1>]Ship your site today[t:</h1>]'],
        [3.6, '[t:<p>]Deploy in one command.[t:</p>]'],
        [4.1, '[t:<button] [a:class][v:="like"][t:>]♥ 128[t:</button>]'],
      ] },
      { at: 8, cap: 'On its own, it looks like this. No colours, no layout, just content in order.' },
      { at: 15, cap: 'Every website on earth starts out looking exactly this plain.' },
    ],
  },
  {
    title: 'CSS', scene: 'layers', level: 1, dur: 22, short: 7, actions: [
      { at: 0, cap: 'CSS is the *look*. Colour, spacing, fonts, layout.',
        s: '*CSS*\nis the look' },
      { at: 1.6, level: 2 },
      { at: 0.5, inspect: 'style.css', lines: [
        [0.6, '[p:nav] {'],
        [1.0, '  [a:display]: [v:flex];'],
        [1.4, '  [a:gap]: [v:20px];'],
        [1.8, '}'],
        [2.2, ''],
        [2.5, '[p:h1] {'],
        [2.9, '  [a:font-size]: [v:40px];'],
        [3.3, '  [a:color]: [v:#171c33];'],
        [3.7, '}'],
        [4.1, ''],
        [4.4, '[p:.start] {'],
        [4.8, '  [a:background]: [v:linear-gradient(…)];'],
        [5.2, '  [a:border-radius]: [v:12px];'],
        [5.6, '}'],
      ] },
      { at: 8, cap: 'Same page. Not one HTML tag changed.' },
      { at: 14, cap: 'That split is the whole idea: content in one file, appearance in another.' },
    ],
  },
  {
    title: 'JavaScript', scene: 'layers', level: 3, dur: 20, short: 7, actions: [
      { at: 0, cap: 'JavaScript makes it *do things*.',
        s: '*JavaScript*\nmakes it do things' },
      { at: 2.5, click: true },
      { at: 0.5, inspect: 'script.js', lines: [
        [0.6, "[k:const] btn = document.[a:getElementById]([v:'like']);"],
        [1.2, '[k:let] likes = [v:128];'],
        [1.8, ''],
        [2.1, "btn.[a:addEventListener]([v:'click'], () [k:=>] {"],
        [2.6, '  likes[k:++];'],
        [3.1, "  btn.[a:classList].add([v:'liked']);"],
        [3.6, '});'],
      ] },
      { at: 7, cap: 'Clicks, menus, forms, live updates. Without it, a page just sits there.' },
      { at: 13.5, cap: 'Three files. Structure, look, behaviour. That is every website you have used.' },
    ],
  },
  {
    title: 'The DOM', scene: 'dom', dur: 22, short: 7, actions: [
      { at: 0, cap: 'But the browser does not draw your HTML directly. First it reads it into a *tree*.',
        s: 'Your HTML becomes\na tree: the *DOM*' },
      { at: 1, nodes: 1 },
      { at: 2, nodes: 3 },
      { at: 3.2, nodes: 5 },
      { at: 4.4, nodes: 7 },
      { at: 5.6, nodes: 10 },
      { at: 6.8, nodes: 13 },
      { at: 8, cap: 'Every tag becomes a node. Tags inside other tags become branches.' },
      { at: 13, cap: 'That tree is the *DOM*, and it is what JavaScript actually changes when a page updates.' },
      { at: 0.5, inspect: 'The DOM', lines: [
        [1, '[t:html]'],
        [2.2, ' ├─ [t:head]'],
        [3.4, ' │   ├─ [t:title]'],
        [3.8, ' │   └─ [t:link]'],
        [4.6, ' └─ [t:body]'],
        [5.8, '     ├─ [t:nav]'],
        [6.2, '     │   ├─ [t:a.logo]'],
        [6.6, '     │   └─ [t:button]'],
        [7.0, '     └─ [t:main]'],
        [7.4, '         ├─ [t:h1]'],
        [7.8, '         └─ [t:button]'],
      ] },
    ],
  },
  {
    title: 'Render tree', scene: 'pipeline', dur: 18, short: 6, actions: [
      { at: 0, cap: 'Your CSS gets its own tree. Then the browser merges the two.',
        s: 'CSS gets a tree too.\nMerge = *render tree*' },
      { at: 0.5, pstep: 0 },
      { at: 4, pstep: 1 },
      { at: 8.5, pstep: 2 },
      { at: 9, cap: 'The result is the *render tree*: every node that will actually be seen.' },
      { at: 14, cap: 'Anything hidden never makes it this far, so the browser does not waste time on it.' },
      { at: 0.5, inspect: 'Building the render tree', lines: [
        [1, '[t:DOM]        [c:what is on the page]'],
        [4.5, '[p:+ CSSOM]    [c:what it should look like]'],
        [9, '[v:= render tree]'],
        [9.6, ''],
        [10, '[c:// display: none → not included]'],
      ] },
    ],
  },
  {
    title: 'Layout and paint', scene: 'pipeline', dur: 18, short: 6, actions: [
      { at: 0, cap: 'Now it works out where every box goes. That step is called *layout*.',
        s: '*Layout*, then *paint*' },
      { at: 0.2, pstep: 3 },
      { at: 6.5, pstep: 4 },
      { at: 7, cap: 'Then it fills in the actual pixels. That step is *paint*.' },
      { at: 12.5, cap: 'All of it runs in a few milliseconds, and runs again every time something changes.' },
      { at: 0.5, inspect: 'Layout, then paint', lines: [
        [1, '[a:layout]  [c:how big, and where?]'],
        [1.6, '  [t:h1]      [v:x:26  y:74  608 × 44]'],
        [2.2, '  [t:button]  [v:x:26  y:188 162 × 48]'],
        [7, ''],
        [7.3, '[a:paint]   [c:fill in the pixels]'],
        [8, '  [v:background] → [v:text] → [v:borders]'],
        [13, ''],
        [13.4, '[c:// ~5 ms, then again on every change]'],
      ] },
    ],
  },
  {
    title: 'Front and back', scene: 'stack', dur: 20, short: 7, actions: [
      { at: 0, cap: 'Everything so far happened in *your* browser. All of that is the front-end.',
        s: 'All of that is\nthe *front-end*' },
      { at: 0, lit: 'client' },
      { at: 2, brace: 'front' },
      { at: 7, cap: 'But anything that has to be *remembered* cannot live there. Accounts, orders, messages.' },
      { at: 9.5, brace: 'back' },
      { at: 10, packet: ['client', 'server'], label: 'sign in', kind: 'req', dur: 1.6 },
      { at: 12, packet: ['server', 'db'], label: 'find user', kind: 'data', dur: 1.4 },
      { at: 14, packet: ['db', 'client'], label: 'your account', kind: 'data', dur: 2.2 },
      { at: 14.5, cap: 'That is the back-end: a server and a database, out of sight.' },
      { at: 0.5, inspect: 'Two halves', lines: [
        [1, '[p:front-end]   [c:runs on your device]'],
        [1.6, '  HTML · CSS · JavaScript'],
        [8, ''],
        [8.4, '[a:back-end]    [c:runs on the server]'],
        [9, '  Node · Python · PHP · Go'],
        [9.6, '  + a database'],
      ] },
    ],
  },
  {
    title: 'Static or dynamic', scene: 'stack', dur: 16, short: 5, actions: [
      { at: 0, cap: 'A *static* site sends every visitor the same files. Fast, cheap, simple.',
        s: '*Static* sites vs\n*dynamic* sites' },
      { at: 7, cap: 'A *dynamic* site builds the page for you, right then, out of the database.' },
      { at: 12, cap: 'Your feed, your cart, your dashboard. Same code, different page for everyone.' },
      { at: 0.5, inspect: 'Two kinds of site', lines: [
        [1, '[p:static]    [c:a blog, a portfolio]'],
        [1.6, '  same file for everyone'],
        [7.5, ''],
        [7.9, '[a:dynamic]   [c:a shop, a feed]'],
        [8.5, '  built per request, per user'],
      ] },
    ],
  },
  {
    title: 'Recap', scene: 'pipeline', dur: 14, short: 5, actions: [
      { at: 0, cap: 'Files on a server, three languages, one tree, and pixels on your screen.',
        s: 'And that is\n*a website*.' },
      { at: 0, pstep: 5 },
      { at: 0.3, inspect: 'The whole thing', lines: [
        [0.4, '[v:1] Files live on a server'],
        [0.9, '[v:2] Your browser asks for them'],
        [1.4, '[v:3] [t:HTML] gives it structure'],
        [1.9, '[v:4] [p:CSS] gives it a look'],
        [2.4, '[v:5] [k:JavaScript] gives it behaviour'],
        [2.9, '[v:6] The DOM, then the render tree'],
        [3.4, '[v:7] Layout, then paint'],
      ] },
    ],
  },
];
