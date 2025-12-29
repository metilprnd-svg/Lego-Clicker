/* Advanced Lego Clicker game logic
     - Clickable lego brick with particles and SFX (WebAudio)
     - Dynamic shop items and upgrades
     - Auto clickers, multipliers, prestige, and localStorage save
     - Canvas particle system for polish
*/

const $ = id => document.getElementById(id);
const countEl = $('count');
const bigCountEl = $('bigCount');
const bigPerSecondEl = $('bigPerSecond');
const perClickEl = $('perClick');
const legoBtn = $('legoBtn');
const shopList = $('shopList');
const handContainer = $('handContainer');
// upgrades UI removed; keep upgrade logic but no DOM element
// legacy reset removed; now we have prestige
const prestigeBtn = $('prestigeBtn');
const canvas = $('fx');
const authOpenBtn = $('authOpenBtn');
const authModal = $('authModal');
const signupBtn = $('signupBtn');
const loginBtn = $('loginBtn');
const closeAuth = $('closeAuth');
const authUser = $('authUser');
const authPass = $('authPass');
const authMsg = $('authMsg');
const adminOpenBtn = $('adminOpenBtn');
const adminModal = $('adminModal');
const adminClose = $('adminClose');
const adminTarget = $('adminTarget');
const adminAmount = $('adminAmount');
const adminGift = $('adminGift');
const adminAddSelf = $('adminAddSelf');
const adminBan = $('adminBan');
const adminGround = $('adminGround');
const adminGroundMinutes = $('adminGroundMinutes');
const adminGrantTitle = $('adminGrantTitle');
const adminTitle = $('adminTitle');
const adminGrantGod = $('adminGrantGod');
const adminMsg = $('adminMsg');

let currentUser = null; // username string when logged in
let godMode = false; // runtime flag when a saved god-mode or special user is active

let ctx = canvas.getContext('2d');
let W, H;
const perSecondEl = $('perSecond');
const flashScreen = $('flashScreen');

function resize() {
    W = canvas.width = innerWidth;
    H = canvas.height = innerHeight;
}
addEventListener('resize', resize, {passive:true});
resize();

// Game state
let state = {
    legos: 0,
    perClick: 1,
    perSecond: 0,
    items: {},
    upgrades: {},
    totalClicks: 0,
    totalEarned: 0,
    prestigeCount: 0,
    lastTick: Date.now()
};

// Shop definition
const shopDefs = [
    { id: 'hand', name: 'Plastic Hand', baseCost: 10, cps: 0.1 },
    { id: 'studPack', name: 'Stud Pack', baseCost: 50, cps: 0.6 },
    { id: 'brickFarm', name: 'Brick Farm', baseCost: 150, cps: 2 },
    { id: 'assemblyBench', name: 'Assembly Bench', baseCost: 420, cps: 6 },
    { id: 'miniFactory', name: 'Mini Factory', baseCost: 900, cps: 14 },
    { id: 'factory', name: 'Brick Factory', baseCost: 2000, cps: 25 },
    { id: 'conveyor', name: 'Conveyor Line', baseCost: 5200, cps: 70 },
    { id: 'robot', name: 'Brick Robot', baseCost: 30000, cps: 450 },
    { id: 'automation', name: 'Automation Hub', baseCost: 90000, cps: 1600 },
    { id: '3dPrinter', name: '3D Printer', baseCost: 220000, cps: 4200 },
    { id: 'megaFactory', name: 'Mega Factory', baseCost: 780000, cps: 14000 },
    { id: 'researchLab', name: 'Research Lab', baseCost: 2500000, cps: 52000 },
    { id: 'logistics', name: 'Logistics Network', baseCost: 9_000_000, cps: 210000 },
    { id: 'warehouse', name: 'Automated Warehouse', baseCost: 28_000_000, cps: 760000 },
    { id: 'distributor', name: 'Global Distributor', baseCost: 95_000_000, cps: 2_400_000 },
    { id: 'franchise', name: 'Franchise Chain', baseCost: 320_000_000, cps: 8_200_000 },
    { id: 'tradeGuild', name: 'Trade Guild', baseCost: 1_100_000_000, cps: 28_000_000 },
    { id: 'legoEmpire', name: 'Lego Empire', baseCost: 3_800_000_000, cps: 96_000_000 },
    { id: 'galacticFactory', name: 'Galactic Factory', baseCost: 14_000_000_000, cps: 360_000_000 },
    { id: 'quantumAssembler', name: 'Quantum Assembler', baseCost: 60_000_000_000, cps: 1_200_000_000 },
    { id: 'timeMachine', name: 'Time Machine (WIP)', baseCost: 300_000_000_000, cps: 6_500_000_000 }
];

const upgradeDefs = [
    { id: 'betterStuds', name: 'Better Studs', cost: 500, effect: () => state.perClick *= 2, desc: 'Double per-click' },
    { id: 'magnet', name: 'Magnet', cost: 5000, effect: () => state.perSecond *= 1.5, desc: 'Increase CPS' }
];

// Gamepasses (purchasable in-game with real money via Checkout)
const passesDefs = [
    { id: 'double', name: '2x Legos / Click', priceUSD: 1.99, effect: () => state.perClick *= 2, desc: 'Double your per-click earnings permanently' },
    { id: 'autoBoost', name: 'CPS +50%', priceUSD: 0.99, effect: () => state.perSecond *= 1.5, desc: 'Boost CPS by 50% permanently' },
    { id: 'autoCollect', name: 'Auto-Collect Drops', priceUSD: 3.99, effect: () => { state.autoCollect = true; }, desc: 'Automatically collect spawned lego drops' },
    { id: 'goldenHands', name: 'Golden Hands', priceUSD: 4.99, effect: () => state.perClick *= 3, desc: 'Triple per-click earnings' },
    { id: 'builder', name: 'Instant Builder', priceUSD: 2.99, effect: () => state.perSecond += 10, desc: '+10 CPS instantly' }
];

// Pricing helper
function costFor(def, qty) {
    return Math.floor(def.baseCost * Math.pow(1.15, qty));
}

// Particle system
const particles = [];
function spawnParticles(x,y,color,amount=12){
    for(let i=0;i<amount;i++){
        particles.push({
            x, y,
            vx: (Math.random()-0.5)*6,
            vy: (Math.random()-1.5)*6,
            life: 60 + Math.random()*40,
            color
        });
    }
}

function drawParticles(){
    ctx.clearRect(0,0,W,H);
    for(let i=particles.length-1;i>=0;i--){
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life--;
        const alpha = Math.max(0, p.life/100);
        ctx.fillStyle = `rgba(${p.color},${alpha})`;
        ctx.beginPath();
        ctx.ellipse(p.x,p.y,4,4,0,0,Math.PI*2);
        ctx.fill();
        if(p.life<=0) particles.splice(i,1);
    }
}

// Crack / break sound using WebAudio (short noise burst)
function crackSound(){
    try{
        const dur = 0.14;
        const bufferSize = Math.floor(audioCtx.sampleRate * dur);
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for(let i=0;i<bufferSize;i++){
            // decaying noise
            data[i] = (Math.random()*2-1) * Math.pow(1 - i/bufferSize, 2);
        }
        const src = audioCtx.createBufferSource();
        src.buffer = buffer;
        const hp = audioCtx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value = 800;
        const gp = audioCtx.createGain(); gp.gain.value = 0.06;
        src.connect(hp); hp.connect(gp); gp.connect(audioCtx.destination);
        src.start();
    }catch(e){/* ignore if audio ctx blocked */}
}

// SFX via WebAudio
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
// Preload click audio file if available, else fallback to synthesized tone
let clickAudioBuffer = null;
fetch('click.mp3').then(r=>{
    if(!r.ok) throw new Error('no click file');
    return r.arrayBuffer();
}).then(ab=> audioCtx.decodeAudioData(ab)).then(buf=>{ clickAudioBuffer = buf; }).catch(()=>{ clickAudioBuffer = null; });

function clickSound(){
    if(clickAudioBuffer){
        try{
            const src = audioCtx.createBufferSource();
            src.buffer = clickAudioBuffer;
            const g = audioCtx.createGain(); g.gain.value = 0.7;
            src.connect(g); g.connect(audioCtx.destination);
            src.start();
            return;
        }catch(e){ /* fallthrough to oscillator fallback */ }
    }
    // oscillator fallback
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.value = 600 + Math.random()*200;
    g.gain.value = 0.05;
    o.connect(g); g.connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + 0.08);
}

// UI render
function renderShop(){
    shopList.innerHTML = '';
    shopDefs.forEach(def=>{
        const qty = state.items[def.id]||0;
        const cost = costFor(def, qty);
        const card = document.createElement('div');
        card.className = 'card shop-card';
        const icon = getItemIcon(def.id);
        card.innerHTML = `<div class="card-left"><div class="item-icon">${icon}</div><div><div class="card-title">${def.name}</div><div class="card-sub">+${def.cps}/s</div></div></div><div class="card-right"><div class="cost">${formatNumber(cost)}</div><button data-id="${def.id}">Buy</button></div>`;
        shopList.appendChild(card);
        const btn = card.querySelector('button');
        btn.addEventListener('click',()=>buyItem(def.id));
        // disable if unaffordable (god user can always buy)
        const unaffordable = (!isGodUser() && state.legos < cost);
        btn.disabled = unaffordable;
        card.setAttribute('role','button');
        card.tabIndex = 0;
        // visual affordance
        card.classList.toggle('disabled', unaffordable);
        // make whole card clickable (but ignore actual button clicks to avoid double-call)
        card.addEventListener('click', (ev)=>{
            if(ev.target && ev.target.tagName && ev.target.tagName.toLowerCase() === 'button') return;
            if(unaffordable) { flashCost(); return; }
            buyItem(def.id);
        });
        // keyboard support
        card.addEventListener('keydown', (ev)=>{
            if(ev.key === 'Enter' || ev.key === ' '){
                ev.preventDefault();
                if(unaffordable) { flashCost(); return; }
                buyItem(def.id);
            }
        });
    });
}

// returns small inline SVG pixel/lego-like icons per item id
function getItemIcon(id){
    if(id==='hand'){
        return `<svg width="40" height="28" viewBox="0 0 40 28" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="28" rx="4" fill="#fff" opacity="0.04"/><g fill="#fff"><rect x="4" y="6" width="6" height="6" rx="1"/><rect x="12" y="4" width="6" height="8" rx="1"/><rect x="20" y="6" width="6" height="6" rx="1"/><rect x="28" y="8" width="6" height="4" rx="1"/></g></svg>`;
    }
    if(id==='brickFarm'){
        return `<svg width="40" height="28" viewBox="0 0 40 28" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="28" rx="4" fill="#fff" opacity="0.04"/><g fill="#fff"><rect x="6" y="10" width="8" height="8" rx="1"/><rect x="18" y="8" width="8" height="10" rx="1"/><rect x="30" y="12" width="4" height="6" rx="1"/></g></svg>`;
    }
    if(id==='factory'){
        return `<svg width="40" height="28" viewBox="0 0 40 28" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="28" rx="4" fill="#fff" opacity="0.04"/><g fill="#fff"><rect x="6" y="6" width="6" height="14" rx="1"/><rect x="14" y="10" width="6" height="10" rx="1"/><rect x="22" y="4" width="12" height="16" rx="1"/></g></svg>`;
    }
    if(id==='robot'){
        return `<svg width="40" height="28" viewBox="0 0 40 28" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="28" rx="4" fill="#fff" opacity="0.04"/><g fill="#fff"><rect x="10" y="8" width="20" height="12" rx="2"/><circle cx="16" cy="14" r="1.6"/><circle cx="24" cy="14" r="1.6"/><rect x="6" y="12" width="4" height="4" rx="1"/><rect x="30" y="12" width="4" height="4" rx="1"/></g></svg>`;
    }
    return '';
}

function isGodUser(){
    return godMode || currentUser === 'M3l1t';
}

function renderUpgrades(){
    // UI removed — function kept for internal logic but no DOM rendering
    return;
    upgradeDefs.forEach(def=>{
        const bought = !!state.upgrades[def.id];
        const card = document.createElement('div');
        card.className = 'card upgrade';
        const icon = getItemIcon(def.id);
        card.innerHTML = `<div class="card-left"><div class="item-icon">${icon}</div><div><div class="card-title">${def.name}</div><div class="card-sub">${def.desc}</div></div></div><div class="card-right"><div class="cost">${formatNumber(def.cost)}</div><button data-id="${def.id}">${bought? 'Owned':'Buy'}</button></div>`;
        // rendering skipped
    });
}

function updateUI(){
    // show infinite symbol for god user
    if(isGodUser()){
        countEl.textContent = '∞';
        perClickEl.textContent = '∞';
        perSecondEl.textContent = '∞';
        // meter full
        const meter = $('lpsMeter'); if(meter) meter.querySelector('.meter-fill').style.width = '100%';
    } else {
        animateValue(countEl,'legos', state.legos);
        animateValue(perClickEl,'perClick', state.perClick);
        animateValue(perSecondEl,'perSecond', state.perSecond);
        // update big counter quickly (no heavy animation)
        if(bigCountEl) bigCountEl.textContent = formatNumber(state.legos);
        if(bigPerSecondEl) bigPerSecondEl.textContent = formatNumber(state.perSecond);
        // update meter proportional to perSecond (arbitrary scale)
        const meter = $('lpsMeter'); if(meter){
            const max = Math.max(1, 50); // tuneable
            const pct = Math.min(1, (state.perSecond||0)/max) * 100;
            meter.querySelector('.meter-fill').style.width = pct + '%';
        }
    }
    renderShop();
    renderHands();
}

// smooth number animation helper
const displayVals = {legos:0, perClick:0, perSecond:0};
function easeOutQuad(t){return t*(2-t)}
function animateValue(el, key, newVal){
    if(newVal === undefined || newVal === null) return;
    if(isNaN(newVal)) return;
    const start = displayVals[key] || 0;
    const target = newVal;
    const dur = 600;
    const s = performance.now();
    function step(now){
        const p = Math.min(1,(now - s)/dur);
        const v = start + (target - start) * easeOutQuad(p);
        displayVals[key] = v;
        if(key==='legos') el.textContent = Math.floor(v).toLocaleString(); else el.textContent = formatNumber(v);
        if(p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

// floating gain visuals
function showFloatingGain(amount, x, y){
    const el = document.createElement('div');
    el.className = 'floating-gain';
    el.style.left = (x || window.innerWidth/2) + 'px';
    el.style.top = (y || window.innerHeight/2) + 'px';
    el.style.opacity = '1';
    el.textContent = (amount>=1000? formatNumber(amount): '+'+Math.floor(amount));
    document.body.appendChild(el);
    requestAnimationFrame(()=>{ el.style.transform = 'translateY(-86px) scale(1.05)'; el.style.opacity='0'; });
    setTimeout(()=> el.remove(),900);
}

// confetti simple spawn for events
function spawnConfetti(){
    const wrap = $('confetti'); if(!wrap) return;
    for(let i=0;i<18;i++){
        const p = document.createElement('div'); p.className='piece';
        p.style.left = (20 + Math.random()*160) + 'px';
        p.style.background = ['#ffd36a','#ff7a7a','#7ad3ff','#b2ff9e'][Math.floor(Math.random()*4)];
        wrap.appendChild(p);
        // animate
        const dx = (Math.random()-0.5)*200;
        const dur = 1200 + Math.random()*800;
        p.animate([
            { transform: 'translateY(0) rotate(0)', opacity: 1 },
            { transform: `translate(${dx}px, 160px) rotate(${Math.random()*720}deg)`, opacity: 0 }
        ], { duration: dur, easing: 'cubic-bezier(.2,.9,.2,1)' });
        setTimeout(()=> p.remove(), dur+80);
    }
}

function formatNumber(n){
    if(!isFinite(n)) return '∞';
    if(n>=1e9) return (n/1e9).toFixed(2)+'b';
    if(n>=1e6) return (n/1e6).toFixed(2)+'m';
    if(n>=1e3) return (n/1e3).toFixed(2)+'k';
    return Math.floor(n);
}

// Purchase
function buyItem(id){
    const def = shopDefs.find(s=>s.id===id);
    const qty = state.items[id]||0;
    const cost = costFor(def, qty);
    const costInt = Math.floor(cost);
    if(state.legos>=costInt || isGodUser()){
        if(!isGodUser()) state.legos = Math.max(0, Math.floor(state.legos - costInt));
        state.items[id] = qty+1;
        recalcCPS();
        spawnParticles(randomX(), randomY(), '255,200,20', 10);
        updateUI();
        // visual: if buying a hand, animate/flash the hand area
        if(id === 'hand'){
            flashMessage('+Hand purchased');
        }
        if(currentUser) saveForUser();
    } else {
        flashCost();
    }
}

function renderHands(){
    if(!handContainer) return;
    handContainer.innerHTML = '';
    const count = state.items['hand'] || 0;
    if(count <= 0) return;
    const rect = legoBtn.getBoundingClientRect();
    const w = legoBtn.clientWidth;
    const h = legoBtn.clientHeight;
    const cx = w/2;
    const cy = h/2;
    const maxShow = Math.min(count, 8);
    const radius = Math.min(w,h)/2 + 12;
    for(let i=0;i<maxShow;i++){
        const angle = (i / maxShow) * Math.PI * 2 - Math.PI/2;
        const x = Math.round(cx + Math.cos(angle) * radius - 17);
        const y = Math.round(cy + Math.sin(angle) * radius - 17);
        const el = document.createElement('div');
        el.className = 'hand-icon';
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        el.textContent = '✋';
        if(i===0 && count>maxShow){
            const badge = document.createElement('div'); badge.className='count'; badge.textContent = count; el.appendChild(badge);
        }
        handContainer.appendChild(el);
    }
}

function buyUpgrade(id){
    const def = upgradeDefs.find(u=>u.id===id);
    if(state.upgrades[id]) return flashMessage('Already owned');
    if(state.legos>=def.cost){
        if(!isGodUser()) state.legos -= def.cost;
        state.upgrades[id] = true;
        def.effect();
        recalcCPS();
        updateUI();
        if(currentUser) saveForUser();
        flashMessage('Upgrade purchased');
    } else flashCost();
}

function recalcCPS(){
    let cps = 0;
    shopDefs.forEach(def=>{
        const qty = state.items[def.id]||0;
        cps += (def.cps||0) * qty;
    });
    state.perSecond = cps;
}

// Rebuild perClick base from prestige and reapply upgrades/passes effects
function rebuildEconomy(){
    // base perClick increases by 25% per prestige
    const base = 1 * (1 + (state.prestigeCount||0) * 0.25);
    state.perClick = base;
    // apply upgrades that affect perClick
    Object.keys(state.upgrades||{}).forEach(id=>{
        if(state.upgrades[id]){
            const ud = upgradeDefs.find(u=>u.id===id);
            if(ud && typeof ud.effect === 'function') ud.effect();
        }
    });
    // apply passes
    Object.keys(state.passes||{}).forEach(id=>{
        if(state.passes[id]){
            const pd = passesDefs.find(p=>p.id===id);
            if(pd && typeof pd.effect === 'function') pd.effect();
        }
    });
    recalcCPS();
    // if god user, enforce infinite economy
    if(isGodUser()){
        state.perClick = Infinity;
        state.perSecond = Infinity;
        state.legos = Infinity;
    }
}

// Click handler
function doClick(){
    state.legos += state.perClick;
    state.totalEarned = (state.totalEarned||0) + state.perClick;
    state.totalClicks++;
    spawnParticles(randomXCentered(), randomYCentered(), '255,80,50', 18);
    clickSound();
    animateBrick();
    updateUI();
}

legoBtn.addEventListener('click', (e)=>{ if(audioCtx.state==='suspended') audioCtx.resume(); doClick(); });
addEventListener('keydown', e=>{ if(e.code==='Space'){ e.preventDefault(); doClick(); } });

// pointer feedback for immediate press responsiveness
legoBtn.addEventListener('pointerdown', (e)=>{
    try{ if(audioCtx.state==='suspended') audioCtx.resume(); }catch(e){}
    legoBtn.classList.add('pressed');
});
legoBtn.addEventListener('pointerup', (e)=>{
    legoBtn.classList.remove('pressed');
});
legoBtn.addEventListener('pointerleave', ()=> legoBtn.classList.remove('pressed'));

// small click crack + flash effect (non-blocking)
let _clickCrackActive = false;
function clickCrackFlash(){
    if(_clickCrackActive) return; // avoid overlapping
    _clickCrackActive = true;
    try{ crackSound(); }catch(e){}
    legoBtn.classList.add('crack');
    // show short flash after small delay so crack is visible first
    setTimeout(()=>{
        flashScreen.classList.remove('hidden');
        flashScreen.style.opacity = '0.85';
        setTimeout(()=>{
            flashScreen.style.opacity = '0';
            setTimeout(()=> flashScreen.classList.add('hidden'), 180);
        }, 120);
    }, 90);
    setTimeout(()=>{ legoBtn.classList.remove('crack'); _clickCrackActive = false; }, 420);
}

function animateBrick(){
    // small pop + random flight movement
    const dx = (Math.random()-0.5) * 18;
    const dy = -8 + (Math.random()-0.5) * 10;
    const rot = (Math.random()-0.5) * 18;
    legoBtn.style.transition = 'transform 260ms cubic-bezier(.2,.9,.2,1)';
    legoBtn.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(1.04)`;
    // subtle shadow lift via class
    legoBtn.classList.add('pop');
    setTimeout(()=>{
        legoBtn.style.transform = '';
        legoBtn.classList.remove('pop');
    }, 280);
}

function randomX(){ return Math.random()*W; }
function randomY(){ return Math.random()*H; }
function randomXCentered(){ return W/2 + (Math.random()-0.5)*160; }
function randomYCentered(){ return H/2 + (Math.random()-0.5)*120; }

// Autos and ticks
function tick(){
    const now = Date.now();
    const dt = (now - state.lastTick)/1000;
    state.lastTick = now;
    if(isGodUser()){
        // keep infinite values and avoid numeric updates
        state.legos = Infinity;
        state.totalEarned = Infinity;
    } else {
        const gained = state.perSecond * dt;
        state.legos += gained;
        state.totalEarned = (state.totalEarned||0) + gained;
    }
    // update particles
    drawParticles();
    updateUI();
    requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

// Button handlers
// prestige handler
prestigeBtn && prestigeBtn.addEventListener('click', ()=>{
    const base = 1000000;
    const cost = Math.floor(base * Math.pow(5.67, state.prestigeCount || 0));
    if(isGodUser()){
        // god user can prestige freely
    } else if(state.legos < cost) return flashMessage(`Need ${formatNumber(cost)} legos to prestige`);
    // run cutscene then apply prestige
    prestigeCutscene().then(()=>{
        state.prestigeCount = (state.prestigeCount||0) + 1;
        // reset legos and items but KEEP permanent upgrades and passes
        if(!isGodUser()) state.legos = 0;
        state.items = {};
        // rebuild economy after upgrading prestige
        rebuildEconomy();
        updateUI();
        flashMessage('Prestiged! Prestige count: ' + state.prestigeCount);
        if(currentUser) saveForUser();
    });
});

// prestige cutscene: lift, crack, flash white, then return
function prestigeCutscene(){
    return new Promise((resolve)=>{
        // lift
        legoBtn.classList.add('lift');
        // small ascent duration
        setTimeout(()=>{
            // play crack sound and show crack overlay
            crackSound();
            legoBtn.classList.add('crack');
            // flash screen white
            flashScreen.classList.remove('hidden');
            flashScreen.style.opacity = '1';
            setTimeout(()=>{
                flashScreen.style.opacity = '0';
                setTimeout(()=>{
                    flashScreen.classList.add('hidden');
                    // cleanup
                    legoBtn.classList.remove('lift');
                    legoBtn.classList.remove('crack');
                    resolve();
                }, 300);
            }, 350);
        }, 700);
    });
}

// small helper: export only minimal save data (no functions)
function exportSave(){
    return {
        // do not store Infinity values; instead store a god flag
        legos: isGodUser() ? 0 : state.legos,
        god: isGodUser() ? true : false,
        items: state.items,
        upgrades: state.upgrades,
        totalClicks: state.totalClicks,
        totalEarned: state.totalEarned || 0,
        passes: state.passes || {},
        prestigeCount: state.prestigeCount || 0
    };
}

// Auth UI handlers (local mock)
authOpenBtn.addEventListener('click', ()=>{ authModal.classList.remove('hidden'); authMsg.textContent=''; });
closeAuth.addEventListener('click', ()=>{ authModal.classList.add('hidden'); });

signupBtn.addEventListener('click', ()=>{
    const u = authUser.value && authUser.value.trim();
    const p = authPass.value || '';
    if(!u) return authMsg.textContent = 'Enter username';
    if(!p) return authMsg.textContent = 'Enter password';
    const key = 'lego_user_'+u;
    if(localStorage.getItem(key)) return authMsg.textContent = 'User exists — try Login';
    godMode = false;
    const rec = { pw: btoa(p), saved: exportSave() };
    localStorage.setItem(key, JSON.stringify(rec));
    currentUser = u;
    authModal.classList.add('hidden');
    flashMessage('Signed up and logged in');
    // save immediately
    saveForUser();
});

loginBtn.addEventListener('click', ()=>{
    const u = authUser.value && authUser.value.trim();
    const p = authPass.value || '';
    if(!u) return authMsg.textContent = 'Enter username';
    const key = 'lego_user_'+u;
    const rec = localStorage.getItem(key);
    if(!rec) return authMsg.textContent = 'No such user';
    const parsed = JSON.parse(rec);
    if(parsed.pw !== btoa(p)) return authMsg.textContent = 'Wrong password';
    // check ban/ground status
    const savedRec = parsed.saved || {};
    if(savedRec.banned) return authMsg.textContent = 'This account is banned.';
    if(savedRec.groundedUntil && Date.now() < savedRec.groundedUntil) {
        const mins = Math.ceil((savedRec.groundedUntil - Date.now())/60000);
        return authMsg.textContent = `User grounded for ${mins} more minute(s)`;
    }
    // load user state
    godMode = false;
    currentUser = u;
    const saved = parsed.saved || {};
    state.legos = saved.legos || 0;
    state.items = saved.items || {};
    state.upgrades = saved.upgrades || {};
    state.totalClicks = saved.totalClicks || 0;
    state.totalEarned = saved.totalEarned || 0;
    state.passes = saved.passes || {};
    // restore prestige count then rebuild economy using prestige and owned upgrades/passes
    state.prestigeCount = saved.prestigeCount || 0;
    // if the user is the special god user, ensure god-mode
    if(currentUser === 'M3l1t'){
        // mark saved flag if present
        godMode = true;
        // set infinite economy
        state.legos = Infinity;
        state.prestigeCount = saved.prestigeCount || 0;
        state.perClick = Infinity;
        state.perSecond = Infinity;
    }
    // if saved explicitly flags god, restore infinite values
    if(saved.god) {
        godMode = true;
        state.legos = Infinity;
        state.perClick = Infinity;
        state.perSecond = Infinity;
    }
    rebuildEconomy();
    updateUI();
    authModal.classList.add('hidden');
    flashMessage('Logged in as '+u);
    // show admin button for admin user
    if(currentUser === 'M3l1t'){
        try{ adminOpenBtn.style.display = 'inline-block'; }catch(e){}
    } else {
        try{ adminOpenBtn.style.display = 'none'; }catch(e){}
    }
});

// per-user save
function saveForUser(){
    if(!currentUser) return flashMessage('No user logged in — use Sign Up / Login');
    const key = 'lego_user_'+currentUser;
    const existing = localStorage.getItem(key);
    const pw = existing ? JSON.parse(existing).pw : null;
    const rec = { pw, saved: exportSave() };
    localStorage.setItem(key, JSON.stringify(rec));
    flashMessage('Saved for '+currentUser);
    try{ renderLeaderboard(); }catch(e){}
}

// Helper to load/save arbitrary user records in localStorage
function getStoredUser(username){
    const key = 'lego_user_'+username;
    const raw = localStorage.getItem(key);
    if(!raw) return null;
    try{ return JSON.parse(raw); }catch(e){ return null; }
}
function setStoredUser(username, record){
    const key = 'lego_user_'+username;
    localStorage.setItem(key, JSON.stringify(record));
}

function gatherAllUsers(){
    const out = [];
    for(let i=0;i<localStorage.length;i++){
        const key = localStorage.key(i);
        if(!key || !key.startsWith('lego_user_')) continue;
        try{
            const parsed = JSON.parse(localStorage.getItem(key));
            const name = key.slice('lego_user_'.length);
            const saved = parsed && parsed.saved ? parsed.saved : {};
            out.push({ username: name, saved });
        }catch(e){ }
    }
    return out;
}

function renderLeaderboard(){
    const wrap = $('leaderboard'); if(!wrap) return;
    wrap.innerHTML = '';
    const users = gatherAllUsers();
    // compute metrics: all-time legos (totalEarned), clicks, spent (approx = totalEarned - current legos)
    const rows = users.map(u=>{
        const s = u.saved || {};
        const totalEarned = Number(s.totalEarned || 0);
        const clicks = Number(s.totalClicks || 0);
        const current = Number(s.legos || 0);
        const spent = Math.max(0, Math.floor(totalEarned - current));
        return { username: u.username, totalEarned, clicks, spent, title: s.title || '' };
    });
    // sort by totalEarned desc
    rows.sort((a,b)=> b.totalEarned - a.totalEarned);
    const top = rows.slice(0,100);
    top.forEach((r, idx)=>{
        const row = document.createElement('div'); row.className = 'lb-row';
        if(currentUser && currentUser === r.username) row.classList.add('self');
        const left = document.createElement('div'); left.className='lb-left';
        const rank = document.createElement('div'); rank.className = 'rank-badge';
        rank.textContent = (idx<3) ? (idx===0? '1': idx===1? '2':'3') : (idx+1);
        if(idx===0) rank.classList.add('rank-1'); else if(idx===1) rank.classList.add('rank-2'); else if(idx===2) rank.classList.add('rank-3');
        const name = document.createElement('div'); name.className = 'username'; name.textContent = r.username;
        if(r.title) {
            const t = document.createElement('span'); t.className='title'; t.textContent = ' — ' + r.title; name.appendChild(t);
        }
        left.appendChild(rank); left.appendChild(name);
        const stats = document.createElement('div'); stats.className='lb-stats';
        const a = document.createElement('div'); a.title='All-time legos'; a.textContent = formatNumber(r.totalEarned);
        const b = document.createElement('div'); b.title='Clicks'; b.textContent = formatNumber(r.clicks);
        const c = document.createElement('div'); c.title='Spent'; c.textContent = formatNumber(r.spent);
        stats.appendChild(a); stats.appendChild(b); stats.appendChild(c);
        row.appendChild(left); row.appendChild(stats);
        wrap.appendChild(row);
    });
}

// Admin actions (only visible to M3l1t)
adminOpenBtn && adminOpenBtn.addEventListener('click', ()=>{ adminModal.classList.remove('hidden'); adminMsg.textContent=''; });
adminClose && adminClose.addEventListener('click', ()=>{ adminModal.classList.add('hidden'); });

adminGift && adminGift.addEventListener('click', ()=>{
    const target = (adminTarget.value||'').trim();
    const amt = Math.floor(Number(adminAmount.value) || 0);
    if(!target) return adminMsg.textContent = 'Enter target username';
    if(!amt) return adminMsg.textContent = 'Enter amount to gift';
    const rec = getStoredUser(target);
    if(!rec) return adminMsg.textContent = 'No such user';
    rec.saved = rec.saved || {};
    rec.saved.legos = (rec.saved.legos||0) + amt;
    setStoredUser(target, rec);
    adminMsg.textContent = `Gave ${formatNumber(amt)} to ${target}`;
    try{ renderLeaderboard(); }catch(e){}
});

adminAddSelf && adminAddSelf.addEventListener('click', ()=>{
    if(currentUser !== 'M3l1t') return adminMsg.textContent = 'Not authorized';
    const amt = Math.floor(Number(adminAmount.value) || 0);
    if(!amt) return adminMsg.textContent = 'Enter amount to add';
    // update in-memory and saved
    if(!isGodUser()) state.legos = (state.legos||0) + amt;
    if(currentUser) saveForUser();
    updateUI();
    adminMsg.textContent = `Added ${formatNumber(amt)} to yourself`;
    try{ renderLeaderboard(); }catch(e){}
});

adminGrantGod && adminGrantGod.addEventListener('click', ()=>{
    if(currentUser !== 'M3l1t') return adminMsg.textContent = 'Not authorized';
    godMode = true;
    state.legos = Infinity; state.perClick = Infinity; state.perSecond = Infinity;
    if(currentUser) saveForUser();
    updateUI();
    adminMsg.textContent = 'God mode enabled for you';
    try{ renderLeaderboard(); }catch(e){}
});

adminBan && adminBan.addEventListener('click', ()=>{
    const target = (adminTarget.value||'').trim();
    if(!target) return adminMsg.textContent = 'Enter target username';
    const rec = getStoredUser(target);
    if(!rec) return adminMsg.textContent = 'No such user';
    rec.saved = rec.saved || {};
    rec.saved.banned = true;
    setStoredUser(target, rec);
    adminMsg.textContent = `${target} banned (permanent)`;
    try{ renderLeaderboard(); }catch(e){}
    // if they are currently logged in on this client, and it's not admin, log them out
    if(currentUser === target && currentUser !== 'M3l1t'){
        currentUser = null; flashMessage(`${target} banned and logged out`); updateUI();
    }
});

adminGround && adminGround.addEventListener('click', ()=>{
    const target = (adminTarget.value||'').trim();
    const mins = Math.floor(Number(adminGroundMinutes.value) || 0);
    if(!target) return adminMsg.textContent = 'Enter target username';
    if(!mins) return adminMsg.textContent = 'Enter minutes to ground';
    const rec = getStoredUser(target);
    if(!rec) return adminMsg.textContent = 'No such user';
    rec.saved = rec.saved || {};
    rec.saved.groundedUntil = Date.now() + mins*60000;
    setStoredUser(target, rec);
    adminMsg.textContent = `${target} grounded for ${mins} minute(s)`;
    try{ renderLeaderboard(); }catch(e){}
    if(currentUser === target && currentUser !== 'M3l1t'){
        currentUser = null; flashMessage(`${target} grounded and kicked`); updateUI();
    }
});

adminGrantTitle && adminGrantTitle.addEventListener('click', ()=>{
    const target = (adminTarget.value||'').trim();
    const title = (adminTitle.value||'').trim();
    if(!target) return adminMsg.textContent = 'Enter target username';
    if(!title) return adminMsg.textContent = 'Enter title';
    const rec = getStoredUser(target);
    if(!rec) return adminMsg.textContent = 'No such user';
    rec.saved = rec.saved || {};
    rec.saved.title = title;
    setStoredUser(target, rec);
    adminMsg.textContent = `Granted title to ${target}: ${title}`;
    try{ renderLeaderboard(); }catch(e){}
    if(currentUser === target){ flashMessage(`You were granted: ${title}`); }
});

// Simulated cash purchase flow for passes (placeholder for real payments)
function buyPassWithCash(passId){
    const pd = passesDefs.find(p=>p.id===passId);
    if(!pd) return;
    // If a Stripe backend is available, attempt to create a Checkout session
    if(window.fetch){
        // try server-side checkout
        fetch('/create-checkout-session', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ passId }) })
        .then(r=>r.json())
        .then(j=>{
            if(j.url){
                // remember which pass user attempted to buy so we can grant it after Checkout success
                try{ sessionStorage.setItem('pending_pass', passId); }catch(e){}
                window.location = j.url;
            }
            else {
                // fallback to simulated flow
                if(!confirm(`Purchase ${pd.name} for $${pd.priceUSD.toFixed(2)}?`)) return;
                state.passes = state.passes || {};
                state.passes[passId] = true;
                pd.effect();
                updateUI();
                flashMessage('Purchase successful — owned (simulated)');
                if(currentUser) saveForUser();
            }
        }).catch(()=>{
            if(!confirm(`Purchase ${pd.name} for $${pd.priceUSD.toFixed(2)}?`)) return;
            state.passes = state.passes || {};
            state.passes[passId] = true;
            pd.effect();
            updateUI();
            flashMessage('Purchase successful — owned (simulated)');
            if(currentUser) saveForUser();
        });
        return;
    }
    // fallback simulation if fetch not available
    if(!confirm(`Purchase ${pd.name} for $${pd.priceUSD.toFixed(2)}?`)) return;
    state.passes = state.passes || {};
    state.passes[passId] = true;
    pd.effect();
    updateUI();
    flashMessage('Purchase successful — owned (simulated)');
    saveForUser();
}

// Collectible bricks: spawn every 60s; clicking awards a portion of current CPS
const collectiblesEl = $('collectibles');
function spawnCollectible(){
    if(!collectiblesEl) return;
    const el = document.createElement('div');
    el.className = 'collectible';
    el.setAttribute('role','button');
    el.setAttribute('aria-label','Collectible brick');
    el.innerHTML = '<small>+</small>';
    // position roughly around center with some randomness
    const cx = window.innerWidth/2 + (Math.random()-0.5)*260;
    const cy = window.innerHeight/2 + (Math.random()-0.5)*150;
    el.style.left = Math.max(8, Math.min(window.innerWidth-64, cx - 28)) + 'px';
    el.style.top = Math.max(8, Math.min(window.innerHeight-48, cy - 14)) + 'px';
    collectiblesEl.appendChild(el);

    let collected = false;
    function collect(){
        if(collected) return;
        collected = true;
        // reward = 3 seconds worth of current CPS (perSecond)
        let reward = (state.perSecond || 0) * 3;
        if(isGodUser()) reward = 1e9;
        reward = Math.max(1, Math.floor(reward));
        if(!isGodUser()) state.legos += reward; else state.legos = Infinity;
        state.totalEarned = (state.totalEarned||0) + reward;
        spawnParticles(cx, cy, '80,220,120', 20);
        clickSound();
        el.classList.add('fade');
        setTimeout(()=>{ el.remove(); }, 320);
        updateUI();
        if(currentUser) saveForUser();
        flashMessage('Collected +' + formatNumber(reward) + ' legos');
    }

    el.addEventListener('click', collect);
    // if player owns auto-collect pass, collect automatically shortly after spawn
    try{
        if(state.passes && state.passes.autoCollect){
            setTimeout(()=>{ if(!collected) collect(); }, 600);
        }
    }catch(e){}
    // auto-remove after 18s if not collected
    setTimeout(()=>{ if(!collected){ el.classList.add('fade'); setTimeout(()=>el.remove(),300); } }, 18000);
}

// spawn every 60s
setInterval(spawnCollectible, 60000);

// Golden collectible (like Cookie Clicker's golden cookie)
function spawnGoldenCollectible(){
    const wrap = document.body;
    const el = document.createElement('div');
    el.className = 'golden-collectible';
    el.textContent = '★';
    // random position near center area
    const cx = window.innerWidth/2 + (Math.random()-0.5)*420;
    const cy = window.innerHeight/2 + (Math.random()-0.5)*260;
    el.style.left = Math.max(12, Math.min(window.innerWidth-92, cx)) + 'px';
    el.style.top = Math.max(12, Math.min(window.innerHeight-64, cy)) + 'px';
    wrap.appendChild(el);
    let clicked = false;
    function collect(){
        if(clicked) return; clicked = true;
        // big reward: 20s of CPS plus 30 clicks worth
        const reward = Math.max( Math.floor((state.perSecond||0) * 20 + (state.perClick||1) * 30), 50 );
        if(!isGodUser()) state.legos += reward; else state.legos = Infinity;
        state.totalEarned = (state.totalEarned||0) + reward;
        spawnConfetti(); spawnParticles(parseInt(el.style.left,10)+20, parseInt(el.style.top,10)+12, '255,220,80', 36);
        clickSound(); el.classList.add('fade'); setTimeout(()=>el.remove(),360);
        updateUI(); if(currentUser) saveForUser(); flashMessage('Golden +'+formatNumber(reward));
    }
    el.addEventListener('click', collect);
    // auto-remove after 8s
    setTimeout(()=>{ if(!clicked){ el.classList.add('fade'); setTimeout(()=>el.remove(),300); } }, 8000);
}

// spawn golden occasionally (random between 45s-90s)
function scheduleGolden(){
    const t = 45000 + Math.random()*45000;
    setTimeout(()=>{ spawnGoldenCollectible(); scheduleGolden(); }, t);
}
scheduleGolden();

// auto-save every 12s if logged in
setInterval(()=>{ if(currentUser) saveForUser(); }, 12000);

function flashMessage(text){
    const el = document.createElement('div');
    el.className = 'toast'; el.textContent = text; document.body.appendChild(el);
    setTimeout(()=> el.classList.add('show'),20);
    setTimeout(()=> el.classList.remove('show'),1400);
    setTimeout(()=> el.remove(),1800);
}

function flashCost(){
    const el = document.createElement('div'); el.className='toast warn'; el.textContent='Not enough legos'; document.body.appendChild(el);
    setTimeout(()=> el.classList.add('show'),20);
    setTimeout(()=> el.classList.remove('show'),1300);
    setTimeout(()=> el.remove(),1600);
}

// Helpers
function init(){
    // default values
    state.perClick = 1;
    state.items = state.items || {};
    state.upgrades = state.upgrades || {};
    recalcCPS();
    updateUI();
    // If returning from a Checkout success, grant pending pass (scaffold/demo flow)
    try{
        const params = new URLSearchParams(location.search);
        if(params.get('success')){
            const pending = sessionStorage.getItem('pending_pass');
            if(pending){
                const pd = passesDefs.find(p=>p.id===pending);
                if(pd){
                    state.passes = state.passes || {};
                    state.passes[pending] = true;
                    pd.effect();
                    flashMessage('Purchase confirmed: ' + pd.name);
                    if(currentUser) saveForUser();
                    updateUI();
                }
                sessionStorage.removeItem('pending_pass');
            }
        }
    }catch(e){}
    // spawn ambient pieces
    setInterval(()=> spawnParticles(Math.random()*W, -10, '255,220,100', 6), 350);
    // small looping particle rendering
    setInterval(()=>{ if(particles.length<200) spawnParticles(Math.random()*W, -10, '255,220,100', 4); }, 800);
    // render leaderboard initially
    try{ renderLeaderboard(); }catch(e){}
}

// Start
init();

// Bottom nav behavior and modals
const navBtns = document.querySelectorAll('.nav-btn');
const statsModal = $('statsModal');
const statsContent = $('statsContent');
const closeStats = $('closeStats');
const passesModal = $('passesModal');
const passesList = $('passesList');
const closePasses = $('closePasses');
const infoModal = $('infoModal');
const closeInfo = $('closeInfo');

navBtns.forEach(b=> b.addEventListener('click', ()=>{
    navBtns.forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    const view = b.dataset.view;
    if(view==='stats'){
        statsContent.innerHTML = `Total clicks: <strong>${(state.totalClicks||0).toLocaleString()}</strong><br/>Total earned: <strong>${Math.floor(state.totalEarned||0).toLocaleString()}</strong><br/>Owned items: <strong>${Object.keys(state.items||{}).reduce((s,k)=> s + (state.items[k]||0),0)}</strong><br/>Upgrades: <strong>${Object.keys(state.upgrades||{}).filter(k=>state.upgrades[k]).join(', ') || '—'}</strong>`;
        statsModal.classList.remove('hidden');
    } else if(view==='passes'){
        passesList.innerHTML = '';
        passesDefs.forEach(pd=>{
            const card = document.createElement('div'); card.className='card';
            // passes are cash-only
            card.innerHTML = `<div class="card-left"><div class="card-title">${pd.name}</div><div class="card-sub">${pd.desc}</div></div><div class="card-right"><div class="cost">$${pd.priceUSD.toFixed(2)}</div><button class="card cash" data-cash-id="${pd.id}">${state.passes && state.passes[pd.id] ? 'Owned' : `Buy $${pd.priceUSD.toFixed(2)}`}</button></div>`;
            passesList.appendChild(card);
            const cashBtn = card.querySelector('button[data-cash-id]');
            cashBtn && cashBtn.addEventListener('click', ()=> buyPassWithCash(pd.id));
        });
        passesModal.classList.remove('hidden');
    } else if(view==='info'){
        infoModal && infoModal.classList.remove('hidden');
    }
}));

closeStats.addEventListener('click', ()=> statsModal.classList.add('hidden'));
closePasses.addEventListener('click', ()=> passesModal.classList.add('hidden'));
closeInfo && closeInfo.addEventListener('click', ()=> infoModal.classList.add('hidden'));
