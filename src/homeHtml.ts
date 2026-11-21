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
<title>S-Qrypt v1.5.0 — 后量子安全加密笔记</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

:root{
  /* §16.3.3 暗色四级明度分层，不用描边；禁止纯黑 */
  --bg:#0b0b0a;--surface:#151515;--surface2:#1a1a19;--surface3:#20201e;
  --text:#ececea;--text2:#b3b3ad;--text3:#96968f;
  /* 单一低饱和看点色（hsl 224 26% 64%） */
  --accent:#8f9bc4;--accent-strong:#a8b3d6;--accent-ink:#0b0b0a;
  --danger:#cf6f6a;--success:#7cab93;--warning:#c9a468;
  /* §16.3.4 暗色字重降 40 */
  --w-body:360;--w-med:460;--w-semi:560;--w-bold:620;--w-display:360;
  --ring-inner:rgba(143,155,196,.95);--ring-outer:rgba(143,155,196,.28);
  --shadow:0 20px 50px -12px rgba(0,0,0,.85);--shadow-sm:0 8px 20px -12px rgba(0,0,0,.9);
  --r-lg:16px;--r-md:12px;--r-sm:9px;--r-xs:7px;
  --ease:cubic-bezier(.2,.8,.2,1);
  --font-ui:"Segoe UI Variable Text","Segoe UI",system-ui,-apple-system,"Helvetica Neue",Arial,sans-serif;
  --font-display:Georgia,"Iowan Old Style","Palatino Linotype",ui-serif,serif;
  --font-mono:"Cascadia Mono",ui-monospace,"SF Mono",Consolas,monospace;
  --col:820px;
}

html,body{height:100%}
body{
  font-family:var(--font-ui);background:var(--bg);color:var(--text);
  font-size:14.5px;line-height:1.62;
  font-weight:var(--w-body);
  font-optical-sizing:auto;
}
input,textarea,button,select{font-family:inherit;font-size:inherit;color:inherit;font-weight:inherit}
button{cursor:pointer;background:none;border:none}
::selection{background:var(--accent);color:var(--accent-ink)}
/* §16.5.2 焦点用双环，不静默移除 */
:focus-visible{outline:none;box-shadow:0 0 0 1px var(--ring-inner),0 0 0 4px var(--ring-outer);border-radius:var(--r-sm)}
::-webkit-scrollbar{width:10px;height:10px}
::-webkit-scrollbar-thumb{background:var(--surface3);border-radius:99px}
#app{min-height:100dvh;display:flex;flex-direction:column}

/* ---------- auth ---------- */
.screen{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px;background:var(--bg)}
.screen.hidden{display:none}
.boot-box{text-align:center}
.spinner{width:20px;height:20px;margin:18px auto 0;border-radius:50%;border:2px solid var(--surface3);border-top-color:var(--accent);animation:sq-spin .9s linear infinite}
@keyframes sq-spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion: reduce){.spinner{animation-duration:2.4s}}
.box{
  width:436px;max-width:100%;padding:38px 34px 30px;
  background:var(--surface);border-radius:var(--r-lg);box-shadow:var(--shadow);
}
.box h1{font-family:var(--font-display);font-size:32px;font-weight:var(--w-display);letter-spacing:-.01em;line-height:1.1}
.box p{color:var(--text2);font-size:13.5px;margin:8px 0 26px;text-wrap:pretty}
.box input,.box textarea{
  width:100%;padding:12px 14px;margin-bottom:10px;
  background:var(--surface2);color:var(--text);border:0;border-radius:var(--r-md);
  transition:background .18s var(--ease),box-shadow .18s var(--ease);
}
.box input::placeholder,.box textarea::placeholder{color:var(--text3)}
.box input:hover,.box textarea:hover{background:var(--surface3)}
.box input:focus-visible,.box textarea:focus-visible{outline:none;background:var(--surface3);
  box-shadow:0 0 0 1px var(--ring-inner),0 0 0 4px var(--ring-outer)}
.box button{
  width:100%;min-height:46px;margin-top:6px;font-weight:var(--w-semi);letter-spacing:.01em;
  background:var(--accent);color:var(--accent-ink);border-radius:var(--r-md);
  transition:background .18s var(--ease),transform .12s var(--ease);
}
.box button:hover{background:var(--accent-strong)}
.box button:active{transform:translateY(1px)}
.box button:disabled{opacity:.45;cursor:not-allowed;transform:none}
.box label{display:flex;gap:10px;align-items:flex-start;text-align:left;font-size:12.5px;color:var(--text2);margin:2px 0 14px;line-height:1.5}
.box label input[type=checkbox]{width:auto;margin:3px 0 0;accent-color:var(--accent)}
.box .error{color:var(--danger);font-size:12.5px;margin-top:10px;min-height:18px}
.kdf-badge{display:inline-block;font-family:var(--font-mono);font-size:11px;letter-spacing:.02em;
  padding:4px 9px;border-radius:var(--r-xs);background:var(--surface2);color:var(--text2);margin-top:10px}
.progress-bar{width:100%;height:3px;background:var(--surface2);border-radius:99px;margin:20px 0 10px;overflow:hidden}
.progress-bar-inner{height:100%;width:0%;border-radius:99px;background:var(--accent);transition:width .4s var(--ease)}
.progress-text{font-family:var(--font-mono);font-size:12px;color:var(--text2);font-variant-numeric:tabular-nums}

/* ---------- shell ---------- */
#main-screen{flex:1;display:none;flex-direction:column}
#main-screen.active{display:flex}
.topbar{
  position:sticky;top:0;z-index:100;display:flex;flex-wrap:wrap;align-items:center;gap:10px 12px;
  padding:12px max(16px,calc((100% - 1000px) / 2));
  background:color-mix(in srgb,var(--bg) 90%,transparent);
  backdrop-filter:blur(14px);box-shadow:0 14px 22px -22px rgba(0,0,0,.95);
}
.topbar h2{display:flex;align-items:baseline;gap:10px;font-family:var(--font-display);
  font-size:22px;font-weight:var(--w-display);letter-spacing:-.01em;white-space:nowrap}
.topbar h2 .wordmark-tag{font-family:var(--font-ui);font-size:11px;font-weight:var(--w-med);
  letter-spacing:.08em;text-transform:uppercase;color:var(--text3)}
.topbar .search-wrap{flex:1 1 200px;display:flex;justify-content:center;min-width:150px}
.search-input{
  width:min(280px,100%);min-height:38px;padding:8px 14px;font-size:13px;
  background:var(--surface);color:var(--text);border:0;border-radius:99px;
  transition:background .18s var(--ease),box-shadow .18s var(--ease);
}
.search-input::placeholder{color:var(--text3)}
.search-input:hover{background:var(--surface2)}
.search-input:focus-visible{outline:none;background:var(--surface2);box-shadow:0 0 0 1px var(--ring-inner),0 0 0 4px var(--ring-outer)}
.topbar-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-left:auto}
.topbar-actions button{
  position:relative;min-height:40px;padding:9px 14px;font-size:13px;font-weight:var(--w-med);color:var(--text2);
  background:var(--surface);border-radius:var(--r-sm);white-space:nowrap;
  transition:color .16s var(--ease),background .16s var(--ease),transform .12s var(--ease);
}
.topbar-actions button::after{content:"";position:absolute;left:0;right:0;top:50%;height:44px;transform:translateY(-50%)}
.topbar-actions button:hover{color:var(--text);background:var(--surface2)}
.topbar-actions button:active{transform:translateY(1px)}
.topbar-actions #btn-new{color:var(--accent-ink);background:var(--accent);font-weight:var(--w-semi)}
.topbar-actions #btn-new:hover{background:var(--accent-strong)}

/* ---------- list ---------- */
#note-list{flex:1;overflow-y:auto;width:100%;max-width:var(--col);margin:0 auto;padding:24px 20px 72px}
.note-item{
  padding:16px 18px 14px;margin-bottom:10px;background:var(--surface);border-radius:var(--r-md);
  cursor:pointer;transition:background .18s var(--ease),transform .16s var(--ease),box-shadow .18s var(--ease);
}
.note-item:hover{background:var(--surface2);transform:translateY(-1px);box-shadow:var(--shadow-sm)}
.note-item:active{transform:translateY(0)}
.note-item:focus-visible{outline:none;box-shadow:0 0 0 1px var(--ring-inner),0 0 0 4px var(--ring-outer)}
.note-item .note-title{font-size:15.5px;font-weight:var(--w-semi);letter-spacing:-.005em;
  margin-bottom:5px;word-break:break-word;text-wrap:pretty}
.note-item .note-time{font-family:var(--font-mono);font-size:12px;color:var(--text3);font-variant-numeric:tabular-nums}
.note-item .note-actions{display:flex;gap:8px;margin-top:12px}
.note-item .note-actions button{
  position:relative;min-height:34px;padding:7px 12px;font-size:12.5px;font-weight:var(--w-med);color:var(--text2);
  background:var(--surface2);border-radius:var(--r-xs);
  transition:color .14s var(--ease),background .14s var(--ease);
}
.note-item:hover .note-actions button{background:var(--surface3)}
.note-item .note-actions button::after{content:"";position:absolute;left:0;right:0;top:50%;height:44px;transform:translateY(-50%)}
.note-item .note-actions button:hover{color:var(--text)}
.note-item .note-actions .btn-edit:hover{color:var(--accent-strong)}
.note-item .note-actions .btn-delete:hover{color:var(--danger)}
.note-item.damaged{background:var(--surface2)}
.note-item.damaged .note-title{color:var(--text2);font-weight:var(--w-med)}
.load-more{display:flex;justify-content:center;padding:8px 0 0}
#btn-load-more{
  min-height:40px;padding:9px 20px;font-size:13px;font-weight:var(--w-med);color:var(--text2);
  background:var(--surface);border-radius:99px;
  transition:color .16s var(--ease),background .16s var(--ease);
}
#btn-load-more:hover{color:var(--text);background:var(--surface2)}

/* §16.5.8 骨架屏保持布局 */
#loading-state{display:none;width:100%;max-width:var(--col);margin:0 auto;padding:24px 20px}
#loading-state.show{display:block}
.sk{background:linear-gradient(90deg,var(--surface) 0%,var(--surface2) 42%,var(--surface) 84%);
  background-size:220% 100%;border-radius:var(--r-xs);animation:sk 1.3s linear infinite}
.sk-row{padding:16px 18px;margin-bottom:10px;background:var(--surface);border-radius:var(--r-md)}
.sk-title{height:14px;width:52%;margin-bottom:10px}
.sk-meta{height:11px;width:26%}
@keyframes sk{from{background-position:120% 0}to{background-position:-20% 0}}

/* §16.5.7 空态：原因 + 下一步 + 引导 */
#empty-state{display:none;width:100%;max-width:var(--col);margin:0 auto;padding:84px 24px;text-align:center;color:var(--text2)}
#empty-state svg{width:40px;height:40px;margin-bottom:18px;color:var(--text3);vertical-align:-.125em}
#empty-state .empty-title{font-size:19px;font-weight:var(--w-semi);color:var(--text);margin-bottom:6px;text-wrap:balance}
#empty-state .empty-hint{font-size:13px;max-width:34ch;margin:0 auto 20px;line-height:1.6;text-wrap:pretty}
#empty-state .btn{display:inline-flex;align-items:center;min-height:42px}

/* ---------- detail ---------- */
#detail-view{position:fixed;inset:0;z-index:500;display:none;flex-direction:column;background:var(--bg)}
#detail-view.active{display:flex}
.detail-topbar{display:flex;align-items:center;justify-content:space-between;gap:10px;
  padding:12px max(16px,calc((100% - var(--col)) / 2))}
.detail-topbar button{min-height:38px;padding:8px 14px;font-size:13px;font-weight:var(--w-med);
  color:var(--text2);border-radius:var(--r-sm);transition:color .16s var(--ease),background .16s var(--ease)}
.detail-topbar button:hover{color:var(--text);background:var(--surface)}
.detail-content{flex:1;overflow-y:auto;width:100%;max-width:var(--col);margin:0 auto;padding:30px 24px 88px}
.detail-content h3{font-size:26px;font-weight:var(--w-semi);letter-spacing:-.015em;line-height:1.3;
  margin-bottom:10px;word-break:break-word;text-wrap:balance}
.detail-content .detail-time{font-family:var(--font-mono);font-size:12px;color:var(--text3);
  font-variant-numeric:tabular-nums;margin-bottom:26px}
.detail-content .detail-body{white-space:pre-wrap;word-break:break-word;color:var(--text);
  font-size:16px;line-height:1.78;max-width:64ch;text-wrap:pretty}
.detail-body-empty{color:var(--text3);font-style:italic}

/* ---------- editor ---------- */
#editor-overlay{position:fixed;inset:0;z-index:600;display:none;align-items:center;justify-content:center;
  padding:20px;background:rgba(6,6,6,.62);backdrop-filter:blur(8px)}
#editor-overlay.active{display:flex}
.editor-box{width:min(680px,100%);max-height:88dvh;display:flex;flex-direction:column;
  background:var(--surface);border-radius:var(--r-lg);box-shadow:var(--shadow)}
.editor-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px}
.editor-header h3{font-size:17px;font-weight:var(--w-semi)}
.editor-header button{min-width:44px;min-height:44px;display:grid;place-items:center;font-size:17px;
  color:var(--text2);border-radius:var(--r-sm);transition:color .16s var(--ease),background .16s var(--ease)}
.editor-header button:hover{color:var(--text);background:var(--surface2)}
.editor-body{padding:8px 20px 20px;overflow-y:auto;flex:1}
.editor-body input{width:100%;padding:11px 14px;margin-bottom:12px;font-size:17px;font-weight:var(--w-semi);
  background:var(--surface2);color:var(--text);border:0;border-radius:var(--r-md);
  transition:background .18s var(--ease),box-shadow .18s var(--ease)}
.editor-body textarea{width:100%;min-height:300px;padding:13px 14px;font-size:15px;line-height:1.72;
  background:var(--surface2);color:var(--text);border:0;border-radius:var(--r-md);resize:vertical;
  transition:background .18s var(--ease),box-shadow .18s var(--ease)}
.editor-body input:focus-visible,.editor-body textarea:focus-visible{outline:none;background:var(--surface3);
  box-shadow:0 0 0 1px var(--ring-inner),0 0 0 4px var(--ring-outer)}
.editor-footer{display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:14px 20px}
.editor-footer button{min-height:42px;padding:10px 22px;font-size:13.5px;font-weight:var(--w-semi);
  border-radius:var(--r-sm);transition:background .16s var(--ease),color .16s var(--ease),transform .12s var(--ease)}
.editor-footer button:active{transform:translateY(1px)}
.btn-cancel{color:var(--text2);background:var(--surface2)}
.btn-cancel:hover{color:var(--text);background:var(--surface3)}
.btn-save{background:var(--accent);color:var(--accent-ink)}
.btn-save:hover{background:var(--accent-strong)}
.btn-save:disabled{opacity:.45;cursor:not-allowed;transform:none}

/* ---------- toast ---------- */
.status-toast{position:fixed;left:50%;bottom:26px;transform:translate(-50%,10px);z-index:2000;
  display:none;max-width:min(92vw,540px);padding:12px 20px;font-size:13.5px;font-weight:var(--w-med);
  background:var(--surface3);color:var(--text);border-radius:99px;box-shadow:var(--shadow);
  transition:opacity .2s var(--ease),transform .2s var(--ease)}
.status-toast.show{display:block;transform:translate(-50%,0)}
.status-toast.error{color:#f0cdcb}
.status-toast.success{color:#cfe3da}

/* ---------- dialogs & panels ---------- */
#trash-panel,#audit-panel,#audit-key-overlay{
  /* 必须高于 .screen(1000)：否则初始化/解锁整屏会把面板按钮盖住，点不动 */
  position:fixed;inset:0;z-index:1500;display:none;align-items:center;justify-content:center;padding:20px;
  background:rgba(6,6,6,.62);backdrop-filter:blur(8px);
}
#confirm-dialog.active,#trash-panel.active,#audit-panel.active{display:flex}
#audit-key-overlay{display:none}
#confirm-dialog{
  /* 高于面板(1500)与整屏(1000)：从回收站/审计面板里弹出的确认框必须可点 */
  position:fixed;inset:0;z-index:1600;display:none;align-items:center;justify-content:center;padding:20px;
}
#confirm-dialog.active{display:flex}
.confirm-box{width:min(408px,100%);padding:24px;background:var(--surface);
  border-radius:var(--r-lg);box-shadow:var(--shadow)}
.confirm-box p{margin-bottom:6px;font-size:14px;line-height:1.6;text-wrap:pretty}
.confirm-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}
.confirm-title{font-size:15px;font-weight:var(--w-semi);margin-bottom:4px;text-wrap:pretty}
.confirm-text{font-size:13.5px;color:var(--text2);margin-bottom:16px;line-height:1.6;text-wrap:pretty}

/* 统一按钮词表（JS 生成的标记也用这些类） */
.btn{min-height:40px;padding:9px 18px;font-size:13px;font-weight:var(--w-med);color:var(--text2);
  background:var(--surface2);border-radius:var(--r-sm);
  transition:color .16s var(--ease),background .16s var(--ease),transform .12s var(--ease)}
.btn:hover{color:var(--text);background:var(--surface3)}
.btn:active{transform:translateY(1px)}
.btn-primary{background:var(--accent);color:var(--accent-ink);font-weight:var(--w-semi)}
.btn-primary:hover{background:var(--accent-strong);color:var(--accent-ink)}
.btn-danger{color:#e7a5a2;background:var(--surface3)}
.btn-danger:hover{background:#2a1e1d;color:#f0b6b3}
.btn-accent{color:var(--accent-strong);background:var(--surface2)}
.btn-accent:hover{background:#232734;color:var(--accent-strong)}
.btn-sm{min-height:32px;padding:6px 12px;font-size:12.5px;border-radius:var(--r-xs)}
.seg{display:inline-flex;padding:3px;gap:3px;background:var(--surface2);border-radius:var(--r-sm)}
.seg button{padding:6px 14px;font-size:12.5px;font-weight:var(--w-med);border-radius:var(--r-xs);color:var(--text2);
  transition:color .16s var(--ease),background .16s var(--ease)}
.seg button:hover{color:var(--text)}
.seg button[aria-pressed=true]{background:var(--surface3);color:var(--text)}

.audit-box{width:min(740px,100%);max-height:86dvh;display:flex;flex-direction:column;
  background:var(--surface);border-radius:var(--r-lg);box-shadow:var(--shadow)}
.audit-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px}
.audit-header h3{font-size:17px;font-weight:var(--w-semi)}
.audit-header button{min-width:44px;min-height:44px;display:grid;place-items:center;font-size:17px;
  color:var(--text2);border-radius:var(--r-sm);transition:color .16s var(--ease),background .16s var(--ease)}
.audit-header button:hover{color:var(--text);background:var(--surface2)}
.audit-toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;min-width:0;padding:0 20px 14px}
.btn-audit-tab{min-height:34px;padding:6px 14px;font-size:12.5px;font-weight:var(--w-med);color:var(--text2);
  background:var(--surface2);border-radius:var(--r-xs);
  transition:color .16s var(--ease),background .16s var(--ease)}
.btn-audit-tab:hover{color:var(--text);background:var(--surface3)}
.btn-audit-tab[aria-pressed=true]{background:var(--accent);color:var(--accent-ink);font-weight:var(--w-semi)}
.audit-body{padding:0 20px 12px;overflow-y:auto;flex:1;max-height:56vh}
.audit-entry{display:flex;flex-wrap:wrap;align-items:baseline;gap:10px;padding:10px 0;font-size:12.5px;
  color:var(--text2);font-family:var(--font-mono)}
.audit-entry+.audit-entry{box-shadow:inset 0 1px 0 rgba(255,255,255,.03)}
.audit-entry .ts{color:var(--text3);font-variant-numeric:tabular-nums}
.audit-entry .ev{color:var(--accent-strong)}
.audit-empty{padding:48px 20px;text-align:center;color:var(--text3);font-size:13.5px}
.audit-actions{display:flex;align-items:center;gap:10px;justify-content:flex-end;padding:14px 20px}
.audit-actions button{min-height:38px;padding:8px 15px;font-size:12.5px;font-weight:var(--w-med);
  color:var(--text2);background:var(--surface2);border-radius:var(--r-sm);
  transition:color .16s var(--ease),background .16s var(--ease)}
.audit-actions button:hover{color:var(--text);background:var(--surface3)}
#audit-key-overlay>div{background:var(--surface);border-radius:var(--r-lg);box-shadow:var(--shadow)}
#audit-key-textarea{background:var(--surface2);border:0;border-radius:var(--r-md);color:var(--text2);
  font-family:var(--font-mono);font-size:12px;line-height:1.6;
  transition:background .18s var(--ease),box-shadow .18s var(--ease)}
#audit-key-textarea:focus-visible{outline:none;background:var(--surface3);
  box-shadow:0 0 0 1px var(--ring-inner),0 0 0 4px var(--ring-outer)}
.pk-input{width:100%;height:98px;padding:11px 13px;background:var(--surface2);color:var(--text2);
  border:0;border-radius:var(--r-md);font-family:var(--font-mono);font-size:12px;line-height:1.6;resize:none;
  transition:background .18s var(--ease),box-shadow .18s var(--ease)}
.pk-input:focus-visible{outline:none;background:var(--surface3);
  box-shadow:0 0 0 1px var(--ring-inner),0 0 0 4px var(--ring-outer)}
.muted-xs{font-size:11.5px;color:var(--text3)}
.muted-sm{font-size:12px;color:var(--text2)}
.kbd{display:inline-block;min-width:1.6em;padding:1px 5px;background:var(--surface2);
  border-radius:5px;font-family:var(--font-mono);font-size:11.5px;color:var(--text2);text-align:center}
.is-hidden{display:none}

.audit-hint{flex:1 1 240px;min-width:0;font-size:11.5px;color:var(--text3);line-height:1.75}
.audit-hint-title{display:block;font-size:12px;font-weight:var(--w-semi);color:var(--text2);margin-bottom:3px}
.audit-hint-note{display:block;margin-top:7px}
.hint-inline{font-family:var(--font-mono);font-size:11.5px;color:var(--text2)}
.hint-code{display:block;max-width:100%;white-space:pre;overflow-x:auto;margin:7px 0;padding:10px 12px;background:var(--surface2);
  border-radius:var(--r-xs);font-family:var(--font-mono);font-size:11.5px;line-height:1.8;color:var(--text2)}
.audit-form{display:flex;flex-direction:column;padding:2px 20px 16px;overflow-y:auto;flex:1}
.warn-line{font-size:12px;color:var(--warning);margin-bottom:10px;line-height:1.6}
.audit-msg{flex:1;text-align:right}
#key-mismatch{width:100%;max-width:var(--col);margin:14px auto 0;padding:14px 18px;background:var(--surface2);border-radius:var(--r-md)}
#key-mismatch .km-title{font-size:14px;font-weight:var(--w-semi);color:var(--warning);margin-bottom:6px;text-wrap:pretty}
#key-mismatch .km-body{font-size:13px;color:var(--text2);line-height:1.65;margin-bottom:10px;max-width:62ch;text-wrap:pretty}
#key-mismatch .km-cmd{display:block;padding:10px 12px;background:var(--bg);border-radius:var(--r-xs);font-family:var(--font-mono);font-size:11.5px;line-height:1.7;color:var(--text2);white-space:pre-wrap;overflow-wrap:anywhere}
.audit-chain{font-size:11.5px;color:var(--text2);padding:2px 0 10px;line-height:1.6}
.danger-xs{font-size:11.5px;color:var(--danger)}
.ok-xs{font-size:11.5px;color:var(--success)}
#audit-key-box{width:min(560px,100%)}
/* ---------- responsive ---------- */
@media (max-width:760px){
  body{font-size:15px}
  .topbar{padding:10px 14px;gap:8px}
  .topbar .search-wrap{order:3;flex-basis:100%}
  .search-input{width:100%;min-height:44px}
  .topbar-actions{width:100%;margin-left:0;gap:8px}
  .topbar-actions button{flex:1 1 auto;min-height:44px;padding:10px 8px;font-size:13px}
  #note-list,#loading-state{padding:18px 14px 80px}
  .detail-content{padding:24px 16px 88px}
  .detail-content h3{font-size:22px}
  .detail-content .detail-body{font-size:16px;line-height:1.75}
  .box{padding:30px 22px 24px}
  .box h1{font-size:28px}
  .box button{min-height:48px}
  .note-item .note-actions button{min-height:44px;padding:10px 14px}
  .editor-header button,.audit-header button{min-width:44px;min-height:44px}
  .audit-body{max-height:50vh}
  .hint-code{white-space:pre-wrap;overflow-wrap:normal}
  .confirm-actions{flex-direction:column-reverse}
  .confirm-actions .btn{width:100%;min-height:46px}
}
@media (max-width:420px){
  .topbar h2 .wordmark-tag{display:none}
}
@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{animation-duration:.001ms!important;transition-duration:.001ms!important}
}
</style>
</head>
<body>
<div id="app">
<div id="boot-screen" class="screen">
<div class="box boot-box">
<h1>S-Qrypt</h1>
<p id="boot-text">正在检查保险库状态…</p>
<div class="spinner" aria-hidden="true"></div>
</div>
</div>
<div id="lock-screen" class="screen hidden">
<div class="box">
<h1>S-Qrypt</h1>
<p>后量子安全加密笔记 · 请输入主密码</p>
<input type="password" id="login-password" placeholder="输入主密码" autocomplete="new-password" spellcheck="false">
<button id="login-btn">解锁</button>
<div class="error" id="login-error"></div>
<div id="lock-fail-badge" class="kdf-badge is-hidden"></div>
<div class="progress-bar is-hidden" id="login-progress"><div class="progress-bar-inner" id="login-progress-inner"></div></div>
<div class="progress-text" id="login-progress-text"></div>
</div>
</div>
<div id="init-screen" class="screen hidden">
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
<div class="progress-bar is-hidden" id="init-progress"><div class="progress-bar-inner" id="init-progress-inner"></div></div>
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
<input class="is-hidden" type="file" id="import-file" accept=".json,application/json">
<button id="btn-trash">回收站</button>
<button id="btn-audit">日志</button>
<button id="btn-lock">锁定</button>
</div>
</div>
<div id="key-mismatch" class="is-hidden">
<div class="km-title">有笔记用当前密码解不开</div>
<p class="km-body">若你是从旧版本迁移：这次初始化用的密码与旧程序不同，请<b>用旧程序的密码</b>重新初始化（初始化页勾选「旧版本保险箱」）。若密码确实已经更换、也没有备份，这些笔记无法恢复，只能重置数据库后重新开始。</p>
<code class="km-cmd">npx wrangler d1 execute s-qrypt-db --remote --command "DELETE FROM config WHERE id = 'app_config'"</code>
</div>
<div id="note-list"></div>
<div id="loading-state"><div class="sk-row"><div class="sk sk-title"></div><div class="sk sk-meta"></div></div><div class="sk-row"><div class="sk sk-title"></div><div class="sk sk-meta"></div></div><div class="sk-row"><div class="sk sk-title"></div><div class="sk sk-meta"></div></div></div>
<div id="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="12" cy="12" r="3.2"/><path d="M12 6.6v2.2M12 15.2v2.2M6.6 12h2.2M15.2 12h2.2"/></svg><div class="empty-title">保险箱是空的</div><div class="empty-hint">按 <kbd class="kbd">Ctrl</kbd> + <kbd class="kbd">N</kbd> 或点右上角「+ 新建」写下第一条加密笔记</div><button class="btn btn-primary" id="empty-new">写第一条笔记</button></div>
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
<span class="audit-hint">
<b class="audit-hint-title">离线解密方法</b>
下载 JSON → 取一条 <code class="hint-inline">encrypted</code> 值执行：
<code class="hint-code">echo "BASE64字符串" | openssl base64 -d | openssl pkeyutl -decrypt \
  -inkey private.pem \
  -pkeyopt rsa_padding_mode:oaep \
  -pkeyopt oaep_hash:sha256</code>
<span class="audit-hint-note">参数：<code class="hint-inline">base64 -d</code> 解码 → <code class="hint-inline">pkeyutl -decrypt</code> 私钥解密 → <code class="hint-inline">oaep</code> + <code class="hint-inline">sha256</code>，与浏览器 Web Crypto 一致</span>
</span>
<button id="audit-download" class="btn btn-primary btn-sm">下载日志</button>
</div>
<div class="audit-body" id="audit-body"><div class="audit-empty">暂无日志记录</div></div>
<div class="audit-actions">
<button id="audit-clear">清除本地日志</button>
<span id="audit-key-status" class="muted-xs audit-msg"></span>
<button id="audit-key-config" class="btn btn-sm">配置审计密钥</button>
</div>
</div>
</div>
<div id="audit-key-overlay" class="is-hidden">
<div class="audit-box" id="audit-key-box">
<div class="audit-header">
<h3>审计日志公钥配置</h3>
<button id="audit-key-close" aria-label="关闭">✕</button>
</div>
<div class="audit-form">
<p class="muted-sm">粘贴 RSA 公钥 PEM（2048/4096 位），用于加密审计日志。</p>
<p id="audit-key-warning" class="warn-line is-hidden"></p>
<textarea id="audit-key-textarea" placeholder="-----BEGIN PUBLIC KEY-----&#10;...&#10;-----END PUBLIC KEY-----"></textarea>
</div>
<div class="audit-actions">
<span id="audit-key-msg" class="muted-xs audit-msg"></span>
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
