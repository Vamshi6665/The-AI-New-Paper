/**
 * The paper's stylesheet — graphite & silver. One monochrome family with a
 * single cool-steel accent, so it prints beautifully on any printer. Every
 * length is in `em`; `fitPaper` scales `--s` so the page always fills exactly.
 */
export const FONT_LINK =
  'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,500;0,6..72,700;1,6..72,400;1,6..72,500&family=Inter:wght@400;500;600;700&family=Oswald:wght@400;500;600&display=swap';

export const PAPER_CSS = `
.paper{
  --ink:#15171a; --ink2:#363a41; --mute:#6c717a; --faint:#9aa0a8;
  --line:#d3d5d9; --tint:#e9e9e6; --card:#fbfbfa; --sheet:#f3f3f1;
  --dark:#1b1e22; --dark2:#2b2f35; --steel:#8a9bb0; --silver:#c9ced6;
  -webkit-print-color-adjust:exact; print-color-adjust:exact;
  position:relative; box-sizing:border-box; overflow:hidden;
  width:var(--pw); height:var(--ph);
  padding:2.4em 2.6em 2em;
  background:var(--sheet); color:var(--ink);
  font-family:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;
  font-size:calc(10px * var(--s,1)); line-height:1.35; letter-spacing:-.003em;
  display:flex; flex-direction:column; text-align:left; container-type:inline-size;
}
.paper *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.paper ul{list-style:none}
.paper .serif,.paper h1,.paper h2,.paper .p-title{font-family:'Newsreader',Georgia,'Times New Roman',serif}
.paper .num{font-family:'Oswald','Arial Narrow',sans-serif;letter-spacing:.01em}
.paper .cap{font-size:.74em;font-weight:600;letter-spacing:.2em;text-transform:uppercase}

/* masthead */
.p-mast{text-align:center;border-bottom:.28em solid var(--ink);padding-bottom:.5em}
.p-mast-top{display:flex;justify-content:space-between;color:var(--mute)}
.p-mast h1{font-weight:700;font-size:min(4.7em,8.4cqw);line-height:1;letter-spacing:-.015em;margin:.16em 0 .08em;color:var(--ink)}
.p-mast h1.long{font-size:min(3.5em,6.2cqw)}
.p-mast h1.xlong{font-size:min(2.6em,4.6cqw)}
.p-rhythm{display:grid;grid-template-columns:repeat(5,1fr);margin-top:.5em;border-top:1px solid var(--line);padding-top:.5em}
.p-rhythm>div{padding:0 .4em;border-left:1px solid var(--line)}
.p-rhythm>div:first-child{border-left:0}
.p-rhythm b{display:block;font-family:'Oswald',sans-serif;font-weight:500;font-size:1.55em;line-height:1.1;color:var(--ink)}
.p-rhythm span{display:block;margin-bottom:.1em;color:var(--mute)}

/* lead + quote */
.p-top{display:grid;grid-template-columns:1.65fr 1fr;gap:1.1em;margin-top:.85em}
.p-lead .kick{display:flex;align-items:center;gap:.7em;color:var(--steel)}
.p-lead .kick::after{content:"";flex:1;height:1px;background:var(--line)}
.p-lead h2{font-weight:700;font-size:2.35em;line-height:1.06;letter-spacing:-.012em;margin:.28em 0 .3em}
.p-lead p{font-size:1.08em;line-height:1.5;color:var(--ink2);font-family:'Newsreader',Georgia,serif}
.p-quote{background:var(--dark);color:#eceef1;border-radius:.8em;padding:.9em 1em;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden}
.p-quote::before{content:"\\201C";position:absolute;right:.15em;top:-.28em;font:700 7em/1 'Newsreader',serif;color:#ffffff14}
.p-quote q{quotes:none;font-family:'Newsreader',Georgia,serif;font-style:italic;font-size:1.28em;line-height:1.28;position:relative}
.p-quote cite{font-style:normal;margin-top:.7em;color:var(--steel);display:block}

/* day bar */
.p-daybar{margin-top:.75em}
.p-daybar .track{position:relative;height:.7em;border-radius:99px;background:var(--tint);border:1px solid var(--line)}
.p-daybar .blk{position:absolute;top:-1px;bottom:-1px;border-radius:99px;background:var(--ink)}
.p-daybar .blk.g-fitness{background:#4a4f57}
.p-daybar .blk.g-celebration{background:var(--steel)}
.p-daybar .blk.g-appointment{background:#2b2f35;box-shadow:inset 0 0 0 1.5px var(--steel)}
.p-daybar .blk.g-task{background:#9aa0a8}
.p-daybar .ticks{position:relative;height:1.2em;margin-top:.25em;font-size:.72em;color:var(--mute);letter-spacing:.08em}
.p-daybar .ticks span{position:absolute;transform:translateX(-50%);font-weight:600}
.p-daybar .ticks span:first-child{transform:none}
.p-daybar .ticks span:last-child{transform:translateX(-100%)}

/* stats */
.p-stats{display:flex;gap:.5em;margin-top:.8em}
.p-stat{flex:1;background:var(--card);border:1px solid var(--line);border-radius:.6em;padding:.45em .6em}
.p-stat b{display:block;font-family:'Oswald',sans-serif;font-weight:500;font-size:1.9em;line-height:1.05}
.p-stat span{color:var(--mute);font-size:.7em;letter-spacing:.14em;text-transform:uppercase;font-weight:600}
.p-stat small{font-size:.5em;font-weight:500;letter-spacing:.05em;color:var(--mute);margin-left:.2em}

/* body grid */
.p-body{flex:1 1 auto;min-height:0;display:grid;grid-template-columns:1.02fr 1fr 1fr;gap:1em;margin-top:.9em;overflow:hidden}
.p-col{min-width:0;display:flex;flex-direction:column}
.p-h{display:flex;align-items:center;gap:.6em;color:var(--ink);margin-bottom:.5em}
.p-h::after{content:"";flex:1;height:1px;background:var(--ink)}

/* timeline */
.tl-row{display:grid;grid-template-columns:3.9em 1fr;gap:1em;padding:.42em 0;border-bottom:1px solid var(--line)}
.tl-row:last-child{border-bottom:0}
.tl-t{text-align:right;font-family:'Oswald',sans-serif;font-weight:500;font-size:1.22em;line-height:1.15;color:var(--ink)}
.tl-t small{display:block;font-family:'Inter',sans-serif;font-size:.52em;font-weight:600;letter-spacing:.14em;color:var(--mute)}
.tl-t.soft{font-size:.9em;color:var(--mute);letter-spacing:.04em}
.tl-b{position:relative;padding-left:.85em;border-left:2px solid var(--ink)}
.tl-b::before{content:"";position:absolute;left:-.43em;top:.28em;width:.68em;height:.68em;border-radius:50%;background:var(--sheet);border:2px solid var(--ink)}
.tl-row.hi .tl-b::before{background:var(--ink)}
.tl-b b{display:block;font-family:'Newsreader',Georgia,serif;font-weight:700;font-size:1.2em;line-height:1.15}
.tl-d{display:block;color:var(--mute);font-size:.86em;margin-top:.1em}
.tag{display:inline-block;margin-top:.25em;padding:.06em .55em;border-radius:99px;background:var(--tint);color:var(--ink2);font-size:.68em;font-weight:600;letter-spacing:.1em;text-transform:uppercase}
.tl-empty{color:var(--mute);font-family:'Newsreader',serif;font-style:italic;font-size:1.1em;padding:.5em 0}

/* cards */
.card{background:var(--card);border:1px solid var(--line);border-radius:.8em;padding:.7em .85em;margin-bottom:.65em;flex:0 0 auto}
.card.grow{flex:1 1 auto}
.card.dark{background:var(--dark);border-color:var(--dark);color:#eceef1}
.card-k{display:flex;justify-content:space-between;align-items:center;color:var(--steel);gap:.5em}
.card-k .pill{background:var(--dark);color:#fff;border-radius:99px;padding:.1em .7em;font-size:1em;letter-spacing:.06em;font-family:'Oswald',sans-serif;font-weight:500;text-transform:none}
.card.dark .pill{background:#ffffff1f}
.p-title{font-weight:700;font-size:1.42em;line-height:1.1;margin:.22em 0 .12em}
.blurb{font-size:.9em;color:var(--mute);line-height:1.35}
.card.dark .blurb{color:#aab2bd}
.chips{display:flex;flex-wrap:wrap;gap:.3em;margin:.5em 0 .1em}
.chip{background:var(--tint);border-radius:.45em;padding:.2em .55em;font-size:.8em;line-height:1.2;color:var(--ink2)}
.chip b{display:block;font-family:'Oswald',sans-serif;font-weight:500;font-size:1.22em;color:var(--ink)}
.chip i{font-style:normal;font-size:.8em;letter-spacing:.1em;text-transform:uppercase;color:var(--mute);font-weight:600}
.card.dark .chip{background:#ffffff14;color:#cfd4db}
.card.dark .chip b{color:#fff}
.card.dark .chip i{color:#8d97a4}

.ex{margin-top:.45em;font-size:.9em}
.ex div{display:flex;justify-content:space-between;gap:.8em;padding:.2em 0;border-bottom:1px dashed #ffffff26}
.ex div:last-child{border-bottom:0}
.ex span:last-child{font-family:'Oswald',sans-serif;letter-spacing:.03em;color:var(--silver);white-space:nowrap}
.card:not(.dark) .ex div{border-bottom-color:var(--line)}
.card:not(.dark) .ex span:last-child{color:var(--ink)}
.steps{margin-top:.45em;font-size:.88em;counter-reset:s}
.steps li{position:relative;padding:.14em 0 .14em 1.5em;counter-increment:s;color:var(--ink2)}
.steps li::before{content:counter(s);position:absolute;left:0;top:.2em;width:1.2em;height:1.2em;border-radius:50%;background:var(--ink);color:#fff;font-size:.78em;display:grid;place-items:center;font-weight:600}
.card.dark .steps li{color:#d7dbe1}
.card.dark .steps li::before{background:#ffffff26}

.ck{margin-top:.45em;font-size:.88em}
.ck.two{columns:2;column-gap:.8em}
.ck li{display:flex;gap:.5em;align-items:flex-start;padding:.1em 0;break-inside:avoid;color:var(--ink2)}
.ck li::before{content:"";flex:none;width:.85em;height:.85em;margin-top:.14em;border:1.5px solid var(--ink);border-radius:.22em}
.card.dark .ck li{color:#d7dbe1}
.card.dark .ck li::before{border-color:#aab2bd}
.sub{margin-top:.5em;color:var(--mute)}
.card.dark .sub{color:#8d97a4}

/* fuel */
.fuel{display:flex;gap:.8em;align-items:center;margin-top:.5em}
.ring{flex:none;width:6em;height:6em;border-radius:50%;position:relative;display:grid;place-items:center}
.ring::after{content:"";position:absolute;inset:.85em;border-radius:50%;background:var(--card)}
.ring div{position:relative;z-index:1;text-align:center;line-height:1}
.ring b{display:block;font-family:'Oswald',sans-serif;font-weight:500;font-size:1.45em}
.ring small{font-size:.62em;letter-spacing:.14em;color:var(--mute);font-weight:600}
.meals{flex:1;font-size:.86em}
.meals div{display:grid;grid-template-columns:.8em 1fr auto;gap:.4em;align-items:baseline;padding:.12em 0}
.meals i{width:.7em;height:.7em;border-radius:50%}
.meals em{font-style:normal;color:var(--mute);font-size:.84em;display:block;line-height:1.2}
.meals span.k{font-family:'Oswald',sans-serif}
.glasses{display:flex;flex-wrap:wrap;gap:.28em;margin-top:.5em}
.glasses i{display:block;width:.95em;height:1.3em;border:1.5px solid var(--ink);border-radius:.1em .1em .38em .38em}
.note{font-size:.72em;color:var(--faint);margin-top:.45em;line-height:1.3}

/* footer */
.p-notes{flex:1 1 auto;min-height:7em;display:flex;flex-direction:column;margin-top:.6em}
.p-notes .lines{flex:1;min-height:3em;background-image:repeating-linear-gradient(to bottom,transparent 0,transparent 1.55em,var(--line) 1.55em,var(--line) calc(1.55em + 1px))}
.ck.wins li{padding:.3em 0}
.ck.wins u{display:block;flex:1;height:1.1em;border-bottom:1px solid var(--faint);text-decoration:none}
.p-foot{margin-top:.6em;border-top:.18em solid var(--ink);padding-top:.5em;display:grid;grid-template-columns:1.5fr 1fr;gap:1.2em;align-items:start}
.p-foot p{font-family:'Newsreader',Georgia,serif;font-style:italic;font-size:1.02em;color:var(--ink2);line-height:1.35}
.p-foot .rem{font-size:.86em}
.p-foot .rem b{font-family:'Oswald',sans-serif;font-weight:500}
.p-bar{display:flex;justify-content:space-between;margin-top:.45em;color:var(--faint)}

@page{margin:0}
`;
