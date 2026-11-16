# Day / Night Toggle

![preview](preview.png)

A sun-to-moon switch in pure CSS. One hidden checkbox, no JavaScript.

## How it works

- The real `<input type="checkbox">` is hidden but still focusable, so the toggle works with a keyboard and screen readers.
- `input:checked + .track` restyles everything when it is on: the sky darkens, the sun slides across and becomes a moon, the cloud sinks and the stars rise.
- `body:has(input:checked)` changes the page background too.
- The cloud and the stars are each one element. Their extra shapes are `box-shadow`s.
- The bounce comes from a `cubic-bezier` curve that overshoots.

## Run

Open `index.html` in a browser. No build step.

## Files

```
Day-Night-Toggle/
├── index.html
├── style.css
└── preview.png
```
