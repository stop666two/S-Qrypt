export const homeHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#6c6cff">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" href="/app-icon.svg" type="image/svg+xml">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<title>S-Qrypt v1.0.0 — 后量子安全加密笔记</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#08080e;--surface:#0f0f18;--surface2:#161622;--surface3:#1e1e30;--border:#252538;--border2:#32324a;--text:#e8e8f0;--text2:#8888aa;--text3:#555577;--accent:#6c6cff;--accent2:#5555dd;--accent-glow:rgba(108,108,255,0.15);--danger:#ff4466;--success:#44ddaa;--warning:#ffaa44;--radius:8px;--radius-sm:6px}
html,body{height:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,sans-serif;background:var(--bg);color:var(--text);font-size:14px;line-height:1.6;-webkit-font-smoothing:antialiased}
input,textarea,button,select{font-family:inherit;font-size:inherit}
::selection{background:var(--accent);color:#fff}
#app{min-height:100dvh;display:flex;flex-direction:column}
.screen{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;background:var(--bg)}
.screen.hidden{display:none}
.box{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:48px 40px 40px;width:420px;max-width:92vw;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.4)}
.box h1{font-size:23px;font-weight:600;margin-bottom:4px;letter-spacing:-.3px}
.box p{color:var(--text2);font-size:13px;margin-bottom:24px}
.box input{width:100%;padding:12px 14px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);outline:none;margin-bottom:12px;transition:border-color .2s,box-shadow .2s;caret-color:var(--accent)}
.box input:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-glow)}
.box button{width:100%;padding:12px;background:var(--accent);color:#fff;border:none;border-radius:var(--radius);font-weight:500;cursor:pointer;transition:opacity .2s,transform .15s;letter-spacing:.2px}
.box button:hover{opacity:.9;transform:translateY(-1px)}
.box button:active{transform:translateY(0)}
.box button:disabled{opacity:.35;cursor:not-allowed;transform:none}
.box .error{color:var(--danger);font-size:13px;margin-top:6px;min-height:20px}
.progress-bar{width:100%;height:3px;background:var(--border);border-radius:4px;margin:16px 0;overflow:hidden}
.progress-bar-inner{height:100%;background:linear-gradient(90deg,var(--accent2),var(--accent));width:0%;transition:width .4s cubic-bezier(.22,1,.36,1);border-radius:4px}
.progress-text{color:var(--text2);font-size:12px;margin-bottom:8px;font-family:SF Mono,ui-monospace,monospace}
.kdf-badge{display:inline-block;font-size:10px;padding:3px 10px;border-radius:4px;background:var(--surface3);color:var(--text3);margin-top:8px;font-family:monospace}
#main-screen{flex:1;display:none;flex-direction:column}
#main-screen.active{display:flex}
.topbar{display:flex;align-items:center;justify-content:space-between;padding:14px 24px;border-bottom:1px solid var(--border);flex-wrap:wrap;gap:8px;background:var(--surface)}
.topbar h2{font-size:16px;font-weight:600;letter-spacing:-.3px;background:linear-gradient(135deg,var(--text),var(--accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.topbar-actions{display:flex;gap:6px;align-items:center}
.search-input{background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:6px 12px;color:var(--text2);font-size:12px;outline:none;width:180px;transition:all .2s}
.search-input:focus{border-color:var(--accent);color:var(--text);width:240px}
.search-input::placeholder{color:var(--text3)}
.topbar-actions button{padding:7px 14px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius);color:var(--text2);cursor:pointer;font-size:12px;transition:all .2s;white-space:nowrap}
.topbar-actions button:hover{background:var(--surface3);color:var(--text);border-color:var(--border2)}
#note-list{flex:1;overflow-y:auto;padding:12px 24px}
.note-item{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px 18px;margin-bottom:8px;cursor:pointer;transition:all .2s cubic-bezier(.22,1,.36,1)}
.note-item:hover{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent-glow);transform:translateY(-1px)}
.note-item:active{transform:translateY(0)}
.note-item .note-title{font-weight:500;margin-bottom:3px;word-break:break-word;font-size:15px}
.note-item .note-time{font-size:11px;color:var(--text3);font-family:SF Mono,ui-monospace,monospace}
.note-item .note-actions{display:flex;gap:6px;margin-top:10px}
.note-item .note-actions button{padding:4px 10px;font-size:11px;background:transparent;border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text3);cursor:pointer;transition:all .15s;font-weight:500}
.note-item .note-actions button:hover{color:var(--text);border-color:var(--text2)}
.note-item .note-actions .btn-edit{border-color:var(--accent);color:var(--accent)}
.note-item .note-actions .btn-edit:hover{background:var(--accent);color:#fff}
.note-item .note-actions .btn-delete{border-color:var(--danger);color:var(--danger)}
.note-item .note-actions .btn-delete:hover{background:var(--danger);color:#fff}
.note-item.damaged{opacity:.35}
.note-item.damaged .note-title{color:var(--text3)}
#empty-state{text-align:center;padding:80px 20px;color:var(--text3);font-size:14px}
#loading-state{text-align:center;padding:40px 20px;color:var(--text3);font-size:13px;display:none}
#loading-state.show{display:block}
.spinner{display:inline-block;width:20px;height:20px;border:2px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin .6s linear infinite;margin-right:8px;vertical-align:middle}
@keyframes spin{to{transform:rotate(360deg)}}
#detail-view{position:fixed;inset:0;z-index:500;background:var(--bg);display:none;flex-direction:column}
#detail-view.active{display:flex}
.detail-topbar{display:flex;align-items:center;justify-content:space-between;padding:14px 24px;border-bottom:1px solid var(--border);background:var(--surface)}
.detail-topbar button{background:transparent;border:none;color:var(--text2);cursor:pointer;font-size:14px;padding:6px 10px;border-radius:var(--radius-sm);transition:all .15s}
.detail-topbar button:hover{color:var(--text);background:var(--surface2)}
.detail-content{flex:1;overflow-y:auto;padding:24px;max-width:720px;width:100%;margin:0 auto}
.detail-content h3{font-size:20px;font-weight:600;margin-bottom:4px;word-break:break-word;letter-spacing:-.3px}
.detail-content .detail-time{font-size:12px;color:var(--text3);margin-bottom:20px;font-family:monospace}
.detail-content .detail-body{white-space:pre-wrap;word-break:break-word;line-height:1.7;color:var(--text2);font-size:15px}
.detail-body-empty{color:var(--text3);font-style:italic}
#editor-overlay{position:fixed;inset:0;z-index:600;background:rgba(0,0,0,.75);display:none;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)}
#editor-overlay.active{display:flex}
.editor-box{background:var(--surface);border:1px solid var(--border);border-radius:16px;width:640px;max-width:100%;max-height:90dvh;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,.5)}
.editor-header{display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:1px solid var(--border)}
.editor-header h3{font-size:16px;font-weight:600}
.editor-header button{background:transparent;border:none;color:var(--text2);cursor:pointer;font-size:18px;padding:4px 8px;border-radius:var(--radius-sm);transition:all .15s}
.editor-header button:hover{color:var(--text);background:var(--surface2)}
.editor-body{padding:20px 24px;overflow-y:auto;flex:1}
.editor-body input{width:100%;padding:10px 14px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);outline:none;margin-bottom:16px;font-size:16px;transition:border-color .2s}
.editor-body input:focus{border-color:var(--accent)}
.editor-body textarea{width:100%;min-height:280px;padding:12px 14px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);outline:none;resize:vertical;line-height:1.7;font-size:14px;transition:border-color .2s}
.editor-body textarea:focus{border-color:var(--accent)}
.editor-footer{display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:14px 24px;border-top:1px solid var(--border)}
.editor-footer button{padding:9px 22px;border-radius:var(--radius);cursor:pointer;font-size:13px;font-weight:500;transition:all .15s}
.btn-cancel{background:transparent;border:1px solid var(--border);color:var(--text2)}
.btn-cancel:hover{color:var(--text);border-color:var(--text2)}
.btn-save{background:var(--accent);border:none;color:#fff}
.btn-save:hover{opacity:.9;transform:translateY(-1px)}
.btn-save:active{transform:translateY(0)}
.btn-save:disabled{opacity:.35;cursor:not-allowed;transform:none}
.status-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px 24px;font-size:13px;z-index:2000;display:none;white-space:nowrap;max-width:90vw;transition:opacity .25s,transform .25s;box-shadow:0 8px 32px rgba(0,0,0,.3)}
.status-toast.show{display:block}
.status-toast.error{border-color:var(--danger);color:var(--danger)}
.status-toast.success{border-color:var(--success);color:var(--success)}
#confirm-dialog{position:fixed;inset:0;z-index:900;background:rgba(0,0,0,.75);display:none;align-items:center;justify-content:center;backdrop-filter:blur(3px)}
#confirm-dialog.active{display:flex}
.confirm-box{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:24px;max-width:360px;width:90%;box-shadow:0 16px 48px rgba(0,0,0,.4)}
.confirm-box p{margin-bottom:16px;font-size:14px}
.confirm-actions{display:flex;justify-content:flex-end;gap:8px}
.confirm-actions button{padding:8px 18px;border-radius:var(--radius);cursor:pointer;font-size:13px;font-weight:500;transition:all .15s}
.btn-confirm-yes{background:var(--danger);border:none;color:#fff}
.btn-confirm-yes:hover{opacity:.9}
.btn-confirm-no{background:transparent;border:1px solid var(--border);color:var(--text2)}
.btn-confirm-no:hover{color:var(--text);border-color:var(--text2)}
#trash-panel{position:fixed;inset:0;z-index:700;background:rgba(0,0,0,.75);display:none;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(3px)}
#trash-panel.active{display:flex}
#trash-panel .btn-restore{background:var(--accent);color:#fff;border:none;padding:4px 12px;font-size:11px;border-radius:var(--radius-sm);cursor:pointer;margin-right:6px;transition:opacity .15s}
#trash-panel .btn-restore:hover{opacity:.85}
#trash-panel .btn-purge{background:var(--danger);color:#fff;border:none;padding:4px 12px;font-size:11px;border-radius:var(--radius-sm);cursor:pointer;transition:opacity .15s}
#trash-panel .btn-purge:hover{opacity:.85}
#audit-panel{position:fixed;inset:0;z-index:700;background:rgba(0,0,0,.75);display:none;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(3px)}
#audit-panel.active{display:flex}
.audit-box{background:var(--surface);border:1px solid var(--border);border-radius:14px;width:700px;max-width:100%;max-height:85dvh;display:flex;flex-direction:column;box-shadow:0 16px 48px rgba(0,0,0,.4)}
.audit-header{display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:1px solid var(--border)}
.audit-header h3{font-size:16px;font-weight:600}
.audit-header button{background:transparent;border:none;color:var(--text2);cursor:pointer;font-size:18px;padding:4px 8px;border-radius:var(--radius-sm);transition:all .15s}
.audit-header button:hover{color:var(--text);background:var(--surface2)}
.audit-body{padding:12px 24px;overflow-y:auto;flex:1;max-height:60vh}
.audit-entry{font-size:12px;padding:8px 0;border-bottom:1px solid var(--border);color:var(--text2);font-family:SF Mono,ui-monospace,monospace}
.audit-entry .ts{color:var(--text3)}
.audit-entry .ev{color:var(--accent)}
.audit-empty{text-align:center;padding:40px;color:var(--text3);font-size:13px}
.audit-actions{display:flex;gap:8px;justify-content:flex-end;padding:12px 24px;border-top:1px solid var(--border)}
.audit-actions button{padding:7px 16px;border-radius:var(--radius);cursor:pointer;font-size:12px;background:var(--surface2);border:1px solid var(--border);color:var(--text2);transition:all .15s}
.audit-actions button:hover{color:var(--text);border-color:var(--text2)}
#security-badge{position:fixed;bottom:8px;right:16px;font-size:10px;color:var(--text3);opacity:.3;z-index:100;pointer-events:none;font-family:monospace;letter-spacing:.5px}
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
<textarea id="init-public-key" placeholder='RSA 公钥 PEM（2048/4096 位，审计日志加密用）&#10;如何生成: openssl genpkey -algorithm RSA -out private.pem -pkeyopt rsa_keygen_bits:4096&#10;openssl pkey -in private.pem -pubout -out public.pem&#10;然后将 public.pem 内容粘贴到此处' style="width:100%;height:95px;padding:8px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);outline:none;font-size:11px;font-family:monospace;margin-bottom:12px;resize:none"></textarea>
<button id="init-btn">创建保险箱</button>
<div class="error" id="init-error"></div>
<div class="progress-bar" id="init-progress" style="display:none"><div class="progress-bar-inner" id="init-progress-inner"></div></div>
<div class="progress-text" id="init-progress-text"></div>
</div>
</div>
<div id="main-screen">
<div class="topbar">
<h2>S-Qrypt</h2>
<div style="flex:1;max-width:280px;margin:0 12px"><input type="text" id="search-input" class="search-input" placeholder="搜索笔记标题..."></div>
<div class="topbar-actions">
<button id="btn-new">+ 新建</button>
<button id="btn-trash">回收站</button>
<button id="btn-audit">日志</button>
<button id="btn-lock">锁定</button>
</div>
</div>
<div id="note-list"></div>
<div id="loading-state"><span class="spinner"></span>加载中...</div>
<div id="empty-state">暂无笔记 · 点击"+ 新建"创建第一条加密笔记</div>
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
<div style="padding:10px 24px;border-bottom:1px solid var(--border);display:flex;gap:8px;flex-wrap:wrap">
<button id="audit-local" class="btn-audit-tab" style="background:var(--accent);color:#fff;border:none;padding:5px 14px;border-radius:6px;cursor:pointer;font-size:12px">本地日志</button>
<button id="audit-remote" class="btn-audit-tab" style="background:var(--surface2);color:var(--text2);border:1px solid var(--border);padding:5px 14px;border-radius:6px;cursor:pointer;font-size:12px">远程日志</button>
<textarea id="audit-privkey" placeholder="RSA 私钥 PEM（解密远程日志）" style="flex:1;min-width:200px;padding:5px 10px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--text2);font-size:11px;font-family:monospace;outline:none;resize:none;height:28px"></textarea>
<button id="audit-fetch" style="background:var(--accent);color:#fff;border:none;padding:5px 14px;border-radius:6px;cursor:pointer;font-size:12px;display:none">获取</button>
</div>
<div class="audit-body" id="audit-body"><div class="audit-empty">暂无日志记录</div></div>
<div class="audit-actions"><button id="audit-clear">清除本地日志</button></div>
</div>
</div>
<div class="status-toast" id="status-toast"></div>
<div id="security-badge">AES-256-GCM | 3-Key Heterogeneous | Zero-Trust</div>
</div>
<script>
// Trusted Types policy — allows all innerHTML (all content is app-generated, no user input)
const ttPolicy=window.trustedTypes&&trustedTypes.createPolicy('sqrypt-policy',{createHTML:s=>s,createScriptURL:s=>s});
Object.defineProperty(Element.prototype,'html',{set(v){this.innerHTML=ttPolicy?ttPolicy.createHTML(v):v}})
function setHTML(el,html){if(el)el.html=ttPolicy?ttPolicy.createHTML(html):html}
// ===== S-Qrypt v1.0.0 Crypto Engine =====
// Primitives
const AC=new TextEncoder().encode('S-Qrypt-v2:PreMix'),SF=new TextEncoder().encode('S-Qrypt-Final');
function hex(b){return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('')}
function b64(b){let s='';for(let i=0;i<b.length;i++)s+=String.fromCharCode(b[i]);return btoa(s)}
function fb64(s){const b=atob(s),r=new Uint8Array(b.length);for(let i=0;i<b.length;i++)r[i]=b.charCodeAt(i);return r}
function cat(a,b){const r=new Uint8Array(a.length+(b?b.length:0));r.set(a);if(b)r.set(b,a.length);return r}
function htb(h){const r=new Uint8Array(h.length/2);for(let i=0;i<h.length;i+=2)r[i/2]=parseInt(h.substr(i,2),16);return r}
// SHA-256
const K256=new Uint32Array([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
function rr(x,n){return(x>>>n)|(x<<(32-n))}
function s256P(d){const ml=d.length*8,b=Math.ceil((d.length+9)/64),buf=new Uint8Array(b*64);buf.set(d);buf[d.length]=0x80;const dv=new DataView(buf.buffer);dv.setUint32(buf.length-8,ml>>>32,0);dv.setUint32(buf.length-4,ml&0xffffffff,0);return buf}
function s256C(h,p){const w=new Uint32Array(64);for(let bl=0;bl<p.length;bl+=64){const dp=new DataView(p.buffer,bl,64);for(let t=0;t<16;t++)w[t]=dp.getUint32(t*4,0);for(let t=16;t<64;t++){const s0=rr(w[t-15],7)^rr(w[t-15],18)^(w[t-15]>>>3),s1=rr(w[t-2],17)^rr(w[t-2],19)^(w[t-2]>>>10);w[t]=(w[t-16]+s0+w[t-7]+s1)|0}let a=h[0],b_=h[1],c=h[2],d=h[3],e=h[4],f=h[5],g=h[6],hh=h[7];for(let t=0;t<64;t++){const S1=rr(e,6)^rr(e,11)^rr(e,25),ch=(e&f)^((~e)&g),t1=(hh+S1+ch+K256[t]+w[t])|0,S0=rr(a,2)^rr(a,13)^rr(a,22),maj=(a&b_)^(a&c)^(b_&c),t2=(S0+maj)|0;hh=g;g=f;f=e;e=(d+t1)|0;d=c;c=b_;b_=a;a=(t1+t2)|0}h[0]=(h[0]+a)|0;h[1]=(h[1]+b_)|0;h[2]=(h[2]+c)|0;h[3]=(h[3]+d)|0;h[4]=(h[4]+e)|0;h[5]=(h[5]+f)|0;h[6]=(h[6]+g)|0;h[7]=(h[7]+hh)|0}return h}
function sha256(m){if(typeof m==='string')m=new TextEncoder().encode(m);const h=new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);const r=s256C(h,s256P(m));const o=new Uint8Array(32);const dv=new DataView(o.buffer);for(let i=0;i<8;i++)dv.setUint32(i*4,r[i],0);return o}
function sha224(m){if(typeof m==='string')m=new TextEncoder().encode(m);const h=new Uint32Array([0xc1059ed8,0x367cd507,0x3070dd17,0xf70e5939,0xffc00b31,0x68581511,0x64f98fa7,0xbefa4fa4]);const r=s256C(h,s256P(m));const o=new Uint8Array(28);const dv=new DataView(o.buffer);for(let i=0;i<7;i++)dv.setUint32(i*4,r[i],0);return o}
// BLAKE2b
const B2IV=[0x6a09e667f3bcc908n,0xbb67ae8584caa73bn,0x3c6ef372fe94f82bn,0xa54ff53a5f1d36f1n,0x510e527fade682d1n,0x9b05688c2b3e6c1fn,0x1f83d9abfb41bd6bn,0x5be0cd19137e2179n];
const B2S=[[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],[14,10,4,8,9,15,13,6,1,12,0,2,11,7,5,3],[11,8,12,0,5,2,15,13,10,14,3,6,7,1,9,4],[7,9,3,1,13,12,11,14,2,6,5,10,4,0,15,8],[9,0,5,7,2,4,10,15,14,1,11,12,6,8,3,13],[2,12,6,10,0,11,8,3,4,13,7,5,15,14,1,9],[12,5,1,15,14,13,4,10,0,7,6,3,9,2,8,11],[13,11,7,14,12,1,3,9,5,0,15,4,8,6,2,10],[6,15,14,9,11,3,0,8,12,2,13,7,1,4,10,5],[10,2,8,4,7,6,1,5,15,11,9,14,3,12,13,0]];
const B2M=0xFFFFFFFFFFFFFFFFn;
function r64(x,c){return((x<<c)|(x>>(64n-c)))&B2M}
function b2G(v,a,b,c,d,mx,my){v[a]=(v[a]+v[b]+mx)%0x10000000000000000n;v[d]=r64(v[d]^v[a],32n);v[c]=(v[c]+v[d])%0x10000000000000000n;v[b]=r64(v[b]^v[c],24n);v[a]=(v[a]+v[b]+my)%0x10000000000000000n;v[d]=r64(v[d]^v[a],16n);v[c]=(v[c]+v[d])%0x10000000000000000n;v[b]=r64(v[b]^v[c],63n)}
function b2C(h,m,t,f,oL){const v=new Array(16);for(let i=0;i<8;i++)v[i]=h[i];for(let i=0;i<8;i++)v[i+8]=B2IV[i];v[12]^=BigInt(oL);v[14]^=t;if(f)v[15]^=B2M;for(let r=0;r<12;r++){const s=B2S[r%10];b2G(v,0,4,8,12,m[s[0]],m[s[1]]);b2G(v,1,5,9,13,m[s[2]],m[s[3]]);b2G(v,2,6,10,14,m[s[4]],m[s[5]]);b2G(v,3,7,11,15,m[s[6]],m[s[7]]);b2G(v,0,5,10,15,m[s[8]],m[s[9]]);b2G(v,1,6,11,12,m[s[10]],m[s[11]]);b2G(v,2,7,8,13,m[s[12]],m[s[13]]);b2G(v,3,4,9,14,m[s[14]],m[s[15]])}for(let i=0;i<8;i++)h[i]=(h[i]^v[i]^v[i+8])&B2M}
function tW64(b){const w=new Array(16),dv=new DataView(b.buffer,b.byteOffset,b.byteLength);for(let i=0;i<16;i++){const hi=dv.getUint32(i*8,0),lo=dv.getUint32(i*8+4,0);w[i]=(BigInt(hi)<<32n)|BigInt(lo)}return w}
function blake2b(input,outLen){outLen=outLen||64;const data=typeof input==='string'?new TextEncoder().encode(input):input,bs=128,h=B2IV.slice();h[0]^=BigInt(outLen);const fb=Math.floor(data.length/bs),lb=data.length%bs,tl=BigInt(data.length);for(let i=0;i<fb;i++){const blk=data.slice(i*bs,(i+1)*bs),m=tW64(blk),last=(i===fb-1&&lb===0);b2C(h,m,tl,last,outLen)}if(lb>0||fb===0){const blk=new Uint8Array(bs);blk.set(data.slice(fb*bs));b2C(h,tW64(blk),tl,true,outLen)}const cw=Math.ceil(outLen/8),o=new Uint8Array(outLen),dv=new DataView(o.buffer);for(let i=0;i<cw;i++){const w=h[i]&B2M;dv.setUint32(i*8,Number((w>>32n)&0xffffffffn),0);dv.setUint32(i*8+4,Number(w&0xffffffffn),0)}return o}
// Web Crypto wrappers
async function hmac(k,d){const key=await crypto.subtle.importKey('raw',k,{name:'HMAC',hash:'SHA-512'},false,['sign']);return new Uint8Array(await crypto.subtle.sign('HMAC',key,d))}
async function sha512(m){if(typeof m==='string')m=new TextEncoder().encode(m);return new Uint8Array(await crypto.subtle.digest('SHA-512',m))}
async function hkdfE(prk,info,len){const ib=typeof info==='string'?new TextEncoder().encode(info):info;let r=new Uint8Array(0),t=new Uint8Array(0),c=1;while(r.length<len){const d=new Uint8Array(t.length+ib.length+1);d.set(t);d.set(ib,t.length);d[d.length-1]=c;t=await hmac(prk,d);const tmp=new Uint8Array(r.length+t.length);tmp.set(r);tmp.set(t,r.length);r=tmp;c++}return r.slice(0,len)}
// Sandbox iframe proxy
let cryptoFrame=null;let cryptoFrameId=0;const cryptoFramePending=new Map();let useSandbox=false;
async function initCF(){if(cryptoFrame)return;const frame=document.createElement('iframe');frame.src='/crypto-sandbox';frame.sandbox='allow-scripts';frame.style.display='none';document.body.appendChild(frame);await new Promise((r,j)=>{const t=setTimeout(()=>j(new Error('timeout')),10000);frame.onload=()=>{clearTimeout(t);cryptoFrame=frame;r()}});window.addEventListener('message',e=>{if(e.source!==frame.contentWindow)return;const m=e.data,p=cryptoFramePending.get(m.id);if(!p)return;cryptoFramePending.delete(m.id);if(m.error)p.reject(new Error(m.error));else p.resolve(m.result)})}
function frameCall(cmd,...args){return new Promise((r,j)=>{const id=++cryptoFrameId;const t=setTimeout(()=>{cryptoFramePending.delete(id);showT('沙箱响应超时，降级为纯软件模式','error');j(new Error('timeout'))},12000);cryptoFramePending.set(id,{resolve:v=>{clearTimeout(t);r(v)},reject:e=>{clearTimeout(t);j(e)}});cryptoFrame.contentWindow.postMessage({id,cmd,args},'*')})}
initCF().then(()=>{useSandbox=true}).catch(()=>{useSandbox=false});
// Adaptive params
function getAP(boost){const c=navigator.hardwareConcurrency||4,m=navigator.deviceMemory||8;let mb=32,ro=128;if(boost){mb=64;ro=200}else if(c>=8&&m>=8){mb=32;ro=128}else if(c>=4&&m>=4){mb=24;ro=80}else{mb=16;ro=60}return{MS:mb*1024*1024,RO:ro,mb,co:c}}
// Random delay
async function randD(minMs=150,maxMs=350){const c=navigator.hardwareConcurrency||4,sc=c>=8?1:c>=4?.7:.5,adjM=Math.round(minMs*sc),adjX=Math.round(maxMs*sc),ms=adjM+Math.floor(Math.random()*(adjX-adjM+1)),st=Date.now();try{const fk=await crypto.subtle.importKey('raw',new Uint8Array(32),{name:'AES-CBC'},false,['encrypt']),fi=new Uint8Array(16),fd=new Uint8Array(32),it=c>=8?50:c>=4?30:12;for(let i=0;i<it;i++)await crypto.subtle.encrypt({name:'AES-CBC',iv:fi},fk,fd)}catch(e){}const rem=ms-(Date.now()-st);if(rem>0)await new Promise(r=>setTimeout(r,rem))}


// Memory fill
async function fillMem(mem,seed){const key=await crypto.subtle.importKey('raw',seed.subarray(0,32),{name:'AES-CTR'},false,['encrypt']),cntr=new Uint8Array(16);cntr.set(seed.subarray(32,48));const CH=1048576;let bc=0;for(let off=0;off<mem.length;off+=CH){const len=Math.min(CH,mem.length-off),bt=Math.ceil(len/16),ctr=new Uint8Array(cntr);new DataView(ctr.buffer).setUint32(12,bc,0);const enc=await crypto.subtle.encrypt({name:'AES-CTR',counter:ctr,length:64},key,new Uint8Array(len));mem.set(new Uint8Array(enc),off);bc+=bt}}
// MK derivation (4 stages)
async function deriveMK(pw,onP,boost){await randD(80,150);const p=getAP(boost),mb=p.mb;onP&&onP(0,'阶段 1/4: 预混合...');let H=await hmac(AC,new TextEncoder().encode(pw));for(let i=1;i<=128;i++){H=await hmac(AC,H);if(i%16===0)onP&&onP(Math.round(i/128*15),'预混合 '+i+'/128')}onP&&onP(15,'阶段 2/4: 内存硬混淆 ('+mb+'MB, '+p.RO+' 轮)...');const{MS,RO}=p;let mem,as=MS;try{mem=new Uint8Array(MS)}catch(e){as=16*1024*1024;mem=new Uint8Array(as)}onP&&onP(20,'填充内存 ('+(as/1048576).toFixed(0)+'MB)...');await fillMem(mem,H);let st=await hmac(AC,mem.subarray(0,64));for(let r=0;r<RO;r++){const h1=await sha512(st),o1=new DataView(h1.buffer).getUint32(0,1)%as;const h2=await hmac(st,AC),o2=new DataView(h2.buffer).getUint32(0,1)%as;const h3=sha256(st),o3=new DataView(h3.buffer).getUint32(0,1)%as;const r_=new Uint8Array(64),s1=mem.subarray(o1,Math.min(o1+64,as));r_.set(s1);if(s1.length<64)r_.set(mem.subarray(0,64-s1.length),s1.length);const x=new Uint8Array(st);for(let j=0;j<64;j++)x[j]^=r_[j];const rcD=new Uint8Array(AC.length+4);rcD.set(AC);new DataView(rcD.buffer).setUint32(AC.length,r,1);const rc=await hmac(AC,rcD);st=await hmac(rc,x);const w2=o2%as,e2=Math.min(w2+32,as);mem.set(st.subarray(0,32),w2);if(e2<w2+32)mem.set(st.subarray(32,32+(w2+32-e2)),0);const w3=o3%as,e3=Math.min(w3+32,as);mem.set(st.subarray(32,64),w3);if(e3<w3+32)mem.set(st.subarray(64-(e3-w3),64),0);if(r%8===0||r===RO-1){onP&&onP(15+Math.round(r/RO*73),'内存混淆 '+(r+1)+'/'+RO);await new Promise(r=>setTimeout(r,0))}}onP&&onP(88,'Merkle 摘要...');const CH=256,cs=as/CH,le=[];for(let i=0;i<CH;i++)le.push(sha256(mem.subarray(i*cs,(i+1)*cs)));mem.fill(0);mem=null;let lv=le;while(lv.length>1){const n=[];for(let i=0;i<lv.length;i+=2){const a=lv[i],b=lv[i+1],c=new Uint8Array(a.length+(b?b.length:0));c.set(a);if(b)c.set(b,a.length);n.push(sha256(c))}lv=n}const ik=lv[0];let kdfV=1;let mixedKey=ik;onP&&onP(90,'阶段 3/4: Argon2id 混合...');if(useSandbox){try{const ar=await frameCall('argon2id',pw);if(ar&&ar.ok){const ik_argon=htb(ar.hash);mixedKey=await hmac(ik_argon,ik);kdfV=2}}catch(e){}}onP&&onP(93,'阶段 4/4: HKDF 淬炼 (v'+kdfV+')...');const sH=sha256(SF),PRK=await hmac(sH,mixedKey),MK=await hkdfE(PRK,'MK',256);onP&&onP(98,'抗侧信道填充...');await randD(60,100);onP&&onP(100,'完成');return{mk:MK,kdfV}}
// Three heterogeneous keys
async function deriveKA(mk,nid){const seed=cat(mk,cat(new TextEncoder().encode(String(nid)),new TextEncoder().encode('meta')));let st=seed;for(let i=1;i<=128;i++){const s512=await sha512(st),x=new Uint8Array(64);for(let j=0;j<64;j++)x[j]=s512[j];const rd=new Uint8Array(9);new DataView(rd.buffer).setUint32(0,i,0);new DataView(rd.buffer).setUint32(4,nid,0);rd[8]=0;st=await hmac(x,rd)}return await hkdfE(st,'KA',256)}
async function deriveKB(mk,nid){const tk=await hmac(mk,cat(new TextEncoder().encode(String(nid)),new TextEncoder().encode('body'))),ak=await crypto.subtle.importKey('raw',tk.subarray(0,32),{name:'AES-CBC'},false,['encrypt']),iv=new Uint8Array(16),tb=new Uint8Array(2048);let prev=new Uint8Array(16);for(let i=0;i<64;i++){const enc=await crypto.subtle.encrypt({name:'AES-CBC',iv},ak,prev),ct=new Uint8Array(enc);tb.set(ct,i*32);prev=ct.subarray(0,16)}const fd=new Uint8Array(256);for(let g=0;g<8;g++){const off=g*256;for(let j=0;j<256;j++)fd[j]^=tb[off+j]}return fd}
async function deriveKC(mk,nid){const lvs=[];for(let i=0;i<8;i++){const inp=cat(mk,cat(new TextEncoder().encode(String(nid)),new Uint8Array([i])));lvs.push(sha256(inp))}const nds=[];for(let i=0;i<4;i++){const c=cat(lvs[i*2],lvs[i*2+1]);nds.push(sha256(c))}const ri=cat(nds[0],cat(nds[1],cat(nds[2],nds[3]))),rt=await sha512(ri);return await hkdfE(rt,'KC',256)}
// AES-256-GCM
async function encGCM(k,p){const ak=await crypto.subtle.importKey('raw',k.subarray(0,32),{name:'AES-GCM'},false,['encrypt']),iv=crypto.getRandomValues(new Uint8Array(12)),enc=await crypto.subtle.encrypt({name:'AES-GCM',iv},ak,p),r=new Uint8Array(12+enc.byteLength);r.set(iv);r.set(new Uint8Array(enc),12);return b64(r)}
async function decGCM(k,p){const d=fb64(p);if(d.length<28)throw new Error('invalid_packet');const iv=d.subarray(0,12),ct=d.subarray(12),ak=await crypto.subtle.importKey('raw',k.subarray(0,32),{name:'AES-GCM'},false,['decrypt']);return new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv},ak,ct))}
async function deriveOp(mk){return await hkdfE(mk,'s-qrypt-op-auth',32)}
// Operation token hash MUST use native crypto.subtle to match server
async function opTokenHash(mk){const ot=await deriveOp(mk);const hexStr=hex(ot);const enc=new TextEncoder().encode(hexStr);const h=new Uint8Array(await crypto.subtle.digest('SHA-256',enc));return hex(h)}
// Device fingerprint + RSA audit encryption
let auditPublicKey = null;
function getDeviceFP() {
  const info = {
    ua: navigator.userAgent, lang: navigator.language, plat: navigator.platform,
    screen: screen.width+'x'+screen.height+'x'+screen.colorDepth,
    cores: navigator.hardwareConcurrency, mem: navigator.deviceMemory,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    touch: 'ontouchstart' in window, vendor: navigator.vendor || '',
    ref: document.referrer || '', ts: Date.now()
  };
  return info;
}
function fpHash(fp) { return hex(sha256(new TextEncoder().encode(JSON.stringify(fp)))).slice(0,16) }
async function importRsaPub(pem) {
  const b64 = pem.replace(/[^A-Za-z0-9+/=]/g, '');
  if (!b64) throw new Error('未找到有效的 Base64 数据');
  const raw = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return await crypto.subtle.importKey('spki', raw, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
}
async function rsaEncrypt(pubKey, data) {
  const enc = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, pubKey, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(enc)));
}
async function submitAuditLog(type, detail, pubKey) {
  const fp = getDeviceFP();
  const entry = JSON.stringify({ ts: new Date().toISOString(), type, detail, fp });
  try {
    if (pubKey) {
      const encrypted = await rsaEncrypt(pubKey, entry);
      const fph = fpHash(fp);
      await apiF('/api/audit/log', { method: 'POST', body: JSON.stringify({ encrypted_entry: encrypted, fingerprint_hash: fph }) });
    }
  } catch(e) { /* offline / no key — skip */ }
}

// Constant-time compare
function ctEq(a,b){if(typeof a!=='string'||typeof b!=='string')return a===b;if(a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0}
// Audit log
const auditLog=[];let auditPrevHash='';
async function addAE(type,detail){const chainStr=auditPrevHash+type+detail;let sig='unsigned';if(appState&&appState.mk){try{const ak=await hkdfE(appState.mk,'audit-sign-key',64),sb=await hmac(ak,new TextEncoder().encode(chainStr));sig=hex(sb).slice(0,16)}catch(e){}}const entry={ts:new Date().toISOString(),type,detail,sig,prev:auditPrevHash.slice(0,8)};auditLog.push(entry);const entryStr=entry.ts+entry.type+entry.detail+entry.sig;auditPrevHash=hex(sha256(new TextEncoder().encode(entryStr)));try{const stored=JSON.parse(sessionStorage.getItem('sq_audit')||'[]');stored.push(entry);if(stored.length>500)stored.splice(0,stored.length-500);sessionStorage.setItem('sq_audit',JSON.stringify(stored))}catch(e){}submitAuditLog(type,detail,auditPublicKey)}
// Anomaly detection
let failCount=0,lastDCCleanup=0;const FT=5,DBW=60000,DBL=10,decryptTS={};
function cleanupDTS(){const now=Date.now();if(now-lastDCCleanup<30000)return;lastDCCleanup=now;for(const k of Object.keys(decryptTS)){decryptTS[k]=decryptTS[k].filter(t=>now-t<DBW);if(decryptTS[k].length===0)delete decryptTS[k]}}
function checkDB(nid){cleanupDTS();const now=Date.now();if(!decryptTS[nid])decryptTS[nid]=[];const ts=decryptTS[nid].filter(t=>now-t<DBW);ts.push(now);decryptTS[nid]=ts;if(ts.length>DBL){addAE('decrypt_burst','Note '+nid+' decrypted '+ts.length+' times');return true}return false}
// Integrity
async function intSign(kc,data){const k=await crypto.subtle.importKey('raw',kc.subarray(0,32),{name:'HMAC',hash:'SHA-512'},false,['sign']),sig=await crypto.subtle.sign('HMAC',k,data);return hex(new Uint8Array(sig))}
// Key cache (bounded LRU, 200 max)
const KCM=200,KCO=[];
function tKC(id){const idx=KCO.indexOf(id);if(idx>=0)KCO.splice(idx,1);KCO.push(id);while(KCO.length>KCM){const ev=KCO.shift();delete appState._keyCache['k_'+ev]}}
async function getNK(nid){const ck='k_'+nid;if(appState._keyCache[ck]){tKC(nid);return appState._keyCache[ck]}const[KA,KB,KC]=await Promise.all([deriveKA(appState.mk,nid),deriveKB(appState.mk,nid),deriveKC(appState.mk,nid)]);appState._keyCache[ck]={KA,KB,KC};tKC(nid);return{KA,KB,KC}}
// State
let appState={mk:null,opToken:null,verificationToken:null,kdfVersion:1,notes:[],displayedCount:0,currentNoteId:null,lockTimer:null,editingId:null,_lockHandler:null,_keyCache:{}};
function clearMem(){if(appState.mk)appState.mk.fill(0);appState.mk=null;appState.opToken=null;appState.verificationToken=null;appState.notes=[];appState.displayedCount=0;appState.currentNoteId=null;appState.editingId=null;appState._keyCache={}}
// Auto-lock
const LT=60000,LEV=['mousemove','keydown','scroll','touchstart','click'];
function rstLT(){if(appState.lockTimer)clearTimeout(appState.lockTimer);appState.lockTimer=setTimeout(lockScr,LT)}
function startLT(){stopLT();if(!appState._lockHandler){appState._lockHandler=rstLT;for(const ev of LEV)document.addEventListener(ev,appState._lockHandler,{passive:true})}rstLT()}
function stopLT(){if(appState.lockTimer)clearTimeout(appState.lockTimer);appState.lockTimer=null;if(appState._lockHandler){for(const ev of LEV)document.removeEventListener(ev,appState._lockHandler);appState._lockHandler=null}}
function lockScr(){stopLT();addAE('lock','Session locked');clearMem();document.getElementById('main-screen').classList.remove('active');document.getElementById('detail-view').classList.remove('active');document.getElementById('editor-overlay').classList.remove('active');document.getElementById('lock-screen').classList.remove('hidden');document.getElementById('init-screen').classList.add('hidden');document.getElementById('login-password').value='';document.getElementById('login-error').textContent='会话超时，请重新输入密码';document.getElementById('login-password').focus()}
// API
async function apiF(path,opts){const h={'Content-Type':'application/json',...opts?.headers};if(opts?.auth&&appState.verificationToken)h['X-Verification-Token']=appState.verificationToken;const r=await fetch(path,{...opts,headers:h}),d=await r.json();if(!r.ok)throw new Error(d.error||'request_failed');return d}
// UI helpers
function showT(msg,type){const el=document.getElementById('status-toast');el.textContent=msg;el.className='status-toast show'+(type?' '+type:'');clearTimeout(el._toastTimer);const dur=type==='error'?8000:3000;el._toastTimer=setTimeout(()=>el.classList.remove('show'),dur)}
function showC(text){return new Promise(r=>{const dlg=document.getElementById('confirm-dialog');dlg.querySelector('.confirm-box').html='<p id="confirm-text">'+esc(text)+'</p><div class="confirm-actions"><button class="btn-confirm-yes" id="confirm-yes" style="padding:8px 20px;border-radius:var(--radius);cursor:pointer;font-size:13px;background:var(--danger);border:none;color:#fff">确认</button><button class="btn-confirm-no" id="confirm-no" style="padding:8px 20px;border-radius:var(--radius);cursor:pointer;font-size:13px;background:transparent;border:1px solid var(--border);color:var(--text2)">取消</button></div>';dlg.classList.add('active');document.getElementById('confirm-yes').onclick=()=>{dlg.classList.remove('active');r(true)};document.getElementById('confirm-no').onclick=()=>{dlg.classList.remove('active');r(false)}})}
function showC3(title,text,btns){return new Promise(r=>{const dlg=document.getElementById('confirm-dialog');dlg.querySelector('.confirm-box').html='<p style="font-weight:600;margin-bottom:4px">'+esc(title)+'</p><p style="margin-bottom:16px;font-size:13px;color:var(--text2)">'+esc(text)+'</p><div class="confirm-actions">'+btns.map((b,i)=>'<button class="confirm-btn-'+i+'" style="padding:8px 16px;border-radius:var(--radius);cursor:pointer;font-size:13px;border:1px solid var(--border);background:'+(b.class==='btn-danger'?'var(--danger)':'var(--surface2)')+';color:'+(b.class==='btn-danger'?'#fff':'var(--text)')+'">'+esc(b.label)+'</button>').join('')+'</div>';dlg.classList.add('active');btns.forEach((b,i)=>{dlg.querySelector('.confirm-btn-'+i).onclick=()=>{dlg.classList.remove('active');r(b.value)}})})}
function esc(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML}
function fmtTime(iso){if(!iso)return '';const d=new Date(iso);if(isNaN(d.getTime()))return '';const now=new Date(),diff=now-d;if(diff<86400000&&d.getDate()===now.getDate())return '今天 '+d.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});if(diff<172800000&&d.getDate()===now.getDate()-1)return '昨天 '+d.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});return d.toLocaleDateString('zh-CN')+' '+d.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}
// Render
let searchQuery='';
function renderL(){const c=document.getElementById('note-list'),e=document.getElementById('empty-state'),sq=searchQuery.toLowerCase();let f=appState.notes.filter(n=>!n.damaged);if(sq)f=f.filter(n=>n.title.toLowerCase().includes(sq));if(f.length===0){c.html='';e.style.display='block';return}e.style.display='none';const ts=f.slice(0,appState.displayedCount);let h='';for(const n of ts){const d=n.damaged?'damaged':'',t=n.damaged?'[数据损坏]':(n.title||'(无标题)');h+='<div class="note-item '+d+'" data-id="'+n.id+'"><div class="note-title">'+esc(t)+'</div><div class="note-time">'+fmtTime(n.created_at)+(n.updated_at!==n.created_at?' · 已编辑':'')+'</div>';if(!n.damaged)h+='<div class="note-actions"><button class="btn-edit" data-id="'+n.id+'" data-action="edit">编辑</button><button class="btn-delete" data-id="'+n.id+'" data-action="delete">删除</button></div>';h+='</div>'}if(appState.displayedCount<f.length&&!sq)h+='<div class="load-more"><button id="btn-load-more">加载更多 ('+(f.length-appState.displayedCount)+')</button></div>';c.html=h;c.querySelectorAll('.note-item').forEach(el=>{el.addEventListener('click',e=>{if(e.target.closest('.note-actions'))return;openN(parseInt(el.dataset.id))})});c.querySelectorAll('[data-action="edit"]').forEach(el=>{el.addEventListener('click',e=>{e.stopPropagation();editN(parseInt(el.dataset.id))})});c.querySelectorAll('[data-action="delete"]').forEach(el=>{el.addEventListener('click',e=>{e.stopPropagation();delN(parseInt(el.dataset.id))})});const lm=document.getElementById('btn-load-more');if(lm)lm.addEventListener('click',async()=>{const more=(await apiF('/api/notes?offset='+appState.displayedCount+'&limit=20',{auth:true})).notes.filter(r=>r.is_test!==1&&r.deleted!==1);const results=await Promise.allSettled(more.map(async row=>{try{const keys=await getNK(row.id),mb=await decGCM(keys.KA,row.encrypted_meta_packet),meta=JSON.parse(new TextDecoder().decode(mb));return{id:row.id,title:meta.title||'',created_at:row.created_at||meta.created_at||'',updated_at:row.updated_at||meta.updated_at||'',damaged:false}}catch(e){return{id:row.id,title:'',created_at:'',updated_at:'',damaged:true}}}));for(const r of results){if(r.status==='fulfilled')appState.notes.push(r.value);else appState.notes.push({id:0,title:'',created_at:'',updated_at:'',damaged:true})}appState.notes.sort((a,b)=>{if(a.damaged&&!b.damaged)return 1;if(!a.damaged&&b.damaged)return -1;if(!a.created_at)return 1;if(!b.created_at)return -1;return a.created_at<b.created_at?-1:a.created_at>b.created_at?1:0});appState.displayedCount=Math.min(appState.displayedCount+20,appState.notes.length);renderL()})}
// Note operations
async function openN(id){try{const data=await apiF('/api/note/'+id,{auth:true});if(checkDB(id)){showT('异常: 短时间内多次解密, 请稍后','error');return}const keys=await getNK(id),bb=await decGCM(keys.KB,data.encrypted_body),bt=new TextDecoder().decode(bb),sig=await intSign(keys.KC,bb);const note=appState.notes.find(n=>n.id===id);if(!note)return;document.getElementById('detail-title').textContent=note.title||'(无标题)';document.getElementById('detail-time').textContent='创建: '+fmtTime(note.created_at)+(note.updated_at!==note.created_at?' · 修改: '+fmtTime(note.updated_at):'');document.getElementById('detail-body').textContent=bt||'(空内容)';document.getElementById('detail-body').className='detail-body'+(bt?'':' detail-body-empty');document.getElementById('detail-view').classList.add('active');appState.currentNoteId=id;addAE('view','Note '+id+' [KC:'+sig.slice(0,8)+']')}catch(e){if(e.message&&(e.message.includes('decrypt')||e.message.includes('integrity')))addAE('integrity_fail','Note '+id+': '+(e.message||''));showT('解密失败: '+(e.message||''),'error')}}
let editorDirty=false;
function markEditorClean(){editorDirty=false}
function markEditorDirty(){editorDirty=true}
async function editN(id){try{const data=await apiF('/api/note/'+id,{auth:true}),keys=await getNK(id),mb=await decGCM(keys.KA,data.encrypted_meta_packet),meta=JSON.parse(new TextDecoder().decode(mb)),bb=await decGCM(keys.KB,data.encrypted_body),bt=new TextDecoder().decode(bb);appState.editingId=id;document.getElementById('editor-title').textContent='编辑笔记';document.getElementById('editor-note-title').value=meta.title||'';document.getElementById('editor-note-body').value=bt||'';document.getElementById('editor-overlay').classList.add('active');markEditorClean();document.getElementById('editor-note-title').oninput=markEditorDirty;document.getElementById('editor-note-body').oninput=markEditorDirty}catch(e){showT('加载失败: '+(e.message||''),'error')}}
async function closeEditor(){if(editorDirty){const sure=await showC('有未保存的更改，确定放弃？');if(!sure)return}document.getElementById('editor-overlay').classList.remove('active');editorDirty=false}
async function delN(id){const action=await showC3('删除笔记','确定要删除此笔记吗？',[{label:'软删除（可恢复）',value:'soft'},{label:'永久删除',value:'hard'},{label:'取消',value:'cancel'}]);if(action==='cancel'||!action)return;try{if(action==='soft'){await apiF('/api/note/'+id+'/soft-delete',{method:'PATCH',body:JSON.stringify({operation_token:hex(appState.opToken)})});appState.notes=appState.notes.filter(n=>n.id!==id);renderL();showT('笔记已移至回收站','success');addAE('soft_delete','Note '+id)}else{const sure=await showC('永久删除不可恢复！确认继续？');if(!sure)return;await apiF('/api/note/'+id,{method:'DELETE',body:JSON.stringify({operation_token:hex(appState.opToken)})});appState.notes=appState.notes.filter(n=>n.id!==id);renderL();showT('笔记已永久删除','success');addAE('hard_delete','Note '+id)}}catch(e){showT('删除失败: '+(e.message||''),'error')}}
async function saveN(){const title=document.getElementById('editor-note-title').value.trim(),body=document.getElementById('editor-note-body').value;if(!title){showT('请输入标题','error');return}const btn=document.getElementById('editor-save');btn.disabled=true;btn.textContent='保存中...';const eid=appState.editingId;try{const now=new Date().toISOString();if(eid){const keys=await getNK(eid),note=appState.notes.find(n=>n.id===eid),meta={title,created_at:note?note.created_at:now,updated_at:now},mp=await encGCM(keys.KA,new TextEncoder().encode(JSON.stringify(meta))),bp=await encGCM(keys.KB,new TextEncoder().encode(body));await apiF('/api/note/'+eid,{method:'PUT',body:JSON.stringify({operation_token:hex(appState.opToken),encrypted_meta_packet:mp,encrypted_body:bp})});addAE('update','Note '+eid)}else{const r=await apiF('/api/note',{method:'POST',body:JSON.stringify({operation_token:hex(appState.opToken)})}),nid=r.id,KA=await deriveKA(appState.mk,nid),KB=await deriveKB(appState.mk,nid),KC=await deriveKC(appState.mk,nid);appState._keyCache['k_'+nid]={KA,KB,KC};const meta={title,created_at:now,updated_at:now},mp=await encGCM(KA,new TextEncoder().encode(JSON.stringify(meta))),bp=await encGCM(KB,new TextEncoder().encode(body));await apiF('/api/note/'+nid,{method:'PUT',body:JSON.stringify({operation_token:hex(appState.opToken),encrypted_meta_packet:mp,encrypted_body:bp})});addAE('create','Note '+nid)}document.getElementById('editor-overlay').classList.remove('active');await refreshNL();showT('笔记已保存','success')}catch(e){showT('保存失败: '+(e.message||''),'error')}finally{btn.disabled=false;btn.textContent=eid?'保存':'创建'}}
// Refresh note list (parallel)
let notesTotal=0;
async function refreshNL(){const ls=document.getElementById('loading-state');try{ls&&ls.classList.add('show');const data=await apiF('/api/notes?offset=0&limit=50',{auth:true});notesTotal=data.total||0;const rows=data.notes.filter(r=>r.is_test!==1&&r.deleted!==1),results=await Promise.allSettled(rows.map(async row=>{const keys=await getNK(row.id),mb=await decGCM(keys.KA,row.encrypted_meta_packet),meta=JSON.parse(new TextDecoder().decode(mb));return{id:row.id,title:meta.title||'',created_at:row.created_at||meta.created_at||'',updated_at:row.updated_at||meta.updated_at||'',damaged:false}})),notes=[];for(const r of results){if(r.status==='fulfilled')notes.push(r.value);else notes.push({id:0,title:'',created_at:'',updated_at:'',damaged:true})}notes.sort((a,b)=>{if(a.damaged&&!b.damaged)return 1;if(!a.damaged&&b.damaged)return -1;if(!a.created_at)return 1;if(!b.created_at)return -1;return a.created_at<b.created_at?-1:a.created_at>b.created_at?1:0});appState.notes=notes;appState.displayedCount=Math.min(20,notes.length);renderL()}catch(e){showT('加载失败: '+(e.message||''),'error')}finally{ls&&ls.classList.remove('show')}}
// Login
async function handleLogin(){const pw=document.getElementById('login-password').value,err=document.getElementById('login-error'),btn=document.getElementById('login-btn'),prog=document.getElementById('login-progress'),pi=document.getElementById('login-progress-inner'),pt=document.getElementById('login-progress-text'),fb=document.getElementById('lock-fail-badge');err.textContent='';if(!pw){err.textContent='请输入密码';return}btn.disabled=true;btn.textContent='验证中...';try{prog.style.display='block';pt.textContent='获取验证信息...';let td;try{td=await apiF('/api/token')}catch(e){if(e.message==='not_initialized'){document.getElementById('lock-screen').classList.add('hidden');document.getElementById('init-screen').classList.remove('hidden');btn.disabled=false;btn.textContent='解锁';prog.style.display='none';document.getElementById('init-password').focus();return}throw e}const exp=td.verification_token,ph=hex(sha224(pw));if(!ctEq(ph,exp)){err.textContent='密码错误';failCount++;if(failCount>=FT){fb.textContent='⚠ 连续'+failCount+'次失败 · 安全锁定已加强';fb.style.display='inline-block'}addAE('login_fail','Attempt #'+failCount);btn.disabled=false;btn.textContent='解锁';prog.style.display='none';return}failCount=0;fb.style.display='none';appState.verificationToken=ph;pt.textContent='正在派生主密钥...';const r1=await deriveMK(pw,function(p,m){pi.style.width=p+'%';pt.textContent=m},failCount>=FT);appState.mk=r1.mk;appState.kdfVersion=r1.kdfV;pt.textContent='派生操作授权令牌...';appState.opToken=await deriveOp(r1.mk);pt.textContent='正在加载笔记...';await refreshNL();prog.style.display='none';document.getElementById('lock-screen').classList.add('hidden');document.getElementById('main-screen').classList.add('active');startLT();addAE('login','Successful')}catch(e){err.textContent='登录失败: '+(e.message||'');addAE('login_error',e.message||'');prog.style.display='none'}finally{btn.disabled=false;btn.textContent='解锁'}}
// Init
async function handleInit(){const pw=document.getElementById('init-password').value,pw2=document.getElementById('init-password-confirm').value,err=document.getElementById('init-error'),btn=document.getElementById('init-btn'),prog=document.getElementById('init-progress'),pi=document.getElementById('init-progress-inner'),pt=document.getElementById('init-progress-text');err.textContent='';if(!pw){err.textContent='请输入密码';return}if(pw.length<4){err.textContent='密码至少4个字符';return}if(pw!==pw2){err.textContent='两次密码输入不一致';return}btn.disabled=true;btn.textContent='创建中...';prog.style.display='block';pt.textContent='正在派生主密钥...';try{const r1=await deriveMK(pw,function(p,m){pi.style.width=p+'%';pt.textContent=m});const MK=r1.mk;const kv=r1.kdfV;pt.textContent='正在创建测试笔记...';const ph=hex(sha224(pw)),opT=await deriveOp(MK),opTH=await opTokenHash(MK);const pubPem=document.getElementById('init-public-key').value.trim();if(pubPem){try{auditPublicKey=await importRsaPub(pubPem)}catch(e){err.textContent='公钥格式错误: '+e.message;btn.disabled=false;btn.textContent='创建保险箱';return}}const pl=await apiF('/api/note',{method:'POST',body:JSON.stringify({operation_token:hex(opT)})}),tni=pl.id,tMeta={title:'__S-QRYPT_TEST__',created_at:new Date().toISOString(),updated_at:new Date().toISOString()},tBody='S-Qrypt v1.0.0 初始化验证',tKA=await deriveKA(MK,tni),tKB=await deriveKB(MK,tni),tKC=await deriveKC(MK,tni),tMP=await encGCM(tKA,new TextEncoder().encode(JSON.stringify(tMeta))),tBP=await encGCM(tKB,new TextEncoder().encode(tBody));await apiF('/api/note/'+tni,{method:'PUT',body:JSON.stringify({operation_token:hex(opT),encrypted_meta_packet:tMP,encrypted_body:tBP,is_test:1})});await apiF('/api/init',{method:'POST',body:JSON.stringify({verification_token:ph,operation_token_hash:opTH,kdf_version:kv})});appState.verificationToken=ph;const vd=await apiF('/api/note/'+tni,{auth:true}),vmb=await decGCM(tKA,vd.encrypted_meta_packet),vm=JSON.parse(new TextDecoder().decode(vmb)),vbb=await decGCM(tKB,vd.encrypted_body),vb=new TextDecoder().decode(vbb);if(vm.title!=='__S-QRYPT_TEST__'||vb!==tBody)throw new Error('自检验证失败');appState.mk=MK;appState.opToken=opT;appState._keyCache['k_'+tni]={KA:tKA,KB:tKB,KC:tKC};await refreshNL();prog.style.display='none';document.getElementById('init-screen').classList.add('hidden');document.getElementById('main-screen').classList.add('active');startLT();showT('保险箱已就绪','success');addAE('init','Vault initialized')}catch(e){err.textContent='初始化失败: '+(e.message||'');prog.style.display='none'}finally{btn.disabled=false;btn.textContent='创建保险箱'}}
// Audit
function renderAudit(){const body=document.getElementById('audit-body');body.html='<div class="audit-empty">暂无日志</div>'}
function showLocalAudit(){const body=document.getElementById('audit-body');if(auditLog.length===0){body.html='<div class="audit-empty">暂无日志</div>';return}let h='<div style="font-size:11px;color:var(--text2);padding:4px 0 8px;border-bottom:1px solid var(--border)">链: '+esc(auditPrevHash.slice(0,16))+'…</div>';const entries=[...auditLog].reverse();for(const e of entries){const sigTag=e.sig!=='unsigned'?' <span style="color:var(--success)">✓'+esc(e.sig.slice(0,6))+'</span>':'';h+='<div class="audit-entry"><span class="ts">['+e.ts.slice(11,19)+']</span> <span class="ev">'+esc(e.type)+'</span> '+esc(e.detail||'')+sigTag+'</div>'}body.html=h}
async function fetchRemoteAudit(){const btn=document.getElementById('audit-fetch');btn.disabled=true;btn.textContent='获取中...';try{const data=await apiF('/api/audit/logs?limit=50',{auth:true});const body=document.getElementById('audit-body');if(!data.entries||data.entries.length===0){body.html='<div class="audit-empty">暂无远程日志</div>';return}const privPem=document.getElementById('audit-privkey').value.trim();let h='<div style="font-size:11px;color:var(--text2);padding:4px 0 8px">共 '+data.total+' 条</div>';for(const e of data.entries){let decrypted='(加密)';if(privPem){try{const b64=e.encrypted_entry.replace(/\s/g,''),raw=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));const privKey=await crypto.subtle.importKey('pkcs8',raw,{name:'RSA-OAEP',hash:'SHA-256'},false,['decrypt']);const dec=await crypto.subtle.decrypt({name:'RSA-OAEP'},privKey,raw);decrypted=JSON.parse(new TextDecoder().decode(dec)).detail||'(已解密)'}catch(ex){decrypted='(解密失败)'}}h+='<div class="audit-entry"><span class="ts">['+(e.created_at||'').slice(11,19)+']</span> '+esc(decrypted)+'</div>'}body.html=h}catch(e){showT('获取远程日志失败','error')}finally{btn.disabled=false;btn.textContent='获取'}}
// Init check
// Trash / Recycle bin
async function loadTrash(){const data=await apiF('/api/notes',{auth:true}),rows=data.notes.filter(r=>r.is_test!==1&&r.deleted===1);if(rows.length===0){document.getElementById('trash-body').html='<div class="audit-empty">暂无已删除笔记</div>';return}let h='';for(const r of rows){let title='(未知)';try{const KA=await deriveKA(appState.mk,r.id),mb=await decGCM(KA,r.encrypted_meta_packet),meta=JSON.parse(new TextDecoder().decode(mb));title=meta.title||'(无标题)'}catch(e){title='(无法解密)'}h+='<div class="audit-entry">'+esc(title)+' <button class="btn-restore" data-id="'+r.id+'">恢复</button><button class="btn-purge" data-id="'+r.id+'">永久删除</button></div>'}document.getElementById('trash-body').html=h;document.querySelectorAll('#trash-body .btn-restore').forEach(el=>{el.addEventListener('click',async()=>{const id=parseInt(el.dataset.id);try{await apiF('/api/note/'+id+'/restore',{method:'PATCH',body:JSON.stringify({operation_token:hex(appState.opToken)})});showT('笔记已恢复','success');document.getElementById('trash-panel').classList.remove('active');await refreshNL()}catch(e){showT('恢复失败: '+(e.message||''),'error')}})});document.querySelectorAll('#trash-body .btn-purge').forEach(el=>{el.addEventListener('click',async()=>{const id=parseInt(el.dataset.id);const sure=await showC('永久删除不可恢复！确认？');if(!sure)return;try{await apiF('/api/note/'+id,{method:'DELETE',body:JSON.stringify({operation_token:hex(appState.opToken)})});showT('已永久删除','success');loadTrash();await refreshNL()}catch(e){showT('删除失败: '+(e.message||''),'error')}})})}

async function checkInit(){try{const data=await apiF('/api/init-check');if(data.db_bound===false){document.getElementById('lock-screen').classList.remove('hidden');document.getElementById('login-error').innerHTML='<span style="color:var(--warning)">⚠ D1 数据库未绑定</span><br><span style="font-size:12px">请在 Cloudflare Dashboard 中添加 D1 数据库绑定<br>或运行 <code>npm run setup</code> 自动配置</span>';document.getElementById('init-screen').classList.add('hidden');document.getElementById('login-btn').disabled=true;return}if(!data.initialized){document.getElementById('lock-screen').classList.add('hidden');document.getElementById('init-screen').classList.remove('hidden');document.getElementById('init-password').focus();return}appState.kdfVersion=data.kdf_version||1;const td=await apiF('/api/token');if(!td.verification_token){document.getElementById('lock-screen').classList.add('hidden');document.getElementById('init-screen').classList.remove('hidden');return}document.getElementById('init-screen').classList.add('hidden');document.getElementById('lock-screen').classList.remove('hidden');document.getElementById('login-password').focus()}catch(e){document.getElementById('lock-screen').classList.remove('hidden');document.getElementById('login-error').textContent='无法连接服务器'}}
// Events
document.addEventListener('DOMContentLoaded',()=>{checkInit();document.getElementById('login-btn').addEventListener('click',handleLogin);document.getElementById('login-password').addEventListener('keydown',e=>{if(e.key==='Enter')handleLogin()});document.getElementById('init-btn').addEventListener('click',handleInit);document.getElementById('init-password-confirm').addEventListener('keydown',e=>{if(e.key==='Enter')handleInit()});document.getElementById('btn-new').addEventListener('click',()=>{appState.editingId=null;document.getElementById('editor-title').textContent='新建笔记';document.getElementById('editor-note-title').value='';document.getElementById('editor-note-body').value='';document.getElementById('editor-overlay').classList.add('active');markEditorClean();document.getElementById('editor-note-title').oninput=markEditorDirty;document.getElementById('editor-note-body').oninput=markEditorDirty});document.getElementById('btn-lock').addEventListener('click',lockScr);let searchTimer;document.getElementById('search-input').addEventListener('input',function(){clearTimeout(searchTimer);searchTimer=setTimeout(()=>{searchQuery=this.value;appState.displayedCount=Math.min(20,appState.notes.length);renderL()},200)});document.getElementById('btn-trash').addEventListener('click',async()=>{await loadTrash();document.getElementById('trash-panel').classList.add('active')});document.getElementById('trash-close').addEventListener('click',()=>{document.getElementById('trash-panel').classList.remove('active')});document.getElementById('btn-audit').addEventListener('click',()=>{showLocalAudit();document.getElementById('audit-panel').classList.add('active')});document.getElementById('audit-close').addEventListener('click',()=>{document.getElementById('audit-panel').classList.remove('active')});document.getElementById('audit-clear').addEventListener('click',()=>{auditLog.length=0;showLocalAudit();showT('日志已清除','success')});document.getElementById('audit-local').addEventListener('click',()=>{showLocalAudit();document.getElementById('audit-fetch').style.display='none'});document.getElementById('audit-remote').addEventListener('click',()=>{document.getElementById('audit-body').html='<div class="audit-empty">点击"获取"加载远程日志</div>';document.getElementById('audit-fetch').style.display='inline-block'});document.getElementById('audit-fetch').addEventListener('click',fetchRemoteAudit);document.getElementById('detail-back').addEventListener('click',()=>{document.getElementById('detail-view').classList.remove('active');appState.currentNoteId=null});document.getElementById('detail-edit').addEventListener('click',()=>{if(appState.currentNoteId){document.getElementById('detail-view').classList.remove('active');editN(appState.currentNoteId)}});document.getElementById('editor-close').addEventListener('click',closeEditor);document.getElementById('editor-cancel').addEventListener('click',closeEditor);document.getElementById('editor-save').addEventListener('click',saveN);window.addEventListener('beforeunload',()=>{clearMem()});if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});});
</script>
</body>
</html>`;
