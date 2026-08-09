(() => {
  'use strict';

  const STORAGE_KEY = 'afl-coaches-whiteboard-v1';
  const NOTES_VISIBILITY_KEY = 'afl-coaches-whiteboard-notes-visible';
  const MAGNETS_COLLAPSED_KEY = 'afl-coaches-whiteboard-magnets-collapsed';
  const MAX_PLAYERS = 50;
  const DEFAULT_BENCH_COUNT = 4;
  const MAX_BENCH_COUNT = 12;
  const MAGNET_COLORS = ['black','blue','red','yellow','green'];

  const POSITIONS = [
    { id:'fp_left', role:'FP', label:'Forward Pocket', x:30, y:17 },
    { id:'ff', role:'FF', label:'Full Forward', x:50, y:14 },
    { id:'fp_right', role:'FP', label:'Forward Pocket', x:70, y:17 },
    { id:'hff_left', role:'HFF', label:'Half Forward Flank', x:26, y:33 },
    { id:'chf', role:'CHF', label:'Centre Half Forward', x:50, y:31 },
    { id:'hff_right', role:'HFF', label:'Half Forward Flank', x:74, y:33 },
    { id:'wing_left', role:'W', label:'Wing', x:22, y:50 },
    { id:'centre', role:'C', label:'Centre', x:50, y:46 },
    { id:'wing_right', role:'W', label:'Wing', x:78, y:50 },
    { id:'ruck', role:'RUCK', label:'Ruck', x:50, y:56 },
    { id:'ruck_rover', role:'RR', label:'Ruck Rover', x:37, y:62 },
    { id:'rover', role:'ROV', label:'Rover', x:63, y:62 },
    { id:'hbf_left', role:'HBF', label:'Half Back Flank', x:26, y:76 },
    { id:'chb', role:'CHB', label:'Centre Half Back', x:50, y:78 },
    { id:'hbf_right', role:'HBF', label:'Half Back Flank', x:74, y:76 },
    { id:'bp_left', role:'BP', label:'Back Pocket', x:30, y:91 },
    { id:'fb', role:'FB', label:'Full Back', x:50, y:94 },
    { id:'bp_right', role:'BP', label:'Back Pocket', x:70, y:91 }
  ];

  function benchSlots(count=DEFAULT_BENCH_COUNT){
    const safe=Math.max(DEFAULT_BENCH_COUNT,Math.min(MAX_BENCH_COUNT,Number(count)||DEFAULT_BENCH_COUNT));
    return Array.from({length:safe},(_,i)=>({id:`bench${i+1}`,label:`Interchange ${i+1}`}));
  }

  const $ = id => document.getElementById(id);
  const syncAdapter = window.WhiteboardSync.createAdapter();

  function playerId(number, firstName, surname, index=0){
    const clean = `${number}-${firstName}-${surname}`.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    return `p_${clean || index}_${index}`;
  }

  function defaultDetails(){
    return {
      date:'', time:'', homeTeam:'', awayTeam:'', location:'',
      weatherLocation:'', latitude:null, longitude:null,
      temperature:'', weather:'', wind:'', rain:'', rainChance:'',
      windSpeed:null, windDirection:null,
      groundCondition:'', groundConditionNote:'',
      previous72Rain:null, previous72RainDays:[], previous72RainSource:'', previous72RainComplete:false, previous72RainLabel:'Previous 72 hrs rain',
      weatherComments:'', weatherUpdated:''
    };
  }

  function defaultState(){
    const assignments = {};
    const magnets = {};
    POSITIONS.forEach(p => { assignments[p.id] = { playerId:'', text:'' }; magnets[p.id]=''; });
    benchSlots(DEFAULT_BENCH_COUNT).forEach(p => { assignments[p.id] = { playerId:'', text:'' }; magnets[p.id]=''; });
    return {
      schemaVersion:10,
      boardId:null,
      mode:'local',
      details:defaultDetails(),
      roster:[],
      teamListText:'',
      boardTitle:'',
      notes:'',
      benchCount:DEFAULT_BENCH_COUNT,
      assignments,
      magnets,
      magnetNextNumber:{black:1,blue:1,red:1,yellow:1,green:1},
      updatedAt:new Date().toISOString()
    };
  }

  function loadState(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return defaultState();
      const parsed = JSON.parse(raw);
      const base = defaultState();
      const benchCount=Math.max(DEFAULT_BENCH_COUNT,Math.min(MAX_BENCH_COUNT,Number(parsed.benchCount)||DEFAULT_BENCH_COUNT));
      const assignments={...base.assignments, ...(parsed.assignments || {})};
      const rawMagnets={...base.magnets, ...(parsed.magnets || {})};
      benchSlots(benchCount).forEach(slot=>{
        if(!assignments[slot.id]) assignments[slot.id]={playerId:'',text:''};
        if(!(slot.id in rawMagnets)) rawMagnets[slot.id]='';
      });
      const used={black:new Set(),blue:new Set(),red:new Set(),yellow:new Set(),green:new Set()};
      const magnets={};
      [...POSITIONS,...benchSlots(benchCount)].forEach(slot=>{
        const value=rawMagnets[slot.id];
        if(value && typeof value==='object' && MAGNET_COLORS.includes(value.color)){
          let number=Number(value.number);
          if(![1,2,3].includes(number) || used[value.color].has(number)) number=[1,2,3].find(n=>!used[value.color].has(n))||0;
          if(number){ magnets[slot.id]={color:value.color,number}; used[value.color].add(number); }
          else magnets[slot.id]='';
        }else if(MAGNET_COLORS.includes(value)){
          const number=[1,2,3].find(n=>!used[value].has(n))||0;
          if(number){ magnets[slot.id]={color:value,number}; used[value].add(number); }
          else magnets[slot.id]='';
        }else magnets[slot.id]='';
      });
      return {
        ...base,
        ...parsed,
        schemaVersion:10,
        benchCount,
        details:{...base.details, ...(parsed.details || {})},
        assignments,
        magnets,
        magnetNextNumber:{...base.magnetNextNumber,...(parsed.magnetNextNumber||{})},
        roster:Array.isArray(parsed.roster) ? parsed.roster.filter(Boolean).map(cleanRosterPlayer) : []
      };
    }catch(err){
      console.warn('Could not load saved whiteboard state.', err);
      return defaultState();
    }
  }

  let state = loadState();
  let shareStatus = syncAdapter.getStatus ? syncAdapter.getStatus() : {mode:'local',connection:'local',connectedCount:0,message:''};
  let inviteBoardCode = '';

  function loadNotesVisible(){
    try{
      const saved=localStorage.getItem(NOTES_VISIBILITY_KEY);
      return saved === null ? false : saved === 'true';
    }catch(_){ return false; }
  }
  function loadMagnetsCollapsed(){
    try{
      const saved=localStorage.getItem(MAGNETS_COLLAPSED_KEY);
      return saved === null ? false : saved === 'true';
    }catch(_){ return false; }
  }

  let notesVisible=loadNotesVisible();
  let activeMagnetColor='';
  let magnetsCollapsed=loadMagnetsCollapsed();


  function snapshot(){ return JSON.parse(JSON.stringify(state)); }
  function saveState({publish=true}={}){
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if(publish) syncAdapter.publish(snapshot()).catch(()=>{});
  }

  function setTab(tabName){
    document.querySelectorAll('.tab').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabName));
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.toggle('active', panel.id === tabName));
    window.scrollTo({top:0, behavior:'smooth'});
  }

  function escapeHtml(value){
    return String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  }
  function normalizeNumber(value){ return String(value || '').trim().replace(/^#/,'').replace(/\s+/g,''); }
  function stripRosterMarkers(value){
    let name=String(value||'').replace(/ /g,' ').replace(/\s+/g,' ').trim();
    // PlayHQ status markers are not relevant to a match whiteboard.
    // Remove trailing captain / vice-captain / deputy vice-captain / season-permit tags.
    let previous='';
    while(name!==previous){
      previous=name;
      name=name.replace(/\s*\((?:c|vc|dvc|sp)\)\s*$/i,'').trim();
    }
    return name;
  }
  function cleanRosterPlayer(player){
    if(!player || typeof player!=='object') return player;
    const full=stripRosterMarkers([player.firstName,player.surname].filter(Boolean).join(' '));
    const bits=full.split(/\s+/).filter(Boolean);
    return {...player,firstName:bits.shift()||'',surname:bits.join(' ')};
  }

  function playerDisplay(player){
    if(!player) return '';
    const first=String(player.firstName || '').trim();
    const surname=String(player.surname || '').trim();
    const surnameInitial=surname ? surname.charAt(0).toUpperCase() : '';
    const shortName=[first,surnameInitial].filter(Boolean).join(' ').trim();
    if(player.number && shortName) return `#${player.number} ${shortName}`;
    if(player.number) return `#${player.number}`;
    return shortName;
  }
  function activePlayers(){ return state.roster.filter(p => playerDisplay(p)); }
  function rosterById(id){ return state.roster.find(p => p.id === id); }
  function assignmentDisplay(assignment){
    if(!assignment) return '';
    if(assignment.playerId){
      const p=rosterById(assignment.playerId);
      if(p && playerDisplay(p)) return playerDisplay(p);
    }
    return assignment.text || '';
  }
  function resolveAssignment(value){
    const trimmed=String(value || '').trim();
    if(!trimmed) return {playerId:'',text:''};
    const match=activePlayers().find(p => playerDisplay(p).toLowerCase() === trimmed.toLowerCase());
    return match ? {playerId:match.id,text:''} : {playerId:'',text:trimmed};
  }

  function getMagnet(slotId){
    const value=state.magnets?.[slotId];
    if(value && typeof value==='object' && MAGNET_COLORS.includes(value.color) && [1,2,3].includes(Number(value.number))) return {color:value.color,number:Number(value.number)};
    if(MAGNET_COLORS.includes(value)) return {color:value,number:1};
    return null;
  }

  function allMagnetSlotIds(){ return [...POSITIONS.map(p=>p.id),...benchSlots(state.benchCount).map(p=>p.id)]; }
  function magnetCount(color){ return allMagnetSlotIds().filter(id=>getMagnet(id)?.color===color).length; }

  function renderMagnetPalette(){
    document.querySelectorAll('[data-magnet-color]').forEach(btn=>{
      const color=btn.dataset.magnetColor;
      const isActive=color===activeMagnetColor;
      btn.classList.toggle('is-active',isActive);
      btn.setAttribute('aria-pressed',String(isActive));
      btn.textContent=magnetCount(color)||'';
    });
  }

  function setActiveMagnetColor(color=''){
    activeMagnetColor=MAGNET_COLORS.includes(color)?color:'';
    renderMagnetPalette();
  }

  function renderMagnetPaletteVisibility(){
    const panel=$('ovalMagnets');
    const toggleBtn=$('magnetsToggleBtn');
    if(panel) panel.classList.toggle('is-collapsed',magnetsCollapsed);
    if(toggleBtn){
      toggleBtn.textContent=magnetsCollapsed?'▾':'▴';
      toggleBtn.setAttribute('aria-expanded',String(!magnetsCollapsed));
      toggleBtn.setAttribute('aria-label',magnetsCollapsed?'Expand magnets':'Collapse magnets');
      toggleBtn.title=magnetsCollapsed?'Expand magnets':'Collapse magnets';
    }
  }

  function setMagnetsCollapsed(collapsed){
    magnetsCollapsed=Boolean(collapsed);
    try{ localStorage.setItem(MAGNETS_COLLAPSED_KEY,String(magnetsCollapsed)); }catch(_){}
    renderMagnetPaletteVisibility();
  }

  function toggleSlotMagnet(slotId,color){
    if(!slotId || !MAGNET_COLORS.includes(color)) return;
    if(!state.magnets) state.magnets={};
    if(!state.magnetNextNumber) state.magnetNextNumber={black:1,blue:1,red:1,yellow:1,green:1};
    const current=getMagnet(slotId);
    if(current?.color===color){
      state.magnets[slotId]='';
      saveState(); renderPositions(); renderBench(); renderDuplicateWarnings(); renderMagnetPalette();
      return;
    }
    if(current) state.magnets[slotId]='';
    const same=allMagnetSlotIds().map(id=>({id,mag:getMagnet(id)})).filter(x=>x.mag?.color===color && x.id!==slotId);
    const used=new Set(same.map(x=>x.mag.number));
    let number;
    if(same.length<3){
      number=[1,2,3].find(n=>!used.has(n))||1;
    }else{
      number=Number(state.magnetNextNumber[color])||1;
      if(![1,2,3].includes(number)) number=1;
      const replace=same.find(x=>x.mag.number===number);
      if(replace) state.magnets[replace.id]='';
    }
    state.magnets[slotId]={color,number};
    state.magnetNextNumber[color]=(number%3)+1;
    saveState(); renderPositions(); renderBench(); renderDuplicateWarnings(); renderMagnetPalette();
  }

  function renderPlayerOptions(){
    $('playerOptions').innerHTML = activePlayers()
      .slice()
      .sort((a,b)=>Number(a.number||9999)-Number(b.number||9999) || playerDisplay(a).localeCompare(playerDisplay(b)))
      .map(p=>`<option value="${escapeHtml(playerDisplay(p))}"></option>`).join('');
  }

  function renderPositions(){
    const layer=$('positionLayer');
    layer.innerHTML = POSITIONS.map(pos=>{
      const magnet=getMagnet(pos.id);
      const magnetDot=magnet?`<span class="position-magnet-dot magnet-${magnet.color}" aria-hidden="true">${magnet.number}</span>`:'';
      const magnetClass=magnet?' has-magnet':'';
      return `
      <div class="position-node${magnetClass}" data-position-node="${pos.id}" style="left:${pos.x}%; top:${pos.y}%;">
        <div class="position-label-row"><label class="position-role" for="pos_${pos.id}" title="${escapeHtml(pos.label)}">${pos.role}</label>${magnetDot}</div>
        <input id="pos_${pos.id}" class="position-input" type="text" list="playerOptions" autocomplete="off" aria-label="${escapeHtml(pos.label)} player" placeholder="Player" data-assignment="${pos.id}" value="${escapeHtml(assignmentDisplay(state.assignments[pos.id]))}" />
      </div>`;
    }).join('');
    layer.querySelectorAll('[data-assignment]').forEach(input=>{
      input.addEventListener('change', onAssignmentChange);
      input.addEventListener('blur', onAssignmentChange);
    });
    layer.querySelectorAll('[data-position-node]').forEach(node=>{
      const positionId=node.dataset.positionNode;
      const maybeApplyMagnet=event=>{
        if(!activeMagnetColor) return;
        event.preventDefault();
        event.stopPropagation();
        toggleSlotMagnet(positionId,activeMagnetColor);
      };
      node.addEventListener('mousedown', maybeApplyMagnet);
    });
  }

  function renderBench(){
    const slots=benchSlots(state.benchCount);
    slots.forEach(slot=>{
      if(!state.assignments[slot.id]) state.assignments[slot.id]={playerId:'',text:''};
      if(!(slot.id in state.magnets)) state.magnets[slot.id]='';
    });
    $('benchGrid').innerHTML=slots.map(slot=>{
      const magnet=getMagnet(slot.id);
      const dot=magnet?`<span class="bench-magnet-dot magnet-${magnet.color}" aria-hidden="true">${magnet.number}</span>`:'';
      return `<div class="bench-slot" data-bench-node="${slot.id}">
        <div class="bench-label-row" data-bench-magnet-target="${slot.id}"><label for="bench_${slot.id}">${slot.label}</label>${dot}</div>
        <input id="bench_${slot.id}" type="text" list="playerOptions" autocomplete="off" placeholder="Player" data-assignment="${slot.id}" value="${escapeHtml(assignmentDisplay(state.assignments[slot.id]))}" />
      </div>`;
    }).join('');
    if($('benchCount')) $('benchCount').textContent=`${slots.length} position${slots.length===1?'':'s'}`;
    if($('addBenchBtn')) $('addBenchBtn').disabled=slots.length>=MAX_BENCH_COUNT;
    $('benchGrid').querySelectorAll('[data-assignment]').forEach(input=>{
      input.addEventListener('change',onAssignmentChange);
      input.addEventListener('blur',onAssignmentChange);
    });
    $('benchGrid').querySelectorAll('[data-bench-magnet-target]').forEach(row=>{
      row.addEventListener('mousedown',event=>{
        if(!activeMagnetColor) return;
        event.preventDefault(); event.stopPropagation();
        toggleSlotMagnet(row.dataset.benchMagnetTarget,activeMagnetColor);
      });
    });
  }

  function addBenchPosition(){
    if(state.benchCount>=MAX_BENCH_COUNT) return;
    state.benchCount=Math.min(MAX_BENCH_COUNT,(Number(state.benchCount)||DEFAULT_BENCH_COUNT)+1);
    const slot=benchSlots(state.benchCount).at(-1);
    if(!state.assignments[slot.id]) state.assignments[slot.id]={playerId:'',text:''};
    if(!(slot.id in state.magnets)) state.magnets[slot.id]='';
    saveState(); renderBench(); renderMagnetPalette();
  }

  function onAssignmentChange(event){
    const key=event.target.dataset.assignment;
    const next=resolveAssignment(event.target.value);
    const old=state.assignments[key] || {playerId:'',text:''};
    if(old.playerId===next.playerId && old.text===next.text) return;
    state.assignments[key]=next;
    saveState();
    renderAssignmentsOnly();
  }
  function renderAssignmentsOnly(){
    document.querySelectorAll('[data-assignment]').forEach(input=>{
      const display=assignmentDisplay(state.assignments[input.dataset.assignment]);
      if(document.activeElement !== input) input.value=display;
    });
    renderDuplicateWarnings();
  }
  function renderDuplicateWarnings(){
    document.querySelectorAll('.position-node.duplicate, .bench-slot.duplicate').forEach(el=>el.classList.remove('duplicate'));
    const byPlayer=new Map();
    Object.entries(state.assignments).forEach(([slotId,assignment])=>{
      if(!assignment?.playerId) return;
      const arr=byPlayer.get(assignment.playerId)||[]; arr.push(slotId); byPlayer.set(assignment.playerId,arr);
    });
    byPlayer.forEach(slots=>{
      if(slots.length<2) return;
      slots.forEach(slotId=>{
        const node=document.querySelector(`[data-position-node="${slotId}"]`) || document.querySelector(`[data-bench-node="${slotId}"]`);
        if(node) node.classList.add('duplicate');
      });
    });
  }

  function formatDate(value){
    if(!value) return '';
    const [y,m,d]=value.split('-').map(Number);
    if(!y||!m||!d) return value;
    return new Intl.DateTimeFormat('en-AU',{day:'numeric',month:'short',year:'numeric'}).format(new Date(y,m-1,d));
  }
  function formatTime(value){
    if(!value) return '';
    const [h,m]=value.split(':').map(Number);
    if(Number.isNaN(h)||Number.isNaN(m)) return value;
    const d=new Date(); d.setHours(h,m,0,0);
    return new Intl.DateTimeFormat('en-AU',{hour:'numeric',minute:'2-digit'}).format(d);
  }
  function renderInfo(){
    $('infoDate').textContent=formatDate(state.details.date)||'—';
    $('infoTime').textContent=formatTime(state.details.time)||'—';
    $('infoHome').textContent=state.details.homeTeam||'—';
    $('infoAway').textContent=state.details.awayTeam||'—';
    $('infoLocation').textContent=state.details.location||'—';
    const heading=$('starting18Heading');
    if(heading){
      const home=String(state.details.homeTeam||'').trim();
      const away=String(state.details.awayTeam||'').trim();
      heading.textContent=(home||away) ? `Starting 18 - ${home||'Home Team'} VS ${away||'Away Team'}` : 'Starting 18';
    }
    const boardTitle=$('boardTitleInput');
    if(boardTitle && document.activeElement!==boardTitle && boardTitle.value!==String(state.boardTitle||'')) boardTitle.value=String(state.boardTitle||'');
  }
  function renderNotes(){
    const el=$('boardNotes');
    if(el && el.value !== String(state.notes || '')) el.value=String(state.notes || '');
  }

  function bindBoardTitle(){
    const el=$('boardTitleInput');
    if(!el) return;
    el.addEventListener('input',()=>{
      state.boardTitle=el.value.slice(0,80);
      saveState();
    });
  }

  function bindNotes(){
    const el=$('boardNotes');
    if(!el) return;
    el.addEventListener('input',()=>{
      state.notes=el.value.slice(0,1200);
      saveState();
    });
  }

  function renderNotesVisibility(){
    const panel=$('boardNotesPanel');
    const toggleBtn=$('notesToggleBtn');
    const layout=document.querySelector('.field-notes-layout');
    if(panel) panel.hidden=!notesVisible;
    if(layout) layout.classList.toggle('notes-hidden', !notesVisible);
    if(toggleBtn){
      toggleBtn.setAttribute('aria-pressed', String(notesVisible));
      toggleBtn.setAttribute('aria-label', notesVisible ? 'Hide notes' : 'Show notes');
      toggleBtn.title=notesVisible ? 'Hide notes' : 'Show notes';
    }
  }

  function setNotesVisible(visible){
    notesVisible=Boolean(visible);
    try{ localStorage.setItem(NOTES_VISIBILITY_KEY, String(notesVisible)); }catch(_){}
    renderNotesVisibility();
  }

  function renderSetupDetails(){
    $('matchDate').value=state.details.date||'';
    $('matchTime').value=state.details.time||'';
    $('homeTeam').value=state.details.homeTeam||'';
    $('awayTeam').value=state.details.awayTeam||'';
    $('location').value=state.details.location||'';
    $('weatherLocation').value=state.details.weatherLocation||'';
    $('weatherComments').value=state.details.weatherComments||'';
  }

  function serializeRoster(){
    if(!activePlayers().length) return '';
    const lines=activePlayers().slice().sort((a,b)=>Number(a.number||9999)-Number(b.number||9999)).map(p=>[p.number,p.firstName,p.surname].join(','));
    return `#teamlist\n${lines.join('\n')}`;
  }
  function renderTeamList(){
    const textarea=$('teamListInput');
    if(document.activeElement !== textarea) textarea.value=state.roster.length ? serializeRoster() : (state.teamListText || serializeRoster());
    $('rosterCount').textContent=`${activePlayers().length}/${MAX_PLAYERS} loaded`;
  }
  function setTeamListStatus(message,isError=false){
    const el=$('teamListStatus'); el.textContent=message||''; el.classList.toggle('error',Boolean(isError));
  }

  function parseTeamList(text){
    // Accept the app's normal #teamlist CSV format, a one-line numbered
    // PlayHQ list, or copied lists where the number and name are on
    // separate lines (including Markdown bullets/bold formatting).
    const cleanLine=value=>String(value||'')
      .replace(/\u00a0/g,' ')
      .replace(/^\s*(?:[-*•–—]+)\s*/, '')
      .replace(/\*\*/g,'')
      .replace(/^\s*[-–—]\s*$/, '')
      .trim()
      .replace(/\s+/g,' ');
    const source=String(text||'').split(/\r?\n/).map(cleanLine).filter(Boolean);
    const players=[];
    const skipped=[];
    let pendingNumber='';

    const splitName=name=>{
      const cleaned=stripRosterMarkers(cleanLine(name).replace(/^[-:]+\s*/,'').trim());
      if(!cleaned) return {firstName:'',surname:''};
      const bits=cleaned.split(/\s+/);
      return {firstName:bits.shift()||'',surname:bits.join(' ')};
    };
    const addPlayer=(number,nameOrFirst,surname='')=>{
      number=normalizeNumber(number);
      if(!/^\d+[a-z]?$/i.test(number)) return false;
      let firstName='', lastName='';
      if(surname){
        const full=stripRosterMarkers([cleanLine(nameOrFirst),cleanLine(surname)].filter(Boolean).join(' '));
        const bits=full.split(/\s+/).filter(Boolean); firstName=bits.shift()||''; lastName=bits.join(' ');
      }
      else ({firstName,surname:lastName}=splitName(nameOrFirst));
      players.push({number,firstName,surname:lastName});
      return true;
    };

    for(let i=0;i<source.length && players.length<MAX_PLAYERS;i++){
      const raw=source[i];
      if(/^#?teamlist$/i.test(raw)) continue;
      if(/^(number|no\.?|player\s*number)[,\t ]/i.test(raw)) continue;

      // If the previous line was just a player number, the next text line
      // is the player's name. This covers pasted lists such as:
      // - **12**\n  Jack Campbell (vc)  // marker is removed when saved
      if(pendingNumber){
        if(!/^#?\d+[A-Za-z]?\s*[.)\-:]?$/.test(raw)){
          if(addPlayer(pendingNumber,raw)){ pendingNumber=''; continue; }
        }
        pendingNumber='';
      }

      // CSV / TSV / semicolon: number,firstname,surname
      if(/[\t,;]/.test(raw)){
        const delimiter=raw.includes('\t')?'\t':raw.includes(',')?',':';';
        const parts=raw.split(delimiter).map(cleanLine);
        const number=normalizeNumber(parts[0]);
        if(/^\d+[a-z]?$/i.test(number)){
          addPlayer(number,parts[1]||'',parts.slice(2).join(' ').trim());
          continue;
        }
      }

      // A number by itself. Remember it and pair with the next name line.
      const only=raw.match(/^#?([0-9]+[A-Za-z]?)\s*[.)\-:]?$/);
      if(only){ pendingNumber=normalizeNumber(only[1]); continue; }

      // One-line numbered text: 12 Jack Campbell / 12. Jack Campbell / #12 Jack Campbell
      const m=raw.match(/^#?([0-9]+[A-Za-z]?)\s*[.)\-:]?\s+(.+)$/);
      if(m){ addPlayer(m[1],m[2]); continue; }

      skipped.push(raw);
    }
    if(pendingNumber) addPlayer(pendingNumber,'');

    const seen=new Set(), duplicates=new Set();
    players.forEach(p=>{ const n=p.number.toLowerCase(); if(seen.has(n)) duplicates.add(p.number); else seen.add(n); });
    if(duplicates.size) throw new Error(`Duplicate player number${duplicates.size>1?'s':''}: ${[...duplicates].join(', ')}`);
    return {players, skipped};
  }

  function saveTeamList(){
    const text=$('teamListInput').value;
    let parsed;
    try{ parsed=parseTeamList(text); }
    catch(error){ setTeamListStatus(error.message,true); return; }
    if(!parsed.players.length){ setTeamListStatus('No valid players found. Use number,firstname,surname or paste a numbered PlayHQ line-up.',true); return; }
    const currentDisplays={};
    Object.keys(state.assignments).forEach(slot=>currentDisplays[slot]=assignmentDisplay(state.assignments[slot]));
    state.roster=parsed.players.map((p,index)=>({...p,id:playerId(p.number,p.firstName,p.surname,index)}));
    state.teamListText=serializeRoster();
    Object.keys(state.assignments).forEach(slot=>{ state.assignments[slot]=resolveAssignment(currentDisplays[slot]||''); });
    saveState();
    renderTeamList(); renderPlayerOptions(); renderAssignmentsOnly();
    setTeamListStatus(`${state.roster.length} player${state.roster.length===1?'':'s'} loaded${parsed.skipped.length?` • ${parsed.skipped.length} unrecognised line${parsed.skipped.length===1?'':'s'} ignored`:''}.`);
  }

  function clearRoster(){
    if(!confirm('Clear the entire team list? Existing position selections will remain as manual text.')) return;
    Object.keys(state.assignments).forEach(slot=>{
      const current=assignmentDisplay(state.assignments[slot]);
      state.assignments[slot]={playerId:'',text:current};
    });
    state.roster=[]; state.teamListText='';
    saveState(); renderTeamList(); renderPlayerOptions(); renderAssignmentsOnly(); setTeamListStatus('Team list cleared.');
  }

  function bindDetails(){
    const mapping={matchDate:'date',matchTime:'time',homeTeam:'homeTeam',awayTeam:'awayTeam',location:'location',weatherLocation:'weatherLocation',weatherComments:'weatherComments'};
    Object.entries(mapping).forEach(([elementId,key])=>{
      $(elementId).addEventListener('input',event=>{
        state.details[key]=event.target.value;
        if(key==='weatherLocation'){ state.details.latitude=null; state.details.longitude=null; }
        saveState(); renderInfo(); renderWeatherSummary();
      });
    });
  }

  function weatherCodeLabel(code){
    const labels={0:'Clear',1:'Mostly clear',2:'Partly cloudy',3:'Cloudy',45:'Fog',48:'Fog',51:'Light drizzle',53:'Drizzle',55:'Heavy drizzle',56:'Freezing drizzle',57:'Freezing drizzle',61:'Light rain',63:'Rain',65:'Heavy rain',66:'Freezing rain',67:'Freezing rain',71:'Light snow',73:'Snow',75:'Heavy snow',77:'Snow grains',80:'Light showers',81:'Showers',82:'Heavy showers',85:'Snow showers',86:'Heavy snow showers',95:'Thunderstorm',96:'Thunderstorm with hail',99:'Thunderstorm with hail'};
    return labels[Number(code)] || 'Conditions recorded';
  }
  function windDirection(degrees){
    if(degrees===null||degrees===undefined||degrees==='') return '';
    const dirs=['N','NE','E','SE','S','SW','W','NW']; return dirs[Math.round(Number(degrees)/45)%8];
  }
  function setWeatherStatus(message,isError=false){
    const el=$('locationWeatherStatus'); el.textContent=message||''; el.classList.toggle('error',Boolean(isError));
  }
  async function lookupLocation(){
    const query=(state.details.weatherLocation || $('weatherLocation').value || '').trim();
    if(!query){ setWeatherStatus('Enter an oval, suburb or town first.',true); return false; }
    setWeatherStatus('Searching for location…');
    try{
      const url=`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json&countryCode=AU`;
      const response=await fetch(url); if(!response.ok) throw new Error('Location lookup failed');
      const data=await response.json(); const place=data.results && data.results[0];
      if(!place) throw new Error('Location not found');
      state.details.latitude=place.latitude; state.details.longitude=place.longitude;
      state.details.weatherLocation=[place.name,place.admin1].filter(Boolean).join(', ');
      $('weatherLocation').value=state.details.weatherLocation;
      saveState(); renderWeatherSummary();
      setWeatherStatus(`Location found: ${state.details.weatherLocation}.`);
      return true;
    }catch(error){ setWeatherStatus(`${error.message}. Check your connection or edit the location manually.`,true); return false; }
  }
  function getGps(){
    if(!navigator.geolocation){ setWeatherStatus('Location services are not supported on this device.',true); return; }
    setWeatherStatus('Requesting your current location…');
    navigator.geolocation.getCurrentPosition(async position=>{
      state.details.latitude=position.coords.latitude; state.details.longitude=position.coords.longitude;
      if(!state.details.weatherLocation) state.details.weatherLocation='Current GPS location';
      $('weatherLocation').value=state.details.weatherLocation;
      saveState();
      setWeatherStatus('GPS location recorded. Looking up weather…');
      await lookupWeather();
    },error=>{
      const message=error.code===1?'Location permission was not granted.':'Unable to retrieve your location.';
      setWeatherStatus(`${message} You can still search or enter the location manually.`,true);
    },{enableHighAccuracy:true,timeout:12000,maximumAge:300000});
  }
  function dateOffset(dateString, days){
    const [y,m,d]=String(dateString).split('-').map(Number);
    const dt=new Date(Date.UTC(y,m-1,d+days));
    return dt.toISOString().slice(0,10);
  }
  function localTodayString(){
    const now=new Date();
    const y=now.getFullYear(), m=String(now.getMonth()+1).padStart(2,'0'), d=String(now.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }
  async function fetchRainWindow(lat,lon,startDate,endDate,sourceType){
    const historical=sourceType==='historical';
    const base=historical?'https://archive-api.open-meteo.com/v1/archive':'https://api.open-meteo.com/v1/forecast';
    const params=new URLSearchParams({
      latitude:String(lat),longitude:String(lon),start_date:startDate,end_date:endDate,
      daily:'precipitation_sum',timezone:'auto'
    });
    const response=await fetch(`${base}?${params}`);
    if(!response.ok) throw new Error(`${historical?'Historical':'Forecast'} rainfall lookup failed`);
    const data=await response.json();
    const times=data.daily?.time||[];
    const values=data.daily?.precipitation_sum||[];
    return times.map((date,i)=>{
      const value=Number(values[i]);
      return {date,rain:Number.isFinite(value)?value:null,source:historical?'observed/historical':'forecast'};
    });
  }
  async function fetchPrevious72Rain(lat,lon,matchDate){
    const dates=[dateOffset(matchDate,-3),dateOffset(matchDate,-2),dateOffset(matchDate,-1)];
    const today=localTodayString();
    const pastDates=dates.filter(d=>d<today);
    const futureDates=dates.filter(d=>d>=today);
    let rows=[];
    if(pastDates.length){
      try{ rows.push(...await fetchRainWindow(lat,lon,pastDates[0],pastDates[pastDates.length-1],'historical')); }
      catch(_){ pastDates.forEach(date=>rows.push({date,rain:null,source:'unavailable'})); }
    }
    if(futureDates.length){
      try{ rows.push(...await fetchRainWindow(lat,lon,futureDates[0],futureDates[futureDates.length-1],'forecast')); }
      catch(_){ futureDates.forEach(date=>rows.push({date,rain:null,source:'forecast unavailable'})); }
    }
    const byDate=new Map(rows.map(r=>[r.date,r]));
    const days=dates.map(date=>byDate.get(date)||{date,rain:null,source:date<today?'unavailable':'forecast unavailable'});
    const available=days.filter(d=>Number.isFinite(d.rain));
    const complete=available.length===3;
    const total=available.reduce((sum,d)=>sum+d.rain,0);
    state.details.previous72Rain=complete?Number(total.toFixed(1)):null;
    state.details.previous72RainDays=days;
    const sources=[...new Set(available.map(d=>d.source))];
    state.details.previous72RainSource=sources.join(' + ');
    state.details.previous72RainComplete=complete;
    state.details.previous72RainLabel=days.every(d=>d.source==='forecast')?'Forecast rain previous 72 hrs':
      days.every(d=>d.source==='observed/historical')?'Observed rain previous 72 hrs':'Previous 72 hrs rain';
  }
  async function lookupWeather(){
    let lat=Number(state.details.latitude), lon=Number(state.details.longitude);
    if(!Number.isFinite(lat)||!Number.isFinite(lon)){
      const ok=await lookupLocation(); if(!ok) return false;
      lat=Number(state.details.latitude); lon=Number(state.details.longitude);
    }
    const date=state.details.date || new Date().toISOString().slice(0,10);
    setWeatherStatus(`Looking up weather for ${formatDate(date)||date}…`);
    try{
      const today=new Date(); today.setHours(0,0,0,0);
      const requested=new Date(`${date}T00:00:00`);
      const historical=requested < today;
      const base=historical?'https://archive-api.open-meteo.com/v1/archive':'https://api.open-meteo.com/v1/forecast';
      const daily=historical
        ? 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,wind_direction_10m_dominant'
        : 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant';
      const params=new URLSearchParams({latitude:String(lat),longitude:String(lon),start_date:date,end_date:date,daily,timezone:'auto'});
      const response=await fetch(`${base}?${params}`); if(!response.ok) throw new Error('Weather lookup failed');
      const data=await response.json();
      if(!data.daily?.time?.length) throw new Error('Weather is unavailable for this date');
      const max=data.daily.temperature_2m_max?.[0], min=data.daily.temperature_2m_min?.[0], speed=data.daily.wind_speed_10m_max?.[0], direction=data.daily.wind_direction_10m_dominant?.[0], rain=data.daily.precipitation_sum?.[0], chance=data.daily.precipitation_probability_max?.[0];
      state.details.temperature = Number.isFinite(max) ? `${Math.round(max)}°C max${Number.isFinite(min)?` / ${Math.round(min)}°C min`:''}` : '';
      state.details.weather = weatherCodeLabel(data.daily.weather_code?.[0]);
      state.details.wind = Number.isFinite(speed) ? `${windDirection(direction)} ${Math.round(speed)} km/h`.trim() : '';
      state.details.windSpeed = Number.isFinite(speed) ? Number(speed) : null;
      state.details.windDirection = Number.isFinite(direction) ? Number(direction) : null;
      state.details.rain = Number.isFinite(rain) ? `${Number(rain).toFixed(rain>=10?0:1)} mm` : '';
      state.details.rainChance = Number.isFinite(chance) ? `${Math.round(chance)}%` : '';
      await fetchPrevious72Rain(lat,lon,date);
      updateGroundCondition();
      state.details.weatherUpdated=new Date().toISOString();
      saveState(); renderWeatherSummary();
      setWeatherStatus(`Weather saved for ${formatDate(date)||date}. It remains available after the lookup.`);
      return true;
    }catch(error){ setWeatherStatus(`${error.message}. Forecasts may not be available far in advance; weather comments can still be entered manually.`,true); return false; }
  }
  function groundConditionEstimate(){
    const previous=Number(state.details.previous72Rain);
    const previousAvailable=Number.isFinite(previous) && state.details.previous72RainComplete!==false;
    const prev=previousAvailable?previous:0;
    const matchRain=parseFloat(state.details.rain)||0;
    const weather=(state.details.weather||'').toLowerCase();
    const labels=['Dry / firm','Damp','Wet / slippery','Wet / soft','Very wet / muddy'];
    let level=prev>40?4:prev>25?3:prev>10?2:prev>2?1:0;
    if(matchRain>=15) level+=2;
    else if(matchRain>=5) level+=1;
    else if(matchRain>=2 && level===0) level=1;
    if(/heavy rain|heavy showers|thunderstorm/.test(weather)) level=Math.max(level,2);
    else if(/rain|shower|drizzle/.test(weather)) level=Math.max(level,1);
    level=Math.min(4,level);
    if(!previousAvailable){
      return {label:'Forecast pending',note:'A complete rainfall forecast for the 72 hours before the match is not available yet. Ground condition will be estimated automatically once all three lead-in days are within the forecast window.'};
    }
    const label=labels[level];
    const prevText=`${previous.toFixed(previous>=10?0:1)} mm`;
    const matchText=`${matchRain.toFixed(matchRain>=10?0:1)} mm`;
    const leadLabel=state.details.previous72RainLabel||'Previous 72 hrs rain';
    const notes=[
      `${leadLabel}: ${prevText}. Match-day rainfall: ${matchText}.`,
      level===0?'Recent rainfall is low, so a generally firm surface is more likely.':
      level===1?'Moisture may make parts of the oval damp or slippery.':
      level===2?'Recent and/or match-day rain increases the likelihood of a wet, slippery surface.':
      level===3?'Rainfall levels increase the likelihood of a soft surface and muddy high-traffic areas.':
      'Heavy recent rainfall creates an elevated likelihood of very soft, muddy or locally waterlogged areas.'
    ];
    return {label,note:notes.join(' ')};
  }
  function updateGroundCondition(){
    if(!state.details.weather && !state.details.rain){
      state.details.groundCondition=''; state.details.groundConditionNote=''; return;
    }
    const estimate=groundConditionEstimate();
    state.details.groundCondition=estimate.label;
    state.details.groundConditionNote=estimate.note;
  }
  function renderWeatherSummary(){
    const el=$('weatherSummary');
    const parts=[];
    if(state.details.weatherLocation) parts.push(`📍 ${state.details.weatherLocation}`);
    if(state.details.temperature) parts.push(state.details.temperature);
    if(state.details.weather) parts.push(state.details.weather);
    if(state.details.wind) parts.push(`Wind ${state.details.wind}`);
    if(state.details.rain) parts.push(`Match-day rain ${state.details.rain}${state.details.rainChance?` (${state.details.rainChance})`:''}`);
    if(Number.isFinite(Number(state.details.previous72Rain))) parts.push(`Previous 72 hrs ${Number(state.details.previous72Rain).toFixed(Number(state.details.previous72Rain)>=10?0:1)} mm`);
    if(state.details.weatherComments) parts.push(`Comment: ${state.details.weatherComments}`);
    el.hidden=!parts.length;
    el.innerHTML=parts.map(escapeHtml).join(' &nbsp;•&nbsp; ');

    const ground=$('groundEstimate');
    if(ground){
      if(state.details.weather || state.details.rain){
        updateGroundCondition();
        ground.hidden=false;
        $('groundEstimateLabel').textContent=state.details.groundCondition||'—';
        $('groundEstimateNote').textContent=state.details.groundConditionNote||'';
        if($('previous72RainLabel')) $('previous72RainLabel').textContent=state.details.previous72RainLabel||'Previous 72 hrs rain';
        if($('previous72RainText')) $('previous72RainText').textContent=Number.isFinite(Number(state.details.previous72Rain))?`${Number(state.details.previous72Rain).toFixed(Number(state.details.previous72Rain)>=10?0:1)} mm`:'Forecast pending';
        if($('matchDayRainText')) $('matchDayRainText').textContent=state.details.rain||'0 mm';
      }else{
        ground.hidden=true;
      }
    }
  }
  function windDegreesFromText(value){
    const label=(String(value||'').trim().split(/\s+/)[0]||'').toUpperCase();
    const map={N:0,NNE:22.5,NE:45,ENE:67.5,E:90,ESE:112.5,SE:135,SSE:157.5,S:180,SSW:202.5,SW:225,WSW:247.5,W:270,WNW:292.5,NW:315,NNW:337.5};
    return Object.prototype.hasOwnProperty.call(map,label)?map[label]:null;
  }
  async function viewGroundConditions(){
    // Open the tab immediately from the button click so browser pop-up
    // protection does not block it while location/weather are being resolved.
    const opened=window.open('about:blank','_blank');
    if(!opened){
      setWeatherStatus('Your browser blocked the Ground Conditions tab. Allow pop-ups for this site and try again.',true);
      return;
    }
    try{
      opened.document.title='AFL Ground Conditions';
      opened.document.body.innerHTML='<div style="font-family:system-ui;background:#07172c;color:white;min-height:100vh;margin:0;display:grid;place-items:center"><div style="text-align:center"><strong style="font-size:20px">AFL Ground Conditions</strong><div style="margin-top:8px;color:#b9c9dd">Loading map and wind conditions…</div></div></div>';
    }catch(_){ /* The final page will replace this temporary content. */ }

    let lat=Number(state.details.latitude), lon=Number(state.details.longitude);
    if(!Number.isFinite(lat)||!Number.isFinite(lon)){
      const ok=await lookupLocation();
      if(!ok){ try{opened.close();}catch(_){} return; }
      lat=Number(state.details.latitude); lon=Number(state.details.longitude);
    }
    if(!state.details.weather && !state.details.wind) await lookupWeather();

    const rawWindDir=state.details.windDirection;
    const windDir=(rawWindDir!==null && rawWindDir!=='' && Number.isFinite(Number(rawWindDir)))
      ? Number(rawWindDir)
      : windDegreesFromText(state.details.wind);
    const rawWindSpeed=state.details.windSpeed;
    let windSpeed=(rawWindSpeed!==null && rawWindSpeed!=='' && Number.isFinite(Number(rawWindSpeed))) ? Number(rawWindSpeed) : NaN;
    if(!Number.isFinite(windSpeed)){
      const m=String(state.details.wind||'').match(/([0-9]+(?:\.[0-9]+)?)\s*km\/h/i);
      windSpeed=m?Number(m[1]):0;
    }
    const url=new URL('./groundconditions.html',window.location.href);
    const values={
      lat:String(lat),lon:String(lon),
      venue:state.details.location||state.details.weatherLocation||'',
      location:state.details.weatherLocation||state.details.location||'',
      date:state.details.date||'',time:state.details.time||''
    };
    Object.entries(values).forEach(([key,value])=>url.searchParams.set(key,value));
    opened.location.href=url.toString();
  }

  function normaliseBoardCode(value='') {
    return String(value).toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);
  }

  function boardInviteUrl(code=state.boardId) {
    const cleanCode=normaliseBoardCode(code);
    if(cleanCode.length!==6) return '';
    const url=new URL(window.location.href);
    url.search='';
    url.hash='';
    url.searchParams.set('board',cleanCode);
    return url.toString();
  }

  function clearInviteFromUrl() {
    inviteBoardCode='';
    try{
      const url=new URL(window.location.href);
      if(url.searchParams.has('board')){
        url.searchParams.delete('board');
        history.replaceState(null,'',`${url.pathname}${url.search}${url.hash}`);
      }
    }catch(_){ }
  }

  function applyInviteFromUrl() {
    let code='';
    try{ code=normaliseBoardCode(new URL(window.location.href).searchParams.get('board') || ''); }
    catch(_){ code=''; }
    if(code.length!==6 || (state.mode==='shared' && state.boardId)) return;
    inviteBoardCode=code;
    if($('joinBoardCode')) $('joinBoardCode').value=code;
    if($('createBoardSection')) $('createBoardSection').hidden=true;
    if($('joinBoardCodeSection')) $('joinBoardCodeSection').hidden=true;
    if($('shareLocalHeading')) $('shareLocalHeading').textContent='Join Shared Board';
    if($('shareLocalIntro')) $('shareLocalIntro').innerHTML=`Board <strong>${escapeHtml(code)}</strong> is ready to join. Enter the 4-digit Coach PIN.`;
    if($('joinBoardPin')){
      $('joinBoardPin').placeholder='Enter Coach PIN';
      setTimeout(()=>$('joinBoardPin')?.focus(),50);
    }
  }

  function resetInviteJoinUi() {
    if(inviteBoardCode) return;
    if($('createBoardSection')) $('createBoardSection').hidden=false;
    if($('joinBoardCodeSection')) $('joinBoardCodeSection').hidden=false;
    if($('shareLocalHeading')) $('shareLocalHeading').textContent='Share with coaches';
    if($('shareLocalIntro')) $('shareLocalIntro').innerHTML='Create a live board or join one from another device. Shared boards are automatically deleted after <strong>30 days without activity</strong>.';
    if($('joinBoardPin')) $('joinBoardPin').placeholder='4 digits';
  }

  function setShareMessage(message='', type='') {
    const el=$('shareStatusMessage');
    if(!el) return;
    el.textContent=message || '';
    el.className=`share-status${type?` ${type}`:''}`;
  }

  function renderShare(){
    const shared=state.mode==='shared' && Boolean(state.boardId);
    if($('shareLocalPanel')) $('shareLocalPanel').hidden=shared;
    if($('shareActivePanel')) $('shareActivePanel').hidden=!shared;
    if(!shared) resetInviteJoinUi();
    const pill=$('boardStatusPill');
    if(pill){
      pill.className='status-pill';
      if(!shared){ pill.classList.add('local'); pill.textContent='LOCAL BOARD'; }
      else if(shareStatus.connection==='live'){ pill.classList.add('shared'); pill.textContent=`SHARED · ${state.boardId}`; }
      else if(shareStatus.connection==='offline'){ pill.classList.add('offline'); pill.textContent=`OFFLINE · ${state.boardId}`; }
      else { pill.classList.add('reconnecting'); pill.textContent=`CONNECTING · ${state.boardId}`; }
    }
    if(!shared) return;
    if($('activeBoardCode')) $('activeBoardCode').textContent=state.boardId || '------';
    const count=Math.max(shareStatus.connectedCount || 0, shareStatus.connection==='live'?1:0);
    if($('connectedCoachCount')) $('connectedCoachCount').textContent=`${count} coach${count===1?'':'es'} connected`;
    const label=$('shareConnectionLabel'), dot=$('shareLiveDot');
    if(label){
      label.textContent=shareStatus.connection==='live'?'LIVE':shareStatus.connection==='offline'?'OFFLINE':'RECONNECTING';
    }
    if(dot){
      dot.className='share-live-dot';
      if(shareStatus.connection==='live') dot.classList.add('live');
      if(shareStatus.connection==='offline') dot.classList.add('offline');
    }
    if(shareStatus.message) setShareMessage(shareStatus.message, shareStatus.connection==='live'?'success':'');
  }

  function setShareBusy(busy){
    ['createBoardBtn','joinBoardBtn','leaveBoardBtn','shareBoardLinkBtn'].forEach(id=>{ if($(id)) $(id).disabled=busy; });
  }

  async function createSharedBoard(){
    const pin=String($('sharePin')?.value || '').trim();
    if(!/^\d{4}$/.test(pin)){ setShareMessage('Enter a 4-digit Coach PIN.','error'); return; }
    setShareBusy(true); setShareMessage('Creating shared board…');
    try{
      const result=await syncAdapter.createBoard(pin,snapshot());
      state.boardId=result.code;
      state.mode='shared';
      saveState({publish:false});
      if($('sharePin')) $('sharePin').value='';
      setShareMessage(`Board ${result.code} created. Share the code and PIN with your coaches.`,'success');
      renderShare();
    }catch(error){ setShareMessage(error.message || 'Could not create board.','error'); }
    finally{ setShareBusy(false); }
  }

  async function joinSharedBoard(){
    const code=normaliseBoardCode(inviteBoardCode || $('joinBoardCode')?.value || '');
    const pin=String($('joinBoardPin')?.value || '').trim();
    if(code.length!==6){ setShareMessage('Enter the 6-character Board Code.','error'); return; }
    if(!/^\d{4}$/.test(pin)){ setShareMessage('Enter the 4-digit Coach PIN.','error'); return; }
    setShareBusy(true); setShareMessage(`Joining ${code}…`);
    try{
      const result=await syncAdapter.joinBoard(code,pin);
      if(result.state) mergeRemoteState(result.state);
      state.boardId=code; state.mode='shared';
      saveState({publish:false}); renderAll();
      if($('joinBoardPin')) $('joinBoardPin').value='';
      clearInviteFromUrl();
      setShareMessage(`Joined board ${code}.`,'success');
    }catch(error){ setShareMessage(error.message || 'Could not join board.','error'); }
    finally{ setShareBusy(false); }
  }

  async function leaveSharedBoard(){
    if(!confirm('Leave this shared board on this device? The shared board will remain available to other coaches.')) return;
    await syncAdapter.disconnect({clearSession:true});
    state.boardId=null; state.mode='local';
    saveState({publish:false});
    shareStatus={mode:'local',connection:'local',connectedCount:0,message:''};
    setShareMessage('Returned to Local Board.','success');
    renderShare();
  }

  async function copyBoardCode(){
    if(!state.boardId) return;
    try{ await navigator.clipboard.writeText(state.boardId); setShareMessage(`Board code ${state.boardId} copied.`,'success'); }
    catch(_){ setShareMessage(`Board code: ${state.boardId}`,'success'); }
  }

  async function shareBoardLink(){
    if(!state.boardId) return;
    const url=boardInviteUrl(state.boardId);
    if(!url){ setShareMessage('Could not create the board link.','error'); return; }
    const shareData={
      title:'AFL Coaches Whiteboard',
      text:`Join AFL Coaches Whiteboard ${state.boardId}. You will need the Coach PIN.`,
      url
    };
    try{
      if(navigator.share){
        await navigator.share(shareData);
        setShareMessage('Board sharing opened.','success');
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareMessage('Board link copied. Send it to your coaches; they will only need the PIN.','success');
    }catch(error){
      if(error?.name==='AbortError') return;
      try{
        await navigator.clipboard.writeText(url);
        setShareMessage('Board link copied. Send it to your coaches; they will only need the PIN.','success');
      }catch(_){ setShareMessage(`Share this link: ${url}`,'success'); }
    }
  }

  function resetAll(){
    if(!confirm('Reset all match details, team list, weather, notes and whiteboard positions?')) return;
    state=defaultState(); saveState(); renderAll(); setTeamListStatus(''); setWeatherStatus(''); setTab('setup');
  }
  function mergeRemoteState(remote){
    if(!remote || typeof remote!=='object') return;
    state={...state,...remote,benchCount:Math.max(DEFAULT_BENCH_COUNT,Math.min(MAX_BENCH_COUNT,Number(remote.benchCount||state.benchCount)||DEFAULT_BENCH_COUNT)),details:{...state.details,...(remote.details||{})},assignments:{...state.assignments,...(remote.assignments||{})},magnets:{...state.magnets,...(remote.magnets||{})},magnetNextNumber:{...state.magnetNextNumber,...(remote.magnetNextNumber||{})},roster:Array.isArray(remote.roster)?remote.roster.filter(Boolean).map(cleanRosterPlayer):state.roster};
    saveState({publish:false}); renderAll();
  }
  function renderAll(){
    renderSetupDetails(); renderTeamList(); renderPlayerOptions(); renderPositions(); renderBench(); renderInfo(); renderNotes(); renderNotesVisibility(); renderDuplicateWarnings(); renderWeatherSummary(); renderShare(); renderMagnetPalette(); renderMagnetPaletteVisibility();
  }
  function registerServiceWorker(){
    if('serviceWorker' in navigator && location.protocol!=='file:') navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).catch(()=>{});
  }

  document.addEventListener('DOMContentLoaded', async()=>{
    renderAll(); applyInviteFromUrl(); bindDetails(); bindBoardTitle(); bindNotes();
    document.querySelectorAll('[data-magnet-color]').forEach(btn=>btn.addEventListener('click',()=>setActiveMagnetColor(activeMagnetColor===btn.dataset.magnetColor ? '' : btn.dataset.magnetColor)));
    $('magnetsToggleBtn')?.addEventListener('click',()=>setMagnetsCollapsed(!magnetsCollapsed));
    $('notesToggleBtn')?.addEventListener('click',()=>setNotesVisible(!notesVisible));
    $('addBenchBtn')?.addEventListener('click',addBenchPosition);
    document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>setTab(btn.dataset.tab)));
    $('editSetupBtn').addEventListener('click',()=>setTab('setup'));
    $('goWhiteboardBtn').addEventListener('click',()=>setTab('whiteboard'));
    $('saveTeamListBtn').addEventListener('click',saveTeamList);
    $('clearRosterBtn').addEventListener('click',clearRoster);
    $('lookupLocationBtn').addEventListener('click',lookupLocation);
    $('getGpsBtn').addEventListener('click',getGps);
    $('lookupWeatherBtn').addEventListener('click',lookupWeather);
    $('viewGroundBtn').addEventListener('click',viewGroundConditions);
    $('resetAllBtn').addEventListener('click',resetAll);
    $('createBoardBtn').addEventListener('click',createSharedBoard);
    $('joinBoardBtn').addEventListener('click',joinSharedBoard);
    $('leaveBoardBtn').addEventListener('click',leaveSharedBoard);
    $('copyBoardCodeBtn').addEventListener('click',copyBoardCode);
    $('shareBoardLinkBtn').addEventListener('click',shareBoardLink);
    $('joinBoardCode').addEventListener('input',e=>{ e.target.value=normaliseBoardCode(e.target.value); });
    ['sharePin','joinBoardPin'].forEach(id=>$(id).addEventListener('input',e=>{ e.target.value=e.target.value.replace(/\D/g,'').slice(0,4); }));
    syncAdapter.subscribe(mergeRemoteState);
    if(syncAdapter.onStatus) syncAdapter.onStatus(status=>{ shareStatus=status; renderShare(); });
    const connection=await syncAdapter.connect().catch(()=>null);
    if(connection?.expired && state.mode==='shared'){ state.mode='local'; state.boardId=null; saveState({publish:false}); renderShare(); }
    registerServiceWorker();
  });
})();
