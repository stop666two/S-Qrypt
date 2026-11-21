export const homeHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#6c6cff">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" href="/app-icon.svg" type="image/svg+xml">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<title>S-Qrypt v1.0.0 — 后量子安全加密笔记</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

:root{
  /* surfaces: one cool-gray family, never pure black */
  --bg:#0e1013;--surface:#15171b;--surface2:#1b1e23;--surface3:#22262c;
  --border:#272b32;--border2:#333842;
  --text:#e9eaee;--text2:#a2a6b0;--text3:#71767f;
  /* one accent, desaturated (hsl 224 30% 62%) */
  --accent:#7f8cb8;--accent-strong:#95a1c9;--accent-ink:#0e1013;
  --danger:#c05a56;--success:#6a9c85;--warning:#c39a5f;
  --glow:rgba(127,140,184,.22);
  --shadow:0 18px 48px rgba(4,7,14,.5);--shadow-sm:0 2px 10px rgba(4,7,14,.35);
  --r-lg:14px;--r-md:10px;--r-sm:8px;--r-xs:6px;
  --ease:cubic-bezier(.2,.8,.2,1);
  --font-ui:"Segoe UI Variable Text","Segoe UI",system-ui,-apple-system,"Helvetica Neue",Arial,sans-serif;
  --font-display:ui-serif,"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;
  --font-mono:"Cascadia Mono",ui-monospace,"SF Mono",Consolas,monospace;
  --col:820px;
}
@supports (color:color-mix(in oklab,red,red)){}

html,body{height:100%}
body{
  font-family:var(--font-ui);background:var(--bg);color:var(--text);
  font-size:14px;line-height:1.6;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;
}
/* grain: breaks digital flatness, sits above bg but below content */
body::before{
  content:"";position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.05;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2'/></filter><rect width='160' height='160' filter='url(%23n)'/></svg>");
}
input,textarea,button,select{font-family:inherit;font-size:inherit;color:inherit}
button{cursor:pointer;background:none;border:none}
::selection{background:var(--accent);color:var(--accent-ink)}
:focus-visible{outline:2px solid var(--accent-strong);outline-offset:2px;border-radius:var(--r-xs)}
::-webkit-scrollbar{width:10px;height:10px}
::-webkit-scrollbar-thumb{background:var(--border2);border-radius:99px;border:3px solid var(--bg)}
#app{position:relative;z-index:1;min-height:100dvh;display:flex;flex-direction:column}

/* ---------- auth screens ---------- */
.screen{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px;background:var(--bg)}
.screen.hidden{display:none}
.box{
  position:relative;width:432px;max-width:100%;padding:40px 36px 32px;text-align:left;
  background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);box-shadow:var(--shadow);
}
.box::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;
  background:radial-gradient(120% 80% at 50% -20%,rgba(127,140,184,.10),transparent 60%)}
.box h1{font-family:var(--font-display);font-size:30px;font-weight:600;letter-spacing:-.02em;line-height:1.15}
.box p{color:var(--text2);font-size:13.5px;margin:6px 0 26px;text-wrap:pretty}
.box input,.box textarea{
  width:100%;padding:11px 13px;background:var(--surface2);color:var(--text);
  border:1px solid var(--border);border-radius:var(--r-md);margin-bottom:10px;
  transition:border-color .18s var(--ease),box-shadow .18s var(--ease),background .18s var(--ease);
}
.box input::placeholder,.box textarea::placeholder{color:var(--text3)}
.box input:hover,.box textarea:hover{border-color:var(--border2)}
.box input:focus,.box textarea:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--glow);background:var(--surface3)}
.box button{
  width:100%;padding:12px;margin-top:4px;font-weight:600;letter-spacing:.01em;
  background:var(--accent);color:var(--accent-ink);border-radius:var(--r-md);
  transition:background .18s var(--ease),transform .12s var(--ease),box-shadow .18s var(--ease);
}
.box button:hover{background:var(--accent-strong);box-shadow:0 6px 20px rgba(127,140,184,.18)}
.box button:active{transform:translateY(1px)}
.box button:disabled{opacity:.4;cursor:not-allowed;transform:none;box-shadow:none}
.box label{display:flex;gap:9px;align-items:flex-start;text-align:left;font-size:12.5px;color:var(--text2);margin:2px 0 14px}
.box label input[type=checkbox]{width:auto;margin:3px 0 0;accent-color:var(--accent)}
.box .error{color:var(--danger);font-size:12.5px;margin-top:10px;min-height:18px}
.kdf-badge{display:inline-block;font-family:var(--font-mono);font-size:10.5px;letter-spacing:.04em;
  padding:3px 8px;border-radius:var(--r-xs);background:var(--surface3);color:var(--text3);margin-top:10px}
.progress-bar{width:100%;height:2px;background:var(--border);border-radius:99px;margin:18px 0 10px;overflow:hidden}
.progress-bar-inner{height:100%;width:0%;border-radius:99px;background:var(--accent);
  transition:width .4s var(--ease)}
.progress-text{font-family:var(--font-mono);font-size:11.5px;color:var(--text3);font-variant-numeric:tabular-nums}

/* ---------- app shell ---------- */
#main-screen{flex:1;display:none;flex-direction:column}
#main-screen.active{display:flex}
.topbar{
  position:sticky;top:0;z-index:100;display:flex;align-items:center;gap:14px;
  padding:14px max(20px,calc((100% - var(--col)) / 2));
  background:color-mix(in srgb,var(--bg) 86%,transparent);
  backdrop-filter:blur(10px);border-bottom:1px solid var(--border);
}
.topbar h2{display:flex;align-items:baseline;gap:9px;font-family:var(--font-display);
  font-size:21px;font-weight:600;letter-spacing:-.02em;white-space:nowrap}
.topbar h2 .wordmark-tag{font-family:var(--font-ui);font-size:11px;font-weight:500;
  letter-spacing:.06em;text-transform:uppercase;color:var(--text3)}
.topbar .search-wrap{flex:1;display:flex;justify-content:center;min-width:120px}
.search-input{
  width:min(260px,100%);padding:7px 12px;font-size:12.5px;color:var(--text);
  background:var(--surface);border:1px solid var(--border);border-radius:99px;
  transition:border-color .18s var(--ease),background .18s var(--ease),box-shadow .18s var(--ease);
}
.search-input::placeholder{color:var(--text3)}
.search-input:hover{border-color:var(--border2)}
.search-input:focus{outline:none;border-color:var(--accent);background:var(--surface2);box-shadow:0 0 0 3px var(--glow)}
.topbar-actions{display:flex;gap:6px;align-items:center;margin-left:auto}
.topbar-actions button{
  padding:7px 12px;font-size:12.5px;color:var(--text2);background:transparent;
  border:1px solid var(--border);border-radius:var(--r-sm);white-space:nowrap;
  transition:color .16s var(--ease),background .16s var(--ease),border-color .16s var(--ease),transform .12s var(--ease);
}
.topbar-actions button:hover{color:var(--text);background:var(--surface2);border-color:var(--border2)}
.topbar-actions button:active{transform:translateY(1px)}
.topbar-actions #btn-new{color:var(--accent-strong);border-color:color-mix(in srgb,var(--accent) 45%,var(--border))}

/* ---------- note list ---------- */
#note-list{flex:1;overflow-y:auto;width:100%;max-width:var(--col);margin:0 auto;padding:22px 20px 64px}
.note-item{
  padding:15px 16px 13px;margin-bottom:8px;background:var(--surface);
  border:1px solid var(--border);border-radius:var(--r-md);cursor:pointer;
  transition:background .18s var(--ease),border-color .18s var(--ease),transform .16s var(--ease),box-shadow .18s var(--ease);
}
.note-item:hover{background:var(--surface2);border-color:var(--border2);transform:translateY(-1px);box-shadow:var(--shadow-sm)}
.note-item:active{transform:translateY(0)}
.note-item .note-title{font-size:15px;font-weight:600;letter-spacing:-.01em;margin-bottom:4px;
  word-break:break-word;text-wrap:pretty}
.note-item .note-time{font-family:var(--font-mono);font-size:11px;color:var(--text3);
  font-variant-numeric:tabular-nums;letter-spacing:.01em}
.note-item .note-actions{display:flex;gap:6px;margin-top:11px;opacity:.55;transition:opacity .16s var(--ease)}
.note-item:hover .note-actions,.note-item:focus-within .note-actions{opacity:1}
.note-item .note-actions button{
  padding:3px 9px;font-size:11.5px;color:var(--text2);background:transparent;
  border:1px solid var(--border);border-radius:var(--r-xs);
  transition:color .14s var(--ease),background .14s var(--ease),border-color .14s var(--ease);
}
.note-item .note-actions button:hover{color:var(--text);background:var(--surface3);border-color:var(--border2)}
.note-item .note-actions .btn-edit:hover{color:var(--accent-strong);border-color:var(--accent)}
.note-item .note-actions .btn-delete:hover{color:var(--danger);border-color:var(--danger);background:color-mix(in srgb,var(--danger) 12%,transparent)}
.note-item.damaged{opacity:.6;border-style:dashed}
.note-item.damaged .note-title{color:var(--text3);font-weight:500}
.load-more{display:flex;justify-content:center;padding:6px 0 0}
#btn-load-more{
  padding:8px 18px;font-size:12.5px;color:var(--text2);background:transparent;
  border:1px dashed var(--border2);border-radius:99px;
  transition:color .16s var(--ease),border-color .16s var(--ease),background .16s var(--ease);
}
#btn-load-more:hover{color:var(--text);border-style:solid;border-color:var(--accent);background:var(--surface)}

/* skeleton instead of a spinner */
#loading-state{display:none;width:100%;max-width:var(--col);margin:0 auto;padding:22px 20px}
#loading-state.show{display:block}
.sk{background:linear-gradient(90deg,var(--surface) 0%,var(--surface2) 40%,var(--surface) 80%);
  background-size:220% 100%;border-radius:var(--r-xs);animation:sk 1.25s linear infinite}
.sk-row{padding:15px 16px;margin-bottom:8px;background:var(--surface);border:1px solid var(--border);border-radius:var(--r-md)}
.sk-title{height:13px;width:52%;margin-bottom:9px}
.sk-meta{height:10px;width:26%}
@keyframes sk{from{background-position:120% 0}to{background-position:-20% 0}}

#empty-state{display:none;width:100%;max-width:var(--col);margin:0 auto;padding:76px 24px;text-align:center;color:var(--text3)}
#empty-state svg{width:44px;height:44px;margin-bottom:16px;opacity:.5}
#empty-state .empty-title{font-family:var(--font-display);font-size:20px;color:var(--text2);margin-bottom:6px}
#empty-state .empty-hint{font-size:12.5px}

/* ---------- detail ---------- */
#detail-view{position:fixed;inset:0;z-index:500;display:none;flex-direction:column;background:var(--bg)}
#detail-view.active{display:flex}
.detail-topbar{display:flex;align-items:center;justify-content:space-between;gap:10px;
  padding:12px max(20px,calc((100% - var(--col)) / 2));border-bottom:1px solid var(--border)}
.detail-topbar button{padding:6px 12px;font-size:12.5px;color:var(--text2);border-radius:var(--r-sm);
  transition:color .16s var(--ease),background .16s var(--ease)}
.detail-topbar button:hover{color:var(--text);background:var(--surface2)}
.detail-content{flex:1;overflow-y:auto;width:100%;max-width:var(--col);margin:0 auto;padding:34px 24px 80px}
.detail-content h3{font-family:var(--font-display);font-size:27px;font-weight:600;letter-spacing:-.02em;
  line-height:1.25;margin-bottom:8px;word-break:break-word;text-wrap:balance}
.detail-content .detail-time{font-family:var(--font-mono);font-size:11.5px;color:var(--text3);
  font-variant-numeric:tabular-nums;padding-bottom:20px;margin-bottom:22px;border-bottom:1px solid var(--border)}
.detail-content .detail-body{white-space:pre-wrap;word-break:break-word;color:var(--text);
  font-size:15.5px;line-height:1.75;max-width:65ch}
.detail-body-empty{color:var(--text3);font-style:italic}

/* ---------- editor ---------- */
#editor-overlay{position:fixed;inset:0;z-index:600;display:none;align-items:center;justify-content:center;
  padding:20px;background:rgba(6,8,12,.72);backdrop-filter:blur(6px)}
#editor-overlay.active{display:flex}
.editor-box{width:min(680px,100%);max-height:88dvh;display:flex;flex-direction:column;
  background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);box-shadow:var(--shadow)}
.editor-header{display:flex;align-items:center;justify-content:space-between;
  padding:15px 20px;border-bottom:1px solid var(--border)}
.editor-header h3{font-family:var(--font-display);font-size:17px;font-weight:600}
.editor-header button{padding:4px 9px;font-size:16px;color:var(--text3);border-radius:var(--r-xs);
  transition:color .16s var(--ease),background .16s var(--ease)}
.editor-header button:hover{color:var(--text);background:var(--surface2)}
.editor-body{padding:20px;overflow-y:auto;flex:1}
.editor-body input{width:100%;padding:10px 13px;margin-bottom:12px;font-size:16px;font-weight:600;
  background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:var(--r-md);
  transition:border-color .18s var(--ease),box-shadow .18s var(--ease)}
.editor-body textarea{width:100%;min-height:300px;padding:12px 13px;font-size:14px;line-height:1.7;
  background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:var(--r-md);resize:vertical;
  transition:border-color .18s var(--ease),box-shadow .18s var(--ease)}
.editor-body input:focus,.editor-body textarea:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--glow)}
.editor-footer{display:flex;align-items:center;justify-content:flex-end;gap:8px;
  padding:14px 20px;border-top:1px solid var(--border)}
.editor-footer button{padding:9px 20px;font-size:13px;font-weight:600;border-radius:var(--r-sm);
  transition:background .16s var(--ease),color .16s var(--ease),transform .12s var(--ease),border-color .16s var(--ease)}
.editor-footer button:active{transform:translateY(1px)}
.btn-cancel{color:var(--text2);border:1px solid var(--border)}
.btn-cancel:hover{color:var(--text);border-color:var(--border2);background:var(--surface2)}
.btn-save{background:var(--accent);color:var(--accent-ink)}
.btn-save:hover{background:var(--accent-strong)}
.btn-save:disabled{opacity:.4;cursor:not-allowed;transform:none}

/* ---------- toast ---------- */
.status-toast{position:fixed;left:50%;bottom:28px;transform:translate(-50%,12px);z-index:2000;
  display:none;max-width:min(92vw,520px);padding:11px 18px;font-size:13px;
  background:var(--surface2);color:var(--text);border:1px solid var(--border2);border-radius:99px;
  box-shadow:var(--shadow);transition:opacity .2s var(--ease),transform .2s var(--ease)}
.status-toast.show{display:block;transform:translate(-50%,0)}
.status-toast.error{color:#f0c9c7;border-color:color-mix(in srgb,var(--danger) 55%,var(--border))}
.status-toast.success{color:#cfe3d9;border-color:color-mix(in srgb,var(--success) 55%,var(--border))}

/* ---------- dialogs & panels ---------- */
#confirm-dialog,#trash-panel,#audit-panel,#audit-key-overlay{
  position:fixed;inset:0;z-index:800;display:none;align-items:center;justify-content:center;padding:20px;
  background:rgba(6,8,12,.72);backdrop-filter:blur(6px);
}
#confirm-dialog.active,#trash-panel.active,#audit-panel.active{display:flex}
#audit-key-overlay{display:none}
.confirm-box{width:min(400px,100%);padding:22px;background:var(--surface);
  border:1px solid var(--border);border-radius:var(--r-lg);box-shadow:var(--shadow)}
.confirm-box p{margin-bottom:6px;font-size:14px;text-wrap:pretty}
.confirm-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}
/* shared button vocabulary for JS-built markup */
.btn{padding:8px 16px;font-size:13px;font-weight:500;border-radius:var(--r-sm);
  border:1px solid var(--border);color:var(--text2);background:transparent;
  transition:color .16s var(--ease),background .16s var(--ease),border-color .16s var(--ease),transform .12s var(--ease)}
.btn:hover{color:var(--text);background:var(--surface2);border-color:var(--border2)}
.btn:active{transform:translateY(1px)}
.btn-primary{background:var(--accent);color:var(--accent-ink);border-color:transparent;font-weight:600}
.btn-primary:hover{background:var(--accent-strong);color:var(--accent-ink)}
.btn-danger{color:var(--danger);border-color:color-mix(in srgb,var(--danger) 50%,var(--border))}
.btn-danger:hover{background:color-mix(in srgb,var(--danger) 14%,transparent);color:var(--danger);border-color:var(--danger)}
.btn-accent{color:var(--accent-strong);border-color:color-mix(in srgb,var(--accent) 50%,var(--border))}
.btn-accent:hover{background:color-mix(in srgb,var(--accent) 14%,transparent);color:var(--accent-strong);border-color:var(--accent)}
.btn-sm{padding:4px 10px;font-size:11.5px;border-radius:var(--r-xs)}
.seg{display:inline-flex;padding:2px;gap:2px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--r-sm)}
.seg button{padding:5px 13px;font-size:12px;font-weight:500;border-radius:var(--r-xs);color:var(--text2);
  transition:color .16s var(--ease),background .16s var(--ease)}
.seg button:hover{color:var(--text)}
.seg button[aria-pressed=true]{background:var(--surface3);color:var(--text);box-shadow:var(--shadow-sm)}

.audit-box{width:min(720px,100%);max-height:86dvh;display:flex;flex-direction:column;
  background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);box-shadow:var(--shadow)}
.audit-header{display:flex;align-items:center;justify-content:space-between;
  padding:15px 20px;border-bottom:1px solid var(--border)}
.audit-header h3{font-family:var(--font-display);font-size:17px;font-weight:600}
.audit-header button{padding:4px 9px;font-size:16px;color:var(--text3);border-radius:var(--r-xs);
  transition:color .16s var(--ease),background .16s var(--ease)}
.audit-header button:hover{color:var(--text);background:var(--surface2)}
.audit-body{padding:10px 20px;overflow-y:auto;flex:1;max-height:58vh}
.audit-entry{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px;padding:9px 0;font-size:12px;
  color:var(--text2);font-family:var(--font-mono);border-bottom:1px solid var(--border)}
.audit-entry:last-child{border-bottom:none}
.audit-entry .ts{color:var(--text3);font-variant-numeric:tabular-nums}
.audit-entry .ev{color:var(--accent-strong);letter-spacing:.02em}
.audit-empty{padding:44px 20px;text-align:center;color:var(--text3);font-size:13px}
.audit-actions{display:flex;align-items:center;gap:8px;justify-content:flex-end;
  padding:12px 20px;border-top:1px solid var(--border)}
.audit-actions button{padding:7px 14px;font-size:12.5px;color:var(--text2);
  background:var(--surface2);border:1px solid var(--border);border-radius:var(--r-sm);
  transition:color .16s var(--ease),border-color .16s var(--ease),background .16s var(--ease)}
.audit-actions button:hover{color:var(--text);border-color:var(--border2);background:var(--surface3)}
#audit-key-overlay>div{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);box-shadow:var(--shadow)}
#audit-key-textarea{background:var(--surface2);border:1px solid var(--border);border-radius:var(--r-md);
  color:var(--text);font-family:var(--font-mono);font-size:11.5px;line-height:1.55;
  transition:border-color .18s var(--ease),box-shadow .18s var(--ease)}
#audit-key-textarea:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--glow)}

.audit-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 20px;border-bottom:1px solid var(--border)}
.btn-audit-tab{padding:5px 13px;font-size:12px;font-weight:500;color:var(--text2);background:transparent;
  border:1px solid var(--border);border-radius:var(--r-xs);
  transition:color .16s var(--ease),background .16s var(--ease),border-color .16s var(--ease)}
.btn-audit-tab:hover{color:var(--text);border-color:var(--border2);background:var(--surface2)}
.btn-audit-tab[aria-pressed=true]{background:var(--accent);color:var(--accent-ink);border-color:transparent;font-weight:600}
.pk-input{width:100%;height:96px;padding:10px 12px;background:var(--surface2);color:var(--text2);
  border:1px solid var(--border);border-radius:var(--r-md);font-family:var(--font-mono);font-size:11.5px;
  line-height:1.55;resize:none;transition:border-color .18s var(--ease),box-shadow .18s var(--ease)}
.pk-input:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--glow)}

/* ---------- responsive ---------- */
@media (max-width:760px){
  .topbar{flex-wrap:wrap;gap:10px;padding:12px 14px}
  .topbar .search-wrap{order:3;flex-basis:100%;justify-content:stretch}
  .search-input{width:100%}
  .topbar-actions{gap:4px}
  .topbar-actions button{padding:7px 9px;font-size:12px}
  #note-list,#detail-view .detail-content,#loading-state{padding-left:14px;padding-right:14px}
  .detail-content h3{font-size:23px}
  .detail-content .detail-body{font-size:15px;line-height:1.72}
  .box{padding:30px 22px 24px}
  .box h1{font-size:26px}
  .audit-body{max-height:52vh}
}
@media (max-width:420px){
  .topbar h2 .wordmark-tag{display:none}
  .topbar-actions button{padding:7px 8px}
}
@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{animation-duration:.001ms!important;transition-duration:.001ms!important}
}
</style>
</head>
<body>
<div id="app">
<div id="lock-screen" class="screen">
<div class="box">
<h1>S-Qrypt</h1>
<p>后量子安全加密笔记 · 请输入主密码</p>
<input type="password" id="login-password" placeholder="输入主密码" autocomplete="new-password" spellcheck="false">
<button id="login-btn">解锁</button>
<div class="error" id="login-error"></div>
<div id="lock-fail-badge" class="kdf-badge" style="display:none"></div>
<div class="progress-bar" id="login-progress" style="display:none"><div class="progress-bar-inner" id="login-progress-inner"></div></div>
<div class="progress-text" id="login-progress-text"></div>
</div>
</div>
<div id="init-screen" class="screen">
<div class="box">
<h1>初始化保险箱</h1>
<p>设置主密码以创建加密笔记保险箱</p>
<input type="password" id="init-password" placeholder="输入主密码" autocomplete="new-password" spellcheck="false">
<input type="password" id="init-password-confirm" placeholder="再次输入主密码" autocomplete="new-password" spellcheck="false">
<input type="password" id="init-setup-token" placeholder="部署时配置的 SETUP_TOKEN（初始化密钥）" autocomplete="new-password" spellcheck="false">
<label><input type="checkbox" id="init-legacy"><span>旧版本保险箱（v1/v2）：按无盐派生初始化，登录后会自动提示升级到 v3</span></label>
<textarea id="init-public-key" class="pk-input" placeholder='RSA 公钥 PEM（2048/4096 位，审计日志加密用）&#10;如何生成: openssl genpkey -algorithm RSA -out private.pem -pkeyopt rsa_keygen_bits:4096&#10;openssl pkey -in private.pem -pubout -out public.pem&#10;然后将 public.pem 内容粘贴到此处' ></textarea>
<button id="init-btn">创建保险箱</button>
<div class="error" id="init-error"></div>
<div class="progress-bar" id="init-progress" style="display:none"><div class="progress-bar-inner" id="init-progress-inner"></div></div>
<div class="progress-text" id="init-progress-text"></div>
</div>
</div>
<div id="main-screen">
<div class="topbar">
<h2>S-Qrypt<span class="wordmark-tag">零知识</span></h2>
<div class="search-wrap"><input type="text" id="search-input" class="search-input" placeholder="搜索笔记标题" aria-label="搜索笔记标题"></div>
<div class="topbar-actions">
<button id="btn-new">+ 新建</button>
<button id="btn-backup">备份</button>
<button id="btn-import">导入</button>
<input type="file" id="import-file" accept=".json,application/json" style="display:none">
<button id="btn-trash">回收站</button>
<button id="btn-audit">日志</button>
<button id="btn-lock">锁定</button>
</div>
</div>
<div id="note-list"></div>
<div id="loading-state"><div class="sk-row"><div class="sk sk-title"></div><div class="sk sk-meta"></div></div><div class="sk-row"><div class="sk sk-title"></div><div class="sk sk-meta"></div></div><div class="sk-row"><div class="sk sk-title"></div><div class="sk sk-meta"></div></div></div>
<div id="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="12" cy="12" r="3.2"/><path d="M12 6.6v2.2M12 15.2v2.2M6.6 12h2.2M15.2 12h2.2"/></svg><div class="empty-title">保险箱是空的</div><div class="empty-hint">按 <kbd>Ctrl</kbd> + <kbd>N</kbd> 或点右上角「+ 新建」写下第一条加密笔记</div></div>
</div>
<div id="detail-view">
<div class="detail-topbar">
<button id="detail-back">← 返回</button>
<button id="detail-edit">编辑</button>
</div>
<div class="detail-content">
<h3 id="detail-title"></h3>
<div class="detail-time" id="detail-time"></div>
<div class="detail-body" id="detail-body"></div>
</div>
</div>
<div id="editor-overlay">
<div class="editor-box">
<div class="editor-header">
<h3 id="editor-title">新建笔记</h3>
<button id="editor-close">✕</button>
</div>
<div class="editor-body">
<input type="text" id="editor-note-title" placeholder="笔记标题" maxlength="200">
<textarea id="editor-note-body" placeholder="正文内容..."></textarea>
</div>
<div class="editor-footer">
<button class="btn-cancel" id="editor-cancel">取消</button>
<button class="btn-save" id="editor-save">保存</button>
</div>
</div>
</div>
<div id="confirm-dialog">
<div class="confirm-box">
<p id="confirm-text">确认操作？</p>
<div class="confirm-actions">
<button class="btn-confirm-yes" id="confirm-yes">确认</button>
<button class="btn-confirm-no" id="confirm-no">取消</button>
</div>
</div>
</div>
<div id="trash-panel">
<div class="audit-box">
<div class="audit-header">
<h3>回收站</h3>
<button id="trash-close">✕</button>
</div>
<div class="audit-body" id="trash-body"><div class="audit-empty">暂无已删除笔记</div></div>
</div>
</div>

<div id="audit-panel">
<div class="audit-box">
<div class="audit-header">
<h3>安全审计日志</h3>
<button id="audit-close">✕</button>
</div>
<div class="audit-toolbar">
<button id="audit-local" class="btn-audit-tab" aria-pressed="true">本地日志</button>
<button id="audit-remote" class="btn-audit-tab" aria-pressed="false">远程日志</button>
<span style="font-size:11px;color:var(--text3);flex:1;min-width:200px">
<b style="color:var(--text2);font-size:12px">离线解密方法</b><br>
下载 JSON → 取一条 <code style="font-size:10px">encrypted</code> 值执行:<br>
<code style="font-size:10px;background:var(--surface2);display:inline-block;padding:6px 8px;border-radius:4px;margin:4px 0;line-height:1.7">
echo "BASE64字符串" | openssl base64 -d | openssl pkeyutl -decrypt \<br>
&nbsp;&nbsp;-inkey private.pem \<br>
&nbsp;&nbsp;-pkeyopt rsa_padding_mode:oaep \<br>
&nbsp;&nbsp;-pkeyopt oaep_hash:sha256
</code><br>
<span style="font-size:10px;color:var(--text3)">
参数: <code>base64 -d</code> 解码base64 → <code>pkeyutl -decrypt</code> 私钥解密 →<br>
<code>oaep</code> 填充模式 + <code>sha256</code> 哈希，与浏览器 Web Crypto 一致
</span>
</span>
<button id="audit-download" class="btn btn-primary btn-sm">下载日志</button>
</div>
<div class="audit-body" id="audit-body"><div class="audit-empty">暂无日志记录</div></div>
<div class="audit-actions">
<button id="audit-clear">清除本地日志</button>
<span id="audit-key-status" style="font-size:11px;color:var(--text3);flex:1;text-align:right;line-height:2"></span>
<button id="audit-key-config" style="font-size:12px;padding:5px 12px;border-radius:6px;cursor:pointer;background:var(--surface2);border:1px solid var(--border);color:var(--text2)">配置审计密钥</button>
</div>
</div>
</div>
<div id="audit-key-overlay" style="position:fixed;inset:0;z-index:800;background:rgba(0,0,0,.75);display:none;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(3px)">
<div class="audit-box" style="width:560px">
<div style="display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:1px solid var(--border)">
<h3 style="font-size:16px;font-weight:600">审计日志公钥配置</h3>
<button id="audit-key-close" style="background:transparent;border:none;color:var(--text2);cursor:pointer;font-size:18px;padding:4px 8px;border-radius:6px">✕</button>
</div>
<div style="padding:20px 24px;overflow-y:auto;flex:1">
<p style="font-size:13px;color:var(--text2);margin-bottom:12px">粘贴 RSA 公钥 PEM（2048/4096 位），用于加密审计日志。</p>
<p id="audit-key-warning" style="font-size:12px;color:var(--warning);margin-bottom:12px;display:none"></p>
<textarea id="audit-key-textarea" placeholder="-----BEGIN PUBLIC KEY-----&#10;...&#10;-----END PUBLIC KEY-----" style="width:100%;height:160px;padding:12px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);outline:none;font-size:11px;font-family:monospace;resize:vertical;line-height:1.5"></textarea>
</div>
<div style="display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:14px 24px;border-top:1px solid var(--border)">
<span id="audit-key-msg" style="font-size:12px;color:var(--text3);flex:1"></span>
<button id="audit-key-cancel" class="btn">取消</button>
<button id="audit-key-save" class="btn btn-primary">保存密钥</button>
</div>
</div>
</div>
<div class="status-toast" id="status-toast"></div>
</div>
<script src="/argon2.js"></script>
<script src="/app.js"></script>
</body>
</html>`;
