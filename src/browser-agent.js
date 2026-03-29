#!/usr/bin/env node
/**
 * browser-agent.js — Persistent DOMShell session daemon for AI agents
 *
 * Keeps ONE proxy connection alive. Exposes HTTP API on port 7788.
 * AI agent sends tasks, gets back structured page context + results.
 *
 * Usage:
 *   node bin/browser-agent.js          # Start daemon
 *
 * API:
 *   POST /page    { url, newTab? }      → navigate current tab (or new tab) + auto-snapshot
 *   POST /run     { commands: [...] }   → run DOMShell commands in session
 *   POST /type    { element, text }     → focus element + type text (works with React inputs)
 *   POST /fill    { fields: [{element, text}] } → fill multiple form fields
 *   GET  /state                         → current page title/url/buttons/inputs
 *   GET  /tabs                          → list all open tabs
 *   POST /tab     { id }                → switch to tab by ID
 *   POST /reset                         → new session
 *
 * Key rules (learned from debugging):
 *   - Use `navigate` not `open` to stay in current tab
 *   - Use `focus` + `type` for inputs — never JS value manipulation (React ignores it)
 *   - Use `js` not `eval` for DOM writes — eval is read-only
 */

const { spawn } = require('child_process');
const http = require('http');

const PROXY_SCRIPT = 'C:/Users/khadija/AppData/Local/npm-cache/_npx/4076b24f5f1440ed/node_modules/@apireno/domshell/bin/domshell-proxy.js';
const TOKEN = process.env.DOMSHELL_TOKEN || 'jobhunt123';
const PORT = process.env.DOMSHELL_MCP_PORT || '3001';
const AGENT_PORT = 7788;

// ── Session State ─────────────────────────────────────────────────────────────
let proc = null;
let msgId = 1;
let pending = new Map();
let initialized = false;
let sessionBuf = '';

function spawnProxy() {
  if (proc) { try { proc.kill(); } catch {} }
  proc = spawn('node', [PROXY_SCRIPT, '--port', PORT, '--token', TOKEN]);
  sessionBuf = '';
  initialized = false;
  msgId = 1;
  pending.clear();

  proc.stdout.on('data', data => {
    sessionBuf += data.toString();
    const lines = sessionBuf.split('\n');
    sessionBuf = lines.pop();
    for (const line of lines) {
      if (!line.trim().startsWith('{')) continue;
      try {
        const msg = JSON.parse(line.trim());
        if (msg.id && pending.has(msg.id)) {
          const { resolve } = pending.get(msg.id);
          pending.delete(msg.id);
          resolve(msg);
        }
      } catch {}
    }
  });

  proc.on('error', e => console.error('Proxy error:', e.message));
  proc.on('close', () => {
    console.log('Proxy closed, restarting...');
    setTimeout(spawnProxy, 1000);
  });
}

async function send(method, params, timeoutMs = 15000) {
  const id = msgId++;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Timeout: ${method}`));
    }, timeoutMs);

    pending.set(id, {
      resolve: (msg) => { clearTimeout(timer); resolve(msg); }
    });

    proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}

async function ensureInit() {
  if (initialized) return;
  await send('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'browser-agent', version: '1.0' }
  });
  initialized = true;
}

async function exec(command, timeoutMs = 8000) {
  await ensureInit();
  const result = await send('tools/call', {
    name: 'domshell_execute',
    arguments: { command }
  }, timeoutMs);
  return result?.result?.content?.[0]?.text || '';
}

async function runCommands(commands) {
  const results = [];
  for (const cmd of commands) {
    const isNav = cmd.startsWith('open ') || cmd.startsWith('navigate ');
    const timeout = isNav ? 6000 : 5000;
    try {
      const out = await exec(cmd, timeout);
      results.push({ cmd, out, ok: true });
    } catch (e) {
      results.push({ cmd, out: e.message, ok: false });
    }
    if (isNav) await new Promise(r => setTimeout(r, 1000));
  }
  return results;
}

// Auto-snapshot: navigate + get page context in one shot
// newTab=true uses `open` (new tab), default uses `navigate` (current tab — no tab accumulation)
async function navigateAndSnapshot(url, newTab = false) {
  const navCmd = newTab ? `open ${url}` : `navigate ${url}`;
  const nav = await exec(navCmd, 10000);
  await new Promise(r => setTimeout(r, 1500));
  await exec('cd %here%');

  const title = await exec('eval document.title');
  const currentUrl = await exec('eval document.URL');
  const buttons = await exec('find --type button');
  const inputs = await exec('find --type textbox');
  const links = await exec('find --type link -n 20 --meta');
  const structure = await exec('ls');

  return { nav, title, currentUrl, buttons, inputs, links, structure };
}

// Type text into a form field — the only reliable way with React inputs
async function typeInto(element, text) {
  await exec(`focus ${element}`);
  const out = await exec(`type ${text}`, 15000);
  return out;
}

// Fill multiple fields sequentially
async function fillForm(fields) {
  const results = [];
  for (const { element, text } of fields) {
    try {
      const out = await typeInto(element, text);
      results.push({ element, ok: true, out });
    } catch (e) {
      results.push({ element, ok: false, out: e.message });
    }
  }
  return results;
}

// ── Ghost Cursor ──────────────────────────────────────────────────────────────

const CURSOR_JS = `(function(){
  var e=document.getElementById('__ax_cursor');
  if(e)return;
  var s=document.createElement('style');
  s.textContent='#__ax_cursor{position:fixed;top:50%;left:50%;z-index:2147483647;pointer-events:none;transition:top .3s cubic-bezier(.34,1.56,.64,1),left .3s cubic-bezier(.34,1.56,.64,1);filter:drop-shadow(0 0 8px #818cf8);}#__ax_cursor.ck{animation:__axck .25s ease;}@keyframes __axck{0%{transform:scale(1)}40%{transform:scale(.7)}100%{transform:scale(1)}}';
  document.head.appendChild(s);
  var c=document.createElement('div');
  c.id='__ax_cursor';
  c.innerHTML='<svg width="22" height="26" viewBox="0 0 22 26"><path d="M0 0 L0 20 L5 15 L9 24 L12 23 L8 14 L14 14 Z" fill="#818cf8" stroke="#4338ca" stroke-width="1"/></svg>';
  document.body.appendChild(c);
})()`;

function CURSOR_MOVE_TO_JS(tokensJson) {
  return `(function(){
  try{
    var c=document.getElementById('__ax_cursor');if(!c)return;
    var tokens=${tokensJson};if(!tokens||!tokens.length)return;
    var els=Array.from(document.querySelectorAll('button,a,input,[role=button],[role=link]'));
    var best=null,bestScore=-1;
    for(var i=0;i<els.length;i++){
      var el=els[i];
      var label=(el.getAttribute('aria-label')||el.innerText||el.value||'').toLowerCase();
      var score=0;for(var j=0;j<tokens.length;j++)if(label.indexOf(tokens[j])>-1)score++;
      if(score>bestScore){bestScore=score;best=el;}
    }
    if(!best||bestScore<1)return;
    var r=best.getBoundingClientRect();if(!r.width&&!r.height)return;
    c.style.left=(r.left+r.width/2-4)+'px';c.style.top=(r.top+r.height/2-4)+'px';
    c.classList.remove('ck');void c.offsetWidth;c.classList.add('ck');
  }catch(e){}
})()`;
}

// Extract search tokens from DOMShell AX path for cursor positioning
// e.g. "main_123/inviter_mahmoud_sedjar_btn" → ["inviter", "mahmoud", "sedjar"]
function axPathToTokens(element) {
  if (!element) return null;
  const seg = element.split('/').pop() || element;
  const stripped = seg.replace(/_(btn|link|textbox|input|heading|img|list|listitem)$/, '');
  const parts = stripped.split('_').filter(t => t.length > 1 && !/^\d+$/.test(t));
  if (!parts.length) return null;
  return parts.slice(0, 3);
}

// Classify a command for visual treatment
function classifyCommand(cmd) {
  const t = cmd.trim();
  const clickM = t.match(/^click\s+(.+)$/);
  if (clickM) return { type: 'click', element: clickM[1].trim() };
  const focusM = t.match(/^focus\s+(.+)$/);
  if (focusM) return { type: 'focus', element: focusM[1].trim() };
  if (t.match(/^scroll\s+/)) return { type: 'scroll', element: null };
  if (t.match(/^(navigate|open)\s+/)) return { type: 'navigate', element: null };
  return { type: 'other', element: null };
}

const CURSOR_MOVE_PAUSE_MS = 350;

async function runCommandsVisual(commands) {
  const results = [];
  for (const cmd of commands) {
    const { type, element } = classifyCommand(cmd);
    const isNav = type === 'navigate';

    // Pre-action: move cursor to element before clicking/focusing
    if (type === 'click' || type === 'focus') {
      try {
        const tokens = axPathToTokens(element);
        if (tokens && tokens.length) {
          await exec(`js ${CURSOR_MOVE_TO_JS(JSON.stringify(tokens))}`, 3000);
          await new Promise(r => setTimeout(r, CURSOR_MOVE_PAUSE_MS));
        }
      } catch (_) {} // best-effort — cursor never blocks automation
    }

    // Execute real command
    try {
      const out = await exec(cmd, isNav ? 6000 : 5000);
      results.push({ cmd, out, ok: true });
    } catch (e) {
      results.push({ cmd, out: e.message, ok: false });
    }

    // Post-navigate: re-inject cursor into new page
    if (isNav) {
      await new Promise(r => setTimeout(r, 1000));
      try { await exec(`js ${CURSOR_JS}`, 3000); } catch (_) {}
    }
  }
  return results;
}

// ── LinkedIn automation (delegates to platform/linkedin.js) ──────────────────
const linkedin = require('../platform/linkedin');

// ── Generic external apply (delegates to platform/generic-apply.js) ───────────
const genericApply = require('../platform/generic-apply');

// ── CV Optimisation via Groq ──────────────────────────────────────────────────
// Reads GROQ_API_KEY from .env (same as platform/config.js)
const path = require('path');
const fs   = require('fs');
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

async function optimiseCv(jobTitle, company, jobDescription, masterCv) {
  const apiKey = process.env.GROQ_API_KEY || '';
  if (!apiKey) throw new Error('GROQ_API_KEY not set in .env');

  const system = `You are an expert CV writer. Given a job description and a candidate's master CV profile,
write a short tailored CV summary (3-4 sentences) and list the top 5 skills/experiences to highlight for this specific role.
Respond in JSON: { "summary": "...", "highlights": ["...", ...] }`;

  const user = `Job: ${jobTitle} at ${company}\n\nJob description:\n${jobDescription.substring(0, 2000)}\n\nCandidate profile:\n${masterCv || 'Cybersecurity engineer, Python, AWS, AI security, zero-trust, threat detection'}`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      response_format: { type: 'json_object' },
      max_tokens: 500,
    }),
  });
  if (!res.ok) throw new Error(`Groq API error: ${res.status}`);
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

function ok(step, message, data = {}, snapshot = undefined) {
  return { status: 'ok', step, message, data, snapshot };
}

function blocked(step, reason, instructions, snapshot = undefined, data = {}) {
  return {
    status: 'blocked',
    step,
    message: instructions,
    block: { reason, instructions },
    data,
    snapshot,
  };
}

function retryable(step, message, snapshot = undefined, data = {}) {
  return { status: 'retryable', step, message, data, snapshot };
}

function fatal(step, message, snapshot = undefined, data = {}) {
  return { status: 'fatal', step, message, data, snapshot };
}

async function getPageSnapshot() {
  await ensureInit();
  await exec('cd %here%');
  const url = await exec('eval document.URL');
  const buttons = await exec('find --type button');
  const inputs = await exec('find --type textbox');
  return { url, buttons, inputs };
}

async function checkSessionEnvelope() {
  const session = await linkedin.checkSession();
  const snapshot = await getPageSnapshot().catch(() => undefined);
  if (session.ok) {
    return ok('session-check', 'Browser session is ready', { session }, snapshot);
  }
  const reason = session.reason === 'checkpoint' ? 'captcha' : 'auth';
  return blocked(
    'session-check',
    reason,
    `LinkedIn session needs attention: ${session.reason}`,
    snapshot,
    { session },
  );
}

async function openProfileStep(url) {
  const session = await linkedin.checkSession();
  if (!session.ok) {
    return blocked('profile-open', session.reason === 'checkpoint' ? 'captcha' : 'auth', `LinkedIn session needs attention: ${session.reason}`);
  }

  await agentPost('/page', { url });
  await sleep(1600);
  const state = await linkedin.getProfileState();
  const snapshot = await getPageSnapshot().catch(() => undefined);
  if (state === 'connected') {
    return fatal('profile-open', 'Profile is already connected', snapshot, { relationshipState: state });
  }
  if (state === 'pending') {
    return fatal('profile-open', 'Connection request is already pending', snapshot, { relationshipState: state });
  }
  if (state === 'follow-only') {
    return fatal('profile-open', 'Profile only exposes Follow, not Connect', snapshot, { relationshipState: state });
  }
  return ok('profile-open', 'Profile opened', { relationshipState: state }, snapshot);
}

function matchButton(buttons, patterns) {
  for (const pattern of patterns) {
    const match = buttons.match(pattern);
    if (match) return match[1];
  }
  return null;
}

async function connectProfileStep(phase, message) {
  const snapshot = await getPageSnapshot().catch(() => undefined);
  const buttons = snapshot?.buttons || '';

  if (phase === 'start') {
    const directConnect = matchButton(buttons, [
      /\[x\]\s+(main_\d+\/toolbar_[^\s]*\/[^\s]*(?:inviter|connecter|connect)[^\s]+_btn)/i,
      /\[x\]\s+(main_\d+\/main_[^\s]*\/[^\s]*(?:inviter|connecter|connect)[^\s]+_btn)/i,
    ]);
    if (directConnect) {
      await runCommandsVisual([`click ${directConnect}`]);
      await sleep(900);
      return ok('connect-step', 'Connect action opened', { nextPhase: 'after-connect-click' }, await getPageSnapshot().catch(() => undefined));
    }

    const plusBtn = matchButton(buttons, [/\[x\]\s+((?:main_\d+\/)?toolbar_[^\s]*\/plus_btn)/i]);
    if (plusBtn) {
      await runCommandsVisual([`click ${plusBtn}`]);
      await sleep(700);
      return ok('connect-step', 'Opened More menu', { nextPhase: 'menu-connect' }, await getPageSnapshot().catch(() => undefined));
    }

    return retryable('connect-step', 'Could not find a Connect action on the profile', snapshot);
  }

  if (phase === 'menu-connect') {
    const menuSnapshot = await getPageSnapshot().catch(() => undefined);
    const connectOption = matchButton(menuSnapshot?.buttons || '', [
      /\[x\]\s+([^\s]*(?:inviter|connecter|se_connecter|connect)[^\s]+_btn)/i,
    ]);
    if (!connectOption) {
      return retryable('connect-step', 'Connect option not found in the More menu', menuSnapshot);
    }
    await runCommandsVisual([`click ${connectOption}`]);
    await sleep(900);
    return ok('connect-step', 'Selected Connect from menu', { nextPhase: 'after-connect-click' }, await getPageSnapshot().catch(() => undefined));
  }

  if (phase === 'after-connect-click') {
    const modalSnapshot = await getPageSnapshot().catch(() => undefined);
    const modalButtons = modalSnapshot?.buttons || '';
    const addNote = matchButton(modalButtons, [
      /\[x\]\s+(ajouter_une_note_btn)/i,
      /\[x\]\s+([^\s]*add_a_note[^\s]*_btn)/i,
    ]);
    if (addNote) {
      await runCommandsVisual([`click ${addNote}`]);
      await sleep(700);
      return ok('connect-step', 'Opened note editor', { nextPhase: 'write-note' }, await getPageSnapshot().catch(() => undefined));
    }
    if (!/ajouter_une_note|add_a_note/i.test(modalButtons)) {
      return ok('connect-step', 'Invitation sent without note modal', { completed: true }, modalSnapshot);
    }
    return retryable('connect-step', 'Waiting for the invitation modal to stabilize', modalSnapshot);
  }

  if (phase === 'write-note') {
    const textboxes = await exec('find --type textbox');
    const textboxMatch = textboxes.match(/\[x\]\s+([^\s]+)\s+\(textbox\)/i);
    if (!textboxMatch) {
      return blocked('connect-step', 'unknown_ui', 'Open the note field in LinkedIn, then resume.', await getPageSnapshot().catch(() => undefined));
    }
    await runCommandsVisual([`focus ${textboxMatch[1]}`, `type ${message || ''}`]);
    await sleep(500);
    return ok('connect-step', 'Connection note typed', { nextPhase: 'send-note' }, await getPageSnapshot().catch(() => undefined));
  }

  if (phase === 'send-note') {
    const sendSnapshot = await getPageSnapshot().catch(() => undefined);
    const sendBtn = matchButton(sendSnapshot?.buttons || '', [
      /\[x\]\s+(envoyer_une_invitation_btn)/i,
      /\[x\]\s+([^\s]*send_invitation[^\s]*_btn)/i,
      /\[x\]\s+([^\s]*envoyer[^\s]*_btn)/i,
    ]);
    if (!sendBtn) {
      return retryable('connect-step', 'Send invitation button not found', sendSnapshot);
    }
    await runCommandsVisual([`click ${sendBtn}`]);
    await sleep(900);
    return ok('connect-step', 'Invitation sent', { completed: true }, await getPageSnapshot().catch(() => undefined));
  }

  return fatal('connect-step', `Unknown connect phase: ${phase}`, snapshot);
}

async function openJobStep(url) {
  const session = await linkedin.checkSession();
  if (!session.ok) {
    return blocked('job-open', session.reason === 'checkpoint' ? 'captcha' : 'auth', `LinkedIn session needs attention: ${session.reason}`);
  }

  const card = await linkedin.openJobCard(url);
  if (!card) {
    return fatal('job-open', 'Job card not found');
  }

  const job = await linkedin.readJobPanel();
  return ok('job-open', 'Job opened', {
    job: {
      ...job,
      url,
      label: card.label,
      easyApply: job.easyApply,
    },
  }, await getPageSnapshot().catch(() => undefined));
}

async
