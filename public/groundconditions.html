<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AFL Ground Conditions</title>
  <meta name="theme-color" content="#071a33" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    :root{--navy:#061a33;--panel:rgba(4,12,24,.88);--cyan:#31c9f4;--white:#fff;--muted:#cad5e3;--red:#ef2b2d}
    *{box-sizing:border-box} html,body{margin:0;width:100%;height:100%;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#061a33;color:#fff}
    #map{position:fixed;inset:0;background:#0b213b}
    .top-panel{position:fixed;z-index:700;top:18px;left:18px;width:min(340px,calc(100vw - 36px));padding:13px 14px 14px;border-radius:15px;background:var(--panel);border:1px solid rgba(255,255,255,.2);box-shadow:0 10px 28px rgba(0,0,0,.34);backdrop-filter:blur(9px);transition:width .18s ease,padding .18s ease}
    .panel-toggle{position:absolute;right:7px;top:7px;width:27px;height:27px;border:0;border-radius:8px;background:rgba(255,255,255,.12);color:#fff;font-size:16px;line-height:1;cursor:pointer;display:grid;place-items:center;z-index:2}
    .panel-toggle:active{transform:scale(.96)}
    .top-panel .venue{padding-right:35px}.top-panel.collapsed{width:auto;min-width:205px;padding:11px 14px}.top-panel.collapsed .panel-details{display:none}.top-panel.collapsed .venue{margin:0;padding-right:35px;font-size:20px;white-space:nowrap}
    .venue{margin:0 0 4px;font-size:23px;line-height:1.05;font-weight:900;letter-spacing:.02em;text-transform:uppercase}.sub{font-size:13px;color:#fff;margin-bottom:8px}.temp-row{display:flex;align-items:end;gap:8px;margin-bottom:8px}.temp{font-size:34px;line-height:1;font-weight:900}.feels{font-size:12px;color:var(--muted);padding-bottom:3px}.metric-row{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;margin-top:4px}.wind-line{font-size:14px;margin-top:8px;font-weight:800}.wind-line span{color:var(--cyan)}
    .controls{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto;gap:7px;margin-top:10px}.controls label{font-size:9px;color:var(--muted);display:block;margin-bottom:3px}.controls input{width:100%;border-radius:8px;border:1px solid rgba(255,255,255,.25);background:#fff;color:#111827;padding:7px;font-size:11px}.controls button{align-self:end;border:0;border-radius:8px;background:#fff;color:#071a33;font-weight:800;padding:8px 12px;font-size:11px;cursor:pointer;white-space:nowrap}
    .status{margin-top:8px;font-size:11px;color:var(--muted)}.status.error{color:#ffb4b4}
    .conditions-row{display:flex;align-items:center;gap:8px;margin-bottom:7px}.weather-icon{font-size:24px;line-height:1;filter:drop-shadow(0 2px 2px rgba(0,0,0,.35))}.conditions{font-size:14px;font-weight:700;margin:0}
    .compass-wrap{position:fixed;z-index:700;right:24px;top:24px;width:160px;text-align:center;pointer-events:none}
    .compass{position:relative;width:160px;height:160px;border:2px solid rgba(255,255,255,.75);border-radius:50%;background:rgba(5,11,19,.86);box-shadow:0 8px 24px rgba(0,0,0,.35)}
    .compass span{position:absolute;font-weight:800;font-size:18px}.compass .n{top:10px;left:50%;transform:translateX(-50%)}.compass .s{bottom:10px;left:50%;transform:translateX(-50%)}.compass .w{left:13px;top:50%;transform:translateY(-50%)}.compass .e{right:13px;top:50%;transform:translateY(-50%)}
    .compass-arrow{position:absolute;left:50%;top:50%;width:92px;height:8px;background:var(--cyan);border-radius:99px;transform-origin:4px 4px;transform:translate(0,-4px) rotate(135deg)}.compass-arrow:after{content:"";position:absolute;right:-3px;top:-8px;border-left:18px solid var(--cyan);border-top:12px solid transparent;border-bottom:12px solid transparent}
    .compass-speed{display:inline-block;margin-top:8px;background:rgba(5,11,19,.86);color:#fff;border:1px solid rgba(255,255,255,.65);border-radius:999px;padding:5px 12px;font-size:17px;font-weight:900;box-shadow:0 4px 14px rgba(0,0,0,.3)}
    .wind-overlay{position:fixed;z-index:650;left:30%;top:50%;width:min(24vw,280px);height:110px;transform:translate(-50%,-50%);pointer-events:none;filter:drop-shadow(0 3px 3px rgba(0,0,0,.65));--wind-scale:1}.wind-overlay svg{width:100%;height:100%;overflow:visible;transform:scale(var(--wind-scale));transform-origin:50% 50%;transition:transform .12s ease}.wind-group{transform-origin:50% 50%}.wind-controls{display:flex;justify-content:center;gap:5px;margin-top:6px;pointer-events:auto;white-space:nowrap}.wind-control{width:30px;height:30px;border:1px solid rgba(255,255,255,.72);border-radius:50%;background:rgba(5,11,19,.88);color:#fff;font-size:17px;font-weight:900;display:grid;place-items:center;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,.35);line-height:1}.wind-control:active{transform:scale(.95)}
    .map-note{position:fixed;z-index:700;right:12px;bottom:8px;padding:5px 8px;border-radius:6px;background:rgba(0,0,0,.66);font-size:11px;color:#fff}
    .leaflet-control-zoom{margin-top:205px!important}
    @media(max-width:720px){.top-panel{top:10px;left:10px;width:min(320px,calc(100vw - 20px));padding:12px 13px}.venue{font-size:21px}.compass-wrap{width:112px;right:12px;top:12px}.compass{width:112px;height:112px}.compass span{font-size:14px}.compass-arrow{width:62px;height:6px;transform-origin:3px 3px}.compass-arrow:after{top:-6px;border-left-width:14px;border-top-width:9px;border-bottom-width:9px}.compass-speed{font-size:14px;padding:4px 10px}.leaflet-control-zoom{margin-top:265px!important}.controls{grid-template-columns:1fr 1fr}.controls button{grid-column:1/-1}.wind-overlay{left:30%;top:50%;width:min(38vw,245px);height:105px}.wind-controls{margin-top:5px}.wind-control{width:28px;height:28px}}

    @media (orientation: landscape){.wind-overlay{left:30%;}}
  </style>
</head>
<body>
  <div id="map" aria-label="North-up satellite map"></div>
  <section class="top-panel" id="infoPanel" aria-live="polite">
    <button class="panel-toggle" id="panelToggle" type="button" aria-label="Collapse weather information" aria-expanded="true">▲</button>
    <h1 class="venue" id="venueName">GROUND CONDITIONS</h1>
    <div class="panel-details">
      <div class="sub" id="dateTimeLine">Loading location…</div>
      <div class="conditions-row"><span class="weather-icon" id="weatherIcon" aria-hidden="true">⛅</span><div class="conditions" id="conditionsLine">Loading weather…</div></div>
      <div class="temp-row"><div class="temp" id="temperature">--°C</div><div class="feels" id="feelsLike"></div></div>
      <div class="metric-row"><div id="rainMetric"></div><div id="humidityMetric"></div></div>
      <div class="wind-line" id="windLine">WIND <span>--</span></div>
      <div class="controls">
        <div><label for="dateInput">Date</label><input id="dateInput" type="date"></div>
        <div><label for="timeInput">Time</label><input id="timeInput" type="time" step="900"></div>
        <button id="refreshBtn" type="button">Refresh</button>
      </div>
      <div class="status" id="statusText"></div>
    </div>
  </section>

  <div class="compass-wrap">
    <div class="compass" aria-label="Compass showing north at top">
      <span class="n">N</span><span class="e">E</span><span class="s">S</span><span class="w">W</span>
      <div class="compass-arrow" id="compassArrow"></div>
    </div>
    <div class="compass-speed" id="speedBadge">-- km/h</div>
    <div class="wind-controls" aria-label="Wind arrow controls"><button class="wind-control" id="windPlus" type="button" aria-label="Increase wind arrow size">+</button><button class="wind-control" id="windMinus" type="button" aria-label="Decrease wind arrow size">−</button><button class="wind-control" id="windClose" type="button" aria-label="Hide wind arrows">×</button></div>
  </div>

  <div class="wind-overlay" id="windOverlay" aria-hidden="true">
    <svg viewBox="0 0 900 300" role="img" aria-label="Wind direction arrows">
      <defs>
        <linearGradient id="windGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#31c9f4" stop-opacity="0.72"/>
          <stop offset="72%" stop-color="#66daf8" stop-opacity="0.82"/>
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0.92"/>
        </linearGradient>
      </defs>
      <g class="wind-group" id="windGroup">
        <path class="wind-arrow-shape" d="M150 54 L650 46 L650 28 L760 68 L650 108 L650 90 L150 82 Z" fill="url(#windGradient)" stroke="rgba(2,26,51,.75)" stroke-width="3"/>
        <path class="wind-arrow-shape" d="M110 136 L610 128 L610 110 L720 150 L610 190 L610 172 L110 164 Z" fill="url(#windGradient)" stroke="rgba(2,26,51,.75)" stroke-width="3"/>
        <path class="wind-arrow-shape" d="M70 218 L570 210 L570 192 L680 232 L570 272 L570 254 L70 246 Z" fill="url(#windGradient)" stroke="rgba(2,26,51,.75)" stroke-width="3"/>
      </g>
    </svg>
  </div>
  <div class="map-note">Satellite imagery © Esri and contributors • Weather: Open-Meteo</div>

  <script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const $ = (id) => document.getElementById(id);
    const qs = new URLSearchParams(location.search);
    const initialVenue = (qs.get('venue') || qs.get('location') || 'Ground Conditions').trim();
    let lat = Number(qs.get('lat'));
    let lon = Number(qs.get('lon'));
    let map;
    let marker;

    function localIsoDate(){const d=new Date();const off=d.getTimezoneOffset()*60000;return new Date(d.getTime()-off).toISOString().slice(0,10)}
    function currentHm(){const d=new Date();return `${String(d.getHours()).padStart(2,'0')}:${String(Math.round(d.getMinutes()/15)*15%60).padStart(2,'0')}`}
    function compassDir(deg){const dirs=['N','NE','E','SE','S','SW','W','NW'];const n=Number(deg);return Number.isFinite(n)?dirs[Math.round(((n%360)+360)%360/45)%8]:'--'}
    function oppositeDir(deg){return compassDir(Number(deg)+180)}
    function weatherLabel(code){const c=Number(code);if(c===0)return 'CLEAR';if([1,2].includes(c))return 'PARTLY CLOUDY';if(c===3)return 'CLOUDY';if([45,48].includes(c))return 'FOG';if([51,53,55,56,57].includes(c))return 'DRIZZLE';if([61,63,65,66,67].includes(c))return 'RAIN';if([71,73,75,77].includes(c))return 'SNOW';if([80,81,82].includes(c))return 'SHOWERS';if([85,86].includes(c))return 'SNOW SHOWERS';if([95,96,99].includes(c))return 'THUNDERSTORMS';return 'WEATHER';}
    function weatherIcon(code){const c=Number(code);if(c===0)return '☀️';if([1,2].includes(c))return '🌤️';if(c===3)return '☁️';if([45,48].includes(c))return '🌫️';if([51,53,55,56,57].includes(c))return '🌦️';if([61,63,65,66,67,80,81,82].includes(c))return '🌧️';if([71,73,75,77,85,86].includes(c))return '❄️';if([95,96,99].includes(c))return '⛈️';return '🌤️';}
    function formatDay(dateStr){const d=new Date(`${dateStr}T12:00:00`);return d.toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short',year:'numeric'}).toUpperCase()}
    function compactLocation(label){
      const stateMap={'South Australia':'SA','Victoria':'VIC','New South Wales':'NSW','Queensland':'QLD','Western Australia':'WA','Tasmania':'TAS','Northern Territory':'NT','Australian Capital Territory':'ACT'};
      let parts=String(label||'').split(',').map(x=>x.trim()).filter(Boolean);
      parts=parts.filter(x=>x.toLowerCase()!=='australia');
      parts=parts.map(x=>stateMap[x]||x.replace(/^The Barossa Council$/i,'Barossa'));
      // Keep a concise locality / region / state label when a geocoder returns a long address.
      if(parts.length>3){
        const stateIndex=parts.findIndex(x=>Object.values(stateMap).includes(x));
        if(stateIndex>=0){
          const before=parts.slice(0,stateIndex).filter(x=>!/^\d/.test(x));
          parts=[...before.slice(0,2),parts[stateIndex]];
        } else parts=parts.slice(0,3);
      }
      return parts.join(', ');
    }
    function setStatus(text,error=false){$('statusText').textContent=text;$('statusText').classList.toggle('error',error)}

    function initMap(){
      map=L.map('map',{zoomControl:true,attributionControl:false,rotate:false}).setView([lat,lon],18);
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:20}).addTo(map);
      marker=L.circleMarker([lat,lon],{radius:8,color:'#fff',weight:2,fillColor:'#ef2b2d',fillOpacity:1}).addTo(map);
      setTimeout(()=>map.invalidateSize(),50);
    }

    async function geocode(text){
      const q=String(text||'').trim(); if(!q) return null;
      try{
        const r=await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`,{headers:{Accept:'application/json'}});
        if(r.ok){const a=await r.json();if(a[0])return {lat:Number(a[0].lat),lon:Number(a[0].lon),label:a[0].display_name||q};}
      }catch{}
      try{
        const r=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`);
        if(r.ok){const d=await r.json();const x=d.results?.[0];if(x)return {lat:x.latitude,lon:x.longitude,label:[x.name,x.admin1,x.country].filter(Boolean).join(', ')};}
      }catch{}
      return null;
    }

    function getGps(){return new Promise((resolve,reject)=>{if(!navigator.geolocation)return reject(new Error('GPS is not supported by this browser.'));navigator.geolocation.getCurrentPosition(p=>resolve({lat:p.coords.latitude,lon:p.coords.longitude}),reject,{enableHighAccuracy:true,timeout:15000,maximumAge:60000})})}

    async function resolveLocation(){
      if(Number.isFinite(lat)&&Number.isFinite(lon)) return;
      const locationText=(qs.get('location')||qs.get('venue')||'').trim();
      if(locationText){setStatus('Locating ground…');const found=await geocode(locationText);if(found){lat=found.lat;lon=found.lon;const supplied=(qs.get('venue')||'').trim();$('venueName').textContent=compactLocation(supplied||found.label||locationText).toUpperCase();return;}}
      setStatus('Location was not resolved. Requesting this device GPS…');
      const gps=await getGps();lat=gps.lat;lon=gps.lon;
    }

    function nearestIndex(times,date,time){
      const target=`${date}T${time.slice(0,2)}:00`;
      let best=0,bestDiff=Infinity;times.forEach((t,i)=>{const diff=Math.abs(new Date(t).getTime()-new Date(target).getTime());if(diff<bestDiff){best=i;bestDiff=diff}});return best;
    }

    async function fetchWeather(){
      if(!navigator.onLine) throw new Error('No internet connection. Ground Conditions requires online satellite imagery and weather data.');
      const date=$('dateInput').value||localIsoDate(); const time=$('timeInput').value||'12:00';
      const today=localIsoDate(); const past=date<today;
      const endpoint=past?'https://archive-api.open-meteo.com/v1/archive':'https://api.open-meteo.com/v1/forecast';
      const hourly=['temperature_2m','apparent_temperature','relative_humidity_2m','precipitation','weather_code','wind_speed_10m','wind_direction_10m','wind_gusts_10m'];
      if(!past) hourly.push('precipitation_probability');
      const params=new URLSearchParams({latitude:String(lat),longitude:String(lon),start_date:date,end_date:date,hourly:hourly.join(','),timezone:'auto',wind_speed_unit:'kmh',precipitation_unit:'mm'});
      const r=await fetch(`${endpoint}?${params}`); if(!r.ok) throw new Error('Weather data is unavailable for this date/location.');
      const d=await r.json(); const h=d.hourly||{}; if(!h.time?.length) throw new Error('No hourly weather data was returned.');
      const i=nearestIndex(h.time,date,time);
      return {date,time,temp:Number(h.temperature_2m?.[i]),feels:Number(h.apparent_temperature?.[i]),humidity:Number(h.relative_humidity_2m?.[i]),precip:Number(h.precipitation?.[i]),pop:Number(h.precipitation_probability?.[i]),code:Number(h.weather_code?.[i]),wind:Number(h.wind_speed_10m?.[i]),windDir:Number(h.wind_direction_10m?.[i]),gust:Number(h.wind_gusts_10m?.[i])};
    }

    function renderWind(w){
      const from=compassDir(w.windDir);
      // Open-Meteo reports the direction the wind is coming FROM.
      // Convert it to the direction the air is travelling so the compass needle
      // and the three coaching arrows point the same way across the ground.
      const travelBearing=(((w.windDir%360)+360)%360+180)%360;
      const rotation=travelBearing-90;
      $('windGroup').setAttribute('transform',`rotate(${rotation} 450 150)`);
      $('compassArrow').style.transform=`translate(0,-4px) rotate(${rotation}deg)`;
      const speed=Number.isFinite(w.wind)?Math.round(w.wind):0; $('speedBadge').textContent=`${speed} km/h`;
      $('windLine').innerHTML=`WIND FROM <span>${from} ${speed} km/h${Number.isFinite(w.gust)?` • GUSTS ${Math.round(w.gust)} km/h`:''}</span>`;
    }

    function renderWeather(w){
      $('dateTimeLine').textContent=`${w.time} • ${formatDay(w.date)}`;
      $('weatherIcon').textContent=weatherIcon(w.code);
      $('conditionsLine').textContent=weatherLabel(w.code);
      $('temperature').textContent=Number.isFinite(w.temp)?`${Math.round(w.temp)}°C`:'--°C';
      $('feelsLike').textContent=Number.isFinite(w.feels)?`FEELS ${Math.round(w.feels)}°C`:'';
      $('humidityMetric').textContent=Number.isFinite(w.humidity)?`HUMIDITY ${Math.round(w.humidity)}%`:'';
      $('rainMetric').textContent=Number.isFinite(w.pop)?`RAIN ${Math.round(w.pop)}%`:(Number.isFinite(w.precip)?`RAIN ${w.precip.toFixed(1)} mm`:'');
      renderWind(w);
    }

    const WIND_SCALE_KEY='afl-ground-wind-scale-v1';
    let windScale=Math.min(1.8,Math.max(0.5,Number(localStorage.getItem(WIND_SCALE_KEY))||1));
    function applyWindScale(){$('windOverlay').style.setProperty('--wind-scale',String(windScale));}
    function changeWindScale(delta){windScale=Math.min(1.8,Math.max(0.5,Math.round((windScale+delta)*10)/10));localStorage.setItem(WIND_SCALE_KEY,String(windScale));applyWindScale();}

    async function refresh(){
      try{setStatus('Updating weather and wind…');const w=await fetchWeather();renderWeather(w);setStatus('Move the map so the wind arrows are positioned over the football oval.');}
      catch(e){setStatus(e.message||'Unable to load Ground Conditions.',true);}
    }

    async function boot(){
      $('venueName').textContent=compactLocation(initialVenue).toUpperCase();
      $('dateInput').value=qs.get('date')||localIsoDate();
      $('timeInput').value=currentHm();
      try{await resolveLocation();initMap();await refresh();}
      catch(e){setStatus(e.message||'Unable to determine the ground location.',true);$('conditionsLine').textContent='GROUND LOCATION REQUIRED';}
    }

    $('panelToggle').addEventListener('click',()=>{
      const panel=$('infoPanel');
      const collapsed=panel.classList.toggle('collapsed');
      $('panelToggle').textContent=collapsed?'▼':'▲';
      $('panelToggle').setAttribute('aria-expanded',String(!collapsed));
      $('panelToggle').setAttribute('aria-label',collapsed?'Expand weather information':'Collapse weather information');
    });
    $('windPlus').addEventListener('click',()=>changeWindScale(0.1));
    $('windMinus').addEventListener('click',()=>changeWindScale(-0.1));
    $('windClose').addEventListener('click',()=>{
      const svg=$('windOverlay').querySelector('svg');
      const hidden=svg.style.visibility==='hidden';
      svg.style.visibility=hidden?'visible':'hidden';
      $('windClose').setAttribute('aria-label',hidden?'Hide wind arrows':'Show wind arrows');
      $('windClose').title=hidden?'Hide wind arrows':'Show wind arrows';
    });
    $('refreshBtn').addEventListener('click',refresh);
    $('dateInput').addEventListener('change',refresh);$('timeInput').addEventListener('change',refresh);
    window.addEventListener('online',()=>setStatus('Internet connection restored. Press Refresh to update conditions.'));
    window.addEventListener('offline',()=>setStatus('No internet connection. Satellite imagery and weather cannot update.',true));
    applyWindScale();
    boot();
  </script>
</body>
</html>
