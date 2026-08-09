(() => {
  'use strict';

  const STORAGE_KEY = 'afl-coaches-whiteboard-v1';
  const MAX_PLAYERS = 50;

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

  const BENCH = [
    { id:'bench1', label:'Interchange 1' },
    { id:'bench2', label:'Interchange 2' },
    { id:'bench3', label:'Interchange 3' },
    { id:'bench4', label:'Interchange 4' }
  ];

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
      weatherComments:'', weatherUpdated:''
    };
  }

  function defaultState(){
    const assignments = {};
    POSITIONS.forEach(p => assignments[p.id] = { playerId:'', text:'' });
    BENCH.forEach(p => assignments[p.id] = { playerId:'', text:'' });
    return {
      schemaVersion:3,
      boardId:null,
      mode:'local',
      details:defaultDetails(),
      roster:[],
      teamListText:'',
      assignments,
      updatedAt:new Date().toISOString()
    };
  }

  function loadState(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return defaultState();
      const parsed = JSON.parse(raw);
      const base = defaultState();
      return {
        ...base,
        ...parsed,
        schemaVersion:3,
        details:{...base.details, ...(parsed.details || {})},
        assignments:{...base.assignments, ...(parsed.assignments || {})},
        roster:Array.isArray(parsed.roster) ? parsed.roster.filter(Boolean) : []
      };
    }catch(err){
      console.warn('Could not load saved whiteboard state.', err);
      return defaultState();
    }
  }

  let state = loadState();

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
  function playerDisplay(player){
    if(!player) return '';
    const name=[player.firstName,player.surname].filter(Boolean).join(' ').trim();
    if(player.number && name) return `#${player.number} ${name}`;
    if(player.number) return `#${player.number}`;
    return name;
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

  function renderPlayerOptions(){
    $('playerOptions').innerHTML = activePlayers()
      .slice()
      .sort((a,b)=>Number(a.number||9999)-Number(b.number||9999) || playerDisplay(a).localeCompare(playerDisplay(b)))
      .map(p=>`<option value="${escapeHtml(playerDisplay(p))}"></option>`).join('');
  }

  function renderPositions(){
    const layer=$('positionLayer');
    layer.innerHTML = POSITIONS.map(pos=>`
      <div class="position-node" data-position-node="${pos.id}" style="left:${pos.x}%; top:${pos.y}%;">
        <label class="position-role" for="pos_${pos.id}" title="${escapeHtml(pos.label)}">${pos.role}</label>
        <input id="pos_${pos.id}" class="position-input" type="text" list="playerOptions" autocomplete="off" aria-label="${escapeHtml(pos.label)} player" placeholder="Player" data-assignment="${pos.id}" value="${escapeHtml(assignmentDisplay(state.assignments[pos.id]))}" />
      </div>`).join('');
    layer.querySelectorAll('[data-assignment]').forEach(input=>{
      input.addEventListener('change', onAssignmentChange);
      input.addEventListener('blur', onAssignmentChange);
    });
  }

  function renderBench(){
    $('benchGrid').innerHTML = BENCH.map(slot=>`
      <div class="bench-slot" data-bench-node="${slot.id}">
        <label for="bench_${slot.id}">${slot.label}</label>
        <input id="bench_${slot.id}" type="text" list="playerOptions" autocomplete="off" placeholder="Player" data-assignment="${slot.id}" value="${escapeHtml(assignmentDisplay(state.assignments[slot.id]))}" />
      </div>`).join('');
    $('benchGrid').querySelectorAll('[data-assignment]').forEach(input=>{
      input.addEventListener('change', onAssignmentChange);
      input.addEventListener('blur', onAssignmentChange);
    });
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
    if(document.activeElement !== textarea) textarea.value=state.teamListText || serializeRoster();
    $('rosterCount').textContent=`${activePlayers().length}/${MAX_PLAYERS} loaded`;
  }
  function setTeamListStatus(message,isError=false){
    const el=$('teamListStatus'); el.textContent=message||''; el.classList.toggle('error',Boolean(isError));
  }

  function parseTeamList(text){
    const lines=String(text||'').split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
    const players=[];
    const skipped=[];
    for(const raw of lines){
      if(/^#?teamlist$/i.test(raw)) continue;
      if(/^(number|no\.?|player\s*number)[,\t ]/i.test(raw)) continue;
      let number='', firstName='', surname='';
      // CSV / TSV / semicolon format
      if(/[\t,;]/.test(raw)){
        const delimiter=raw.includes('\t')?'\t':raw.includes(',')?',':';';
        const parts=raw.split(delimiter).map(s=>s.trim()).filter((s,i)=>i<3 || s);
        number=normalizeNumber(parts[0]);
        if(/^\d+[a-z]?$/i.test(number)){
          firstName=parts[1]||'';
          surname=parts.slice(2).join(' ').trim();
        }
      }
      // PlayHQ/plain text formats: 12 Jack Campbell / 12. Jack Campbell / #12 Jack Campbell
      if(!number || !/^\d+[a-z]?$/i.test(number)){
        const m=raw.match(/^#?([0-9]+[A-Za-z]?)\s*[.):-]?\s+(.+)$/);
        if(m){
          number=normalizeNumber(m[1]);
          const name=m[2].trim().replace(/\s+/g,' ');
          const bits=name.split(' ');
          firstName=bits.shift()||'';
          surname=bits.join(' ');
        }else{
          const only=raw.match(/^#?([0-9]+[A-Za-z]?)$/);
          if(only) number=normalizeNumber(only[1]);
        }
      }
      if(!number || !/^\d+[a-z]?$/i.test(number)){ skipped.push(raw); continue; }
      players.push({ number, firstName, surname });
      if(players.length>=MAX_PLAYERS) break;
    }
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
      state.details.rain = Number.isFinite(rain) ? `${Number(rain).toFixed(rain>=10?0:1)} mm` : '';
      state.details.rainChance = Number.isFinite(chance) ? `${Math.round(chance)}%` : '';
      state.details.weatherUpdated=new Date().toISOString();
      saveState(); renderWeatherSummary();
      setWeatherStatus(`Weather saved for ${formatDate(date)||date}. It remains available after the lookup.`);
      return true;
    }catch(error){ setWeatherStatus(`${error.message}. Forecasts may not be available far in advance; weather comments can still be entered manually.`,true); return false; }
  }
  function renderWeatherSummary(){
    const el=$('weatherSummary');
    const parts=[];
    if(state.details.weatherLocation) parts.push(`📍 ${state.details.weatherLocation}`);
    if(state.details.temperature) parts.push(state.details.temperature);
    if(state.details.weather) parts.push(state.details.weather);
    if(state.details.wind) parts.push(`Wind ${state.details.wind}`);
    if(state.details.rain) parts.push(`Rain ${state.details.rain}${state.details.rainChance?` (${state.details.rainChance})`:''}`);
    if(state.details.weatherComments) parts.push(`Comment: ${state.details.weatherComments}`);
    el.hidden=!parts.length;
    el.innerHTML=parts.map(escapeHtml).join(' &nbsp;•&nbsp; ');
  }
  function groundConditionEstimate(){
    const rain=parseFloat(state.details.rain)||0;
    const weather=(state.details.weather||'').toLowerCase();
    let label='Dry / firm', note='Little rainfall is recorded in the saved weather.';
    if(rain>=20){ label='Very wet / soft', note='High rainfall may produce a soft or waterlogged surface.'; }
    else if(rain>=8){ label='Wet', note='Rainfall suggests a wet surface and reduced traction.'; }
    else if(rain>=2 || /rain|shower|drizzle|storm/.test(weather)){ label='Damp / slippery', note='Some moisture is likely on the surface.'; }
    return {label,note};
  }
  async function viewGroundConditions(){
    if(!state.details.weather && !state.details.rain){
      const ok=await lookupWeather(); if(!ok) return;
    }
    const estimate=groundConditionEstimate();
    $('groundModalBody').innerHTML=`
      <div class="ground-condition"><div><strong>${escapeHtml(estimate.label)}</strong><span>${escapeHtml(estimate.note)}</span></div></div>
      <div class="ground-weather-grid">
        <div><span>Location</span><strong>${escapeHtml(state.details.weatherLocation||'—')}</strong></div>
        <div><span>Date</span><strong>${escapeHtml(formatDate(state.details.date || new Date().toISOString().slice(0,10)))}</strong></div>
        <div><span>Weather</span><strong>${escapeHtml(state.details.weather||'—')}</strong></div>
        <div><span>Temperature</span><strong>${escapeHtml(state.details.temperature||'—')}</strong></div>
        <div><span>Rain</span><strong>${escapeHtml(state.details.rain||'—')} ${state.details.rainChance?`(${escapeHtml(state.details.rainChance)})`:''}</strong></div>
        <div><span>Wind</span><strong>${escapeHtml(state.details.wind||'—')}</strong></div>
      </div>`;
    $('groundModal').hidden=false;
  }
  function closeGroundModal(){ $('groundModal').hidden=true; }

  function resetAll(){
    if(!confirm('Reset all match details, team list, weather and whiteboard positions?')) return;
    state=defaultState(); saveState(); renderAll(); setTeamListStatus(''); setWeatherStatus(''); setTab('setup');
  }
  function mergeRemoteState(remote){
    if(!remote || typeof remote!=='object') return;
    state={...state,...remote,details:{...state.details,...(remote.details||{})},assignments:{...state.assignments,...(remote.assignments||{})}};
    saveState({publish:false}); renderAll();
  }
  function renderAll(){
    renderSetupDetails(); renderTeamList(); renderPlayerOptions(); renderPositions(); renderBench(); renderInfo(); renderDuplicateWarnings(); renderWeatherSummary();
  }
  function registerServiceWorker(){
    if('serviceWorker' in navigator && location.protocol!=='file:') navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).catch(()=>{});
  }

  document.addEventListener('DOMContentLoaded', async()=>{
    renderAll(); bindDetails();
    document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>setTab(btn.dataset.tab)));
    $('editSetupBtn').addEventListener('click',()=>setTab('setup'));
    $('goWhiteboardBtn').addEventListener('click',()=>setTab('whiteboard'));
    $('saveTeamListBtn').addEventListener('click',saveTeamList);
    $('clearRosterBtn').addEventListener('click',clearRoster);
    $('lookupLocationBtn').addEventListener('click',lookupLocation);
    $('getGpsBtn').addEventListener('click',getGps);
    $('lookupWeatherBtn').addEventListener('click',lookupWeather);
    $('viewGroundBtn').addEventListener('click',viewGroundConditions);
    $('closeGroundModal').addEventListener('click',closeGroundModal);
    $('groundModal').addEventListener('click',event=>{ if(event.target===$('groundModal')) closeGroundModal(); });
    document.addEventListener('keydown',event=>{ if(event.key==='Escape' && !$('groundModal').hidden) closeGroundModal(); });
    $('resetAllBtn').addEventListener('click',resetAll);
    syncAdapter.subscribe(mergeRemoteState);
    await syncAdapter.connect().catch(()=>null);
    registerServiceWorker();
  });
})();
