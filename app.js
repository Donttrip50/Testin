/* Source Access — app.js */
const $ = id => document.getElementById(id);

const WEBHOOK_URL = 'https://discord.com/api/v10/webhooks/1491969328889860297/E2eVMVa8vyI9uQ-cJOtbjMZhpPZ7feqPr5CXUXMbc4ZxTbffmzC8ilbnMCsuxKAm0QUp';

const state = { robloxUsername:'', discordId:'', selectedPlan:'', selectedPrice:0 };

function formatDate() { return new Date().toISOString().slice(0,10); }
['footerDate','footerDate2','footerDate3','footerDate4'].forEach(id=>{const el=$(id);if(el)el.textContent=formatDate();});

(function initTilt(){
  const wrapper=$('cardWrapper');
  document.addEventListener('mousemove',e=>{
    const card=wrapper?.querySelector('.card');if(!card)return;
    const rect=card.getBoundingClientRect();
    const cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
    const dx=(e.clientX-cx)/(rect.width/2),dy=(e.clientY-cy)/(rect.height/2);
    card.style.transform=`rotateY(${dx*4}deg) rotateX(${-dy*4}deg)`;
  });
  document.addEventListener('mouseleave',()=>{const card=wrapper?.querySelector('.card');if(card)card.style.transform='';});
})();

function scanTransition(cb){
  const line=$('scanLine');line.classList.remove('scanning');void line.offsetWidth;line.classList.add('scanning');setTimeout(cb,260);
}
function show(id){
  scanTransition(()=>{document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));$(id).classList.add('active');});
}
function setError(msg){
  const el=$('errMsg'),txt=$('errTxt');txt.textContent=msg;el.classList.toggle('visible',!!msg);
}
function setAvatar(username){
  const el=$('avatarImg');el.textContent=username.slice(0,2).toUpperCase();el.style.display='flex';$('avatarSkeleton').style.display='none';
}
function validateField(input,wrap,isValid){
  input.classList.remove('valid','invalid');wrap.classList.remove('show-valid','show-invalid');
  if(input.value.trim()){input.classList.add(isValid?'valid':'invalid');wrap.classList.add(isValid?'show-valid':'show-invalid');}
}

const robloxRe=/^[A-Za-z0-9_]{3,20}$/,discordRe=/^\d{17,19}$/;
$('robloxInput').addEventListener('blur',e=>validateField(e.target,$('robloxWrap'),robloxRe.test(e.target.value.trim())));
$('discordInput').addEventListener('blur',e=>validateField(e.target,$('discordWrap'),discordRe.test(e.target.value.trim())));
$('robloxInput').addEventListener('input',e=>{
  const len=e.target.value.length,c=$('robloxCounter');c.textContent=`${len}/20`;c.classList.toggle('visible',len>0);
});

function burst(){
  const container=$('particles'),cx=window.innerWidth/2,cy=window.innerHeight/2;
  for(let i=0;i<22;i++){
    const p=document.createElement('div');p.className='particle';
    const angle=(i/22)*Math.PI*2,dist=60+Math.random()*90,sz=2+Math.random()*4;
    p.style.cssText=`left:${cx}px;top:${cy}px;--tx:${Math.cos(angle)*dist}px;--ty:${Math.sin(angle)*dist}px;--dur:${0.7+Math.random()*0.5}s;--delay:${Math.random()*0.15}s;--sz:${sz}px;--op:${0.4+Math.random()*0.6};`;
    container.appendChild(p);setTimeout(()=>p.remove(),1600);
  }
}

async function sendWebhook(type,data){
  const now=new Date(),timestamp=now.toISOString();
  const dateStr=now.toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
  const timeStr=now.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',timeZoneName:'short'});
  let embed={};
  if(type==='identity'){
    embed={title:'🔐  Identity Confirmed',description:'A user has verified their identity and is viewing purchase options.',color:0x5865F2,
      fields:[
        {name:'👤  Roblox Username',value:`\`\`\`${data.robloxUsername}\`\`\``,inline:true},
        {name:'🪪  Discord',value:`<@${data.discordId}>\n\`${data.discordId}\``,inline:true},
      ],footer:{text:`Source Access  ·  ${dateStr}  ·  ${timeStr}`},timestamp};
  } else if(type==='order'){
    const planEmoji={'Lifetime':'⭐','1 Month':'📅','1 Week':'🗓️','1 Day':'🕐'}[data.plan]||'📦';
    embed={title:`${planEmoji}  New Purchase Request`,description:'A user has selected a plan and is awaiting payment.',
      color:data.plan==='Lifetime'?0xFFD700:0x57F287,
      fields:[
        {name:'👤  Roblox Username',value:`\`\`\`${data.robloxUsername}\`\`\``,inline:true},
        {name:'🪪  Discord',value:`<@${data.discordId}>\n\`${data.discordId}\``,inline:true},
        {name:'\u200b',value:'\u200b',inline:false},
        {name:'📦  Plan',value:`**${data.plan}**`,inline:true},
        {name:'💰  Price',value:`**R$ ${data.price} Robux**`,inline:true},
      ],footer:{text:`Source Access  ·  ${dateStr}  ·  ${timeStr}`},timestamp};
  }
  try{
    await fetch(WEBHOOK_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({embeds:[embed]})});
  } catch(err){console.error('[Webhook]',err);}
}

function handleLogin(){
  const robloxEl=$('robloxInput'),discordEl=$('discordInput');setError('');
  let valid=true;
  [robloxEl,discordEl].forEach(el=>{
    el.classList.remove('shake');
    if(!el.value.trim()){void el.offsetWidth;el.classList.add('shake');valid=false;setTimeout(()=>el.classList.remove('shake'),600);}
  });
  if(!valid)return;
  if(!robloxRe.test(robloxEl.value.trim())){setError('Roblox username must be 3–20 characters (letters, numbers, underscores).');return;}
  if(!discordRe.test(discordEl.value.trim())){setError('Discord ID must be a 17–19 digit number. Enable Developer Mode in Discord settings to find it.');return;}
  state.robloxUsername=robloxEl.value.trim();state.discordId=discordEl.value.trim();
  $('confirmName').textContent=state.robloxUsername;
  $('summaryRoblox').textContent=state.robloxUsername;
  $('summaryDiscord').textContent=state.discordId;
  setAvatar(state.robloxUsername);show('s-confirm');
}

function grantAccess(){
  burst();sendWebhook('identity',{robloxUsername:state.robloxUsername,discordId:state.discordId});show('s-pricing');
}

function selectPlan(plan,price){
  state.selectedPlan=plan;state.selectedPrice=price;
  $('orderedPlan').textContent=plan;$('orderedPrice').textContent=`R$ ${price} Robux`;
  $('orderedRoblox').textContent=state.robloxUsername;$('orderedDiscord').textContent=state.discordId;
  $('orderedPriceDm').textContent=`R$ ${price}`;$('footerDate4').textContent=formatDate();
  sendWebhook('order',{robloxUsername:state.robloxUsername,discordId:state.discordId,plan,price});
  saveOrderLocally(plan,price);
  burst();show('s-ordered');
}

function goBack(){setError('');show('s-login');}

['robloxInput','discordInput'].forEach(id=>{
  $(id)?.addEventListener('keydown',e=>{if(e.key==='Enter')handleLogin();});
});

const observer=new MutationObserver(mutations=>{
  for(const m of mutations){
    if(m.type==='attributes'&&m.attributeName==='class'){
      const el=m.target;
      if(el.classList.contains('active')){const f=el.querySelector('input,button');if(f)setTimeout(()=>f.focus(),650);}
    }
  }
});
document.querySelectorAll('.screen').forEach(s=>observer.observe(s,{attributes:true}));

// ── Save order to localStorage for admin panel ──
function saveOrderLocally(plan, price) {
  try {
    const orders = JSON.parse(localStorage.getItem('sa_orders') || '[]');
    orders.push({
      roblox:    state.robloxUsername,
      discordId: state.discordId,
      plan,
      price,
      status:    'pending',
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem('sa_orders', JSON.stringify(orders));
  } catch(e) { console.error('[Storage]', e); }
}
