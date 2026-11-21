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
<input type="password" id="init-setup-token" placeholder="部署时配置的 SETUP_TOKEN（初始化密钥）" autocomplete="new-password" spellcheck="false">
<label style="display:flex;gap:8px;align-items:flex-start;text-align:left;font-size:12px;color:var(--text2);margin-bottom:12px"><input type="checkbox" id="init-legacy" style="width:auto;margin:2px 0 0"><span>旧版本保险箱（v1/v2）：按无盐派生初始化，登录后会自动提示升级到 v3</span></label>
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
<button id="btn-backup">备份</button>
<button id="btn-import">导入</button>
<input type="file" id="import-file" accept=".json,application/json" style="display:none">
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
<button id="audit-download" style="background:var(--accent);color:#fff;border:none;padding:5px 14px;border-radius:6px;cursor:pointer;font-size:12px;display:none">下载日志</button>
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
<div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;width:560px;max-width:100%;max-height:90dvh;display:flex;flex-direction:column;box-shadow:0 16px 48px rgba(0,0,0,.4)">
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
<button id="audit-key-cancel" style="padding:8px 18px;border-radius:6px;cursor:pointer;font-size:13px;background:transparent;border:1px solid var(--border);color:var(--text2)">取消</button>
<button id="audit-key-save" style="padding:8px 18px;border-radius:6px;cursor:pointer;font-size:13px;background:var(--accent);border:none;color:#fff;font-weight:500">保存密钥</button>
</div>
</div>
</div>
<div class="status-toast" id="status-toast"></div>
<div id="security-badge">AES-256-GCM | 3-Key Heterogeneous | Zero-Trust</div>
</div>
<script src="/argon2.js"></script>
<script src="/app.js"></script>
</body>
</html>`;
