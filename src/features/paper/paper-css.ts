/**
 * The paper's stylesheet — warm newsprint & ink with a deep-green accent. A
 * restrained, classic broadsheet palette that prints beautifully. Every
 * length is in `em`; `fitPaper` scales `--s` so the page always fills exactly.
 */
export const FONT_LINK =
  'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,500;0,6..72,700;1,6..72,400;1,6..72,500&family=Inter:wght@400;500;600;700&family=Oswald:wght@400;500;600&display=swap';

export const PAPER_CSS = `
.paper{
  --ink:#1c1a16; --ink2:#3a3730; --mute:#6b6558; --faint:#9c9585;
  --line:#d4cbb6; --tint:#ebe3cf; --card:#fbf8ef; --sheet:#f4eedd;
  --dark:#26231e; --dark2:#38342c; --steel:#1f5c4a; --silver:#d9d0ba;
  --red:#1f5c4a; --red2:#9ad4bd;
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
.paper ul,.paper ol{list-style:none}
.paper .serif,.paper h1,.paper h2,.paper .p-title{font-family:'Newsreader',Georgia,'Times New Roman',serif}
.paper .num{font-family:'Oswald','Arial Narrow',sans-serif;letter-spacing:.01em}
.paper .cap{font-size:.74em;font-weight:600;letter-spacing:.2em;text-transform:uppercase}

/* masthead */
.p-mast{text-align:center;border-bottom:.3em solid var(--red);padding-bottom:.5em}
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
.p-quote{background:var(--red);color:#fff;border-radius:.8em;padding:.9em 1em;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden}
.p-quote::before{content:"\\201C";position:absolute;right:.15em;top:-.28em;font:700 7em/1 'Newsreader',serif;color:#ffffff33}
.p-quote q{quotes:none;font-family:'Newsreader',Georgia,serif;font-style:italic;font-size:1.5em;line-height:1.25;position:relative}
.p-quote cite{font-style:normal;margin-top:.7em;color:#d6efe3;display:block}

/* day bar */
.p-daybar{margin-top:.75em}
.p-daybar .track{position:relative;height:.7em;border-radius:99px;background:var(--tint);border:1px solid var(--line)}
.p-daybar .blk{position:absolute;top:-1px;bottom:-1px;border-radius:99px;background:var(--red)}
.p-daybar .blk.sug{background:repeating-linear-gradient(135deg,#4f8a74 0 3px,#bcd9cc 3px 6px)}
.p-daybar .blk.g-fitness{background:var(--dark)}
.p-daybar .blk.g-celebration{background:var(--red)}
.p-daybar .blk.g-appointment{background:var(--ink)}
.p-daybar .blk.g-task{background:#948c78}
.p-daybar .ticks{position:relative;height:1.2em;margin-top:.25em;font-size:.72em;color:var(--mute);letter-spacing:.08em}
.p-daybar .ticks span{position:absolute;transform:translateX(-50%);font-weight:600}
.p-daybar .ticks span:first-child{transform:none}
.p-daybar .ticks span:last-child{transform:translateX(-100%)}

/* stats */
.p-stats{display:flex;gap:.5em;margin-top:.8em}
.p-stat{flex:1;background:var(--card);border:1px solid var(--line);box-shadow:inset 0 .22em 0 var(--red);border-radius:.6em;padding:.6em .6em .4em}
.p-stat b{display:block;font-family:'Oswald',sans-serif;font-weight:500;font-size:1.9em;line-height:1.05}
.p-stat span{color:var(--mute);font-size:.7em;letter-spacing:.14em;text-transform:uppercase;font-weight:600}
.p-stat small{font-size:.5em;font-weight:500;letter-spacing:.05em;color:var(--mute);margin-left:.2em}

/* body grid */
.p-body{flex:1 1 auto;min-height:0;display:grid;grid-template-columns:1.02fr 1fr 1fr;gap:1em;margin-top:.9em;overflow:hidden}
.p-col{min-width:0;display:flex;flex-direction:column}
.p-h{display:flex;align-items:center;gap:.6em;color:var(--ink);margin-bottom:.5em}
.p-h::before{content:"";width:.55em;height:.55em;background:var(--red);flex:none}
.p-h::after{content:"";flex:1;height:1px;background:var(--ink)}

/* timeline */
.tl-row{display:grid;grid-template-columns:3.9em 1fr;gap:1em;padding:.42em 0;border-bottom:1px solid var(--line)}
.tl-row:last-child{border-bottom:0}
.tl-t{text-align:right;font-family:'Oswald',sans-serif;font-weight:500;font-size:1.22em;line-height:1.15;color:var(--ink)}
.tl-t small{display:block;font-family:'Inter',sans-serif;font-size:.52em;font-weight:600;letter-spacing:.14em;color:var(--mute)}
.tl-t.soft{font-size:.9em;color:var(--mute);letter-spacing:.04em}
.tl-b{position:relative;padding-left:.85em;border-left:2px solid var(--ink)}
.tl-b::before{content:"";position:absolute;left:-.43em;top:.28em;width:.68em;height:.68em;border-radius:50%;background:var(--sheet);border:2px solid var(--ink)}
.tl-row.hi .tl-b::before{background:var(--red);border-color:var(--red)}
.tl-t.sug,.tl-t.sug small{color:var(--red)}
.tl-b b{display:block;font-family:'Newsreader',Georgia,serif;font-weight:700;font-size:1.2em;line-height:1.15}
.tl-d{display:block;color:var(--mute);font-size:.86em;margin-top:.1em}
.tag{display:inline-block;margin-top:.25em;padding:.06em .55em;border-radius:99px;background:var(--tint);color:var(--ink2);font-size:.68em;font-weight:600;letter-spacing:.1em;text-transform:uppercase}
.tl-empty{color:var(--mute);font-family:'Newsreader',serif;font-style:italic;font-size:1.1em;padding:.5em 0}

/* cards */
.card{background:var(--card);border:1px solid var(--line);border-radius:.8em;padding:.7em .85em;margin-bottom:.65em;flex:0 0 auto}
.card.dark{background:var(--dark);border-color:var(--dark);color:#efe8d6}
.card-k{display:flex;justify-content:space-between;align-items:center;color:var(--steel);gap:.5em}
.card-k .pill{white-space:nowrap;flex:none;background:var(--red);color:#fff;border-radius:99px;padding:.1em .7em;font-size:1em;letter-spacing:.06em;font-family:'Oswald',sans-serif;font-weight:500;text-transform:none}
.card.dark .card-k{color:var(--red2)}
.p-title{font-weight:700;font-size:1.42em;line-height:1.1;margin:.22em 0 .12em}
.blurb{font-size:.9em;color:var(--mute);line-height:1.35}
.card.dark .blurb{color:#b0a78f}
.chips{display:flex;flex-wrap:wrap;gap:.3em;margin:.5em 0 .1em}
.chip{background:var(--tint);border-radius:.45em;padding:.2em .55em;font-size:.8em;line-height:1.2;color:var(--ink2)}
.chip b{display:block;font-family:'Oswald',sans-serif;font-weight:500;font-size:1.22em;color:var(--ink)}
.chip i{font-style:normal;font-size:.8em;letter-spacing:.1em;text-transform:uppercase;color:var(--mute);font-weight:600}
.card.dark .chip{background:#ffffff14;color:#d4cbb6}
.card.dark .chip b{color:#fff}
.card.dark .chip i{color:#948c78}

.ex{margin-top:.45em;font-size:.9em}
.ex div{display:flex;justify-content:space-between;gap:.8em;padding:.2em 0;border-bottom:1px dashed #ffffff26}
.ex div:last-child{border-bottom:0}
.ex span:first-child{flex:none;max-width:44%}
.ex span:last-child{font-family:'Oswald',sans-serif;letter-spacing:.03em;color:var(--silver);text-align:right}
.card:not(.dark) .ex div{border-bottom-color:var(--line)}
.ex .rx{display:grid;grid-template-columns:minmax(0,1.05fr) auto minmax(0,2fr);column-gap:.7em;align-items:baseline;justify-content:normal}
.ex .rx b{font-weight:600;color:var(--silver)}
.ex .rx i{font-style:normal;font-family:'Oswald',sans-serif;letter-spacing:.04em;color:var(--red2);white-space:nowrap}
.ex .rx span:last-child{text-align:left;font-family:'Inter',system-ui,sans-serif;letter-spacing:0;color:#e9e3d2;white-space:normal}
.win{margin-top:.35em;font-size:.92em}
.win div{display:grid;grid-template-columns:1fr auto;column-gap:.6em;padding:.3em 0;border-bottom:1px dashed var(--line)}
.win div:last-child{border-bottom:0}
.win b{font-family:'Oswald',sans-serif;font-weight:500;letter-spacing:.02em}
.win i{font-style:normal;color:var(--red);font-weight:600;font-size:.9em}
.win span{grid-column:1/-1;color:var(--mute);font-size:.88em}
.card:not(.dark) .ex span:last-child{color:var(--ink)}
.steps{margin-top:.45em;font-size:.88em;counter-reset:s}
.steps li{position:relative;padding:.14em 0 .14em 1.5em;counter-increment:s;color:var(--ink2)}
.steps li::before{content:counter(s);position:absolute;left:0;top:.2em;width:1.2em;height:1.2em;border-radius:50%;background:var(--red);color:#fff;font-size:.78em;display:grid;place-items:center;font-weight:600}
.card.dark .steps li{color:#ddd4bf}
.card.dark .steps li::before{background:var(--red)}

.ck{margin-top:.45em;font-size:.88em}
.ck.two{columns:2;column-gap:.8em}
.ck li{display:flex;gap:.5em;align-items:flex-start;padding:.1em 0;break-inside:avoid;color:var(--ink2)}
.ck li::before{content:"";flex:none;width:.85em;height:.85em;margin-top:.14em;border:1.5px solid var(--ink);border-radius:.22em}
.card.dark .ck li{color:#ddd4bf}
.card.dark .ck li::before{border-color:#b0a78f}
.sub{margin-top:.5em;color:var(--mute)}
.card.dark .sub{color:#b5ad97}

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
.p-fill{flex:1 1 0;min-height:0;overflow:hidden;display:flex;flex-direction:column;border:1px dashed var(--line);border-radius:.8em;padding:.5em .8em .4em;background:transparent}
.p-fill .lines{flex:1 1 0;min-height:0;margin-top:.2em;background-image:repeating-linear-gradient(to bottom,transparent 0,transparent 1.55em,var(--line) 1.55em,var(--line) calc(1.55em + 1px))}
.p-fill .wins{margin-top:.2em}
.p-notes .lines{flex:1;min-height:3em;background-image:repeating-linear-gradient(to bottom,transparent 0,transparent 1.55em,var(--line) 1.55em,var(--line) calc(1.55em + 1px))}
.ck.wins li{padding:.3em 0}
.ck.wins u{display:block;flex:1;height:1.1em;border-bottom:1px solid var(--faint);text-decoration:none}
.p-foot{margin-top:.6em;border-top:.18em solid var(--red);padding-top:.5em;display:grid;grid-template-columns:1.5fr 1fr;gap:1.2em;align-items:start}
.p-foot p{font-family:'Newsreader',Georgia,serif;font-style:italic;font-size:1.02em;color:var(--ink2);line-height:1.35}
.p-foot .rem{font-size:.86em}
.p-foot .rem b{font-family:'Oswald',sans-serif;font-weight:500}
.p-bar{display:flex;justify-content:space-between;margin-top:.45em;color:var(--faint)}

/* suggestions, focus, fuel times */
.meals u{text-decoration:none;color:var(--red);font-size:.82em;font-weight:600;margin-left:.25em}
.picks{margin-top:.4em;font-size:.88em}
.picks li{display:flex;flex-direction:column;padding:.3em .6em;margin-bottom:.3em;border-left:.24em solid var(--red);background:var(--tint);border-radius:0 .45em .45em 0}
.picks b{font-family:'Newsreader',Georgia,serif;font-size:1.1em;line-height:1.15}
.picks span{color:var(--mute);font-size:.88em}
.top3{margin-top:.5em;counter-reset:t}
.top3 li{display:flex;gap:.65em;align-items:center;padding:.32em 0;border-bottom:1px solid var(--line)}
.top3 li:last-child{border-bottom:0}
.top3 .n::before{counter-increment:t;content:counter(t);display:grid;place-items:center;width:1.8em;height:1.8em;border-radius:50%;background:var(--red);color:#fff;font:500 1em 'Oswald',sans-serif}
.top3 b{display:block;font-family:'Newsreader',Georgia,serif;font-size:1.12em;line-height:1.15}
.top3 em{font-style:normal;color:var(--mute);font-size:.84em}

@page{margin:0}
`;
