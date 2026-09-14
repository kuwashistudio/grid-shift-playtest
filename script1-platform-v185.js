/* GRID SHIFT v1.8.5 QA — platform adapter for YouTube Playables / Playgama / local.
   YouTube mode uses the official single cloud-save slot and does not mirror game
   progress into localStorage. Playgama and local behavior remain backward-compatible. */
(function(){
  'use strict';

  const prefix='gridshift_';
  const localPrefix=(document.body?.dataset?.build||'').includes('test')?'gridshift_test_v185_':prefix;
  let mode='local';
  let bridgeReady=false;
  let firstFrameReadySent=false;
  let gameReadySent=false;
  let platformAudio=true;
  let platformPaused=false;
  let youtubeCloud={version:1,values:{}};
  let youtubeLoaded=false;
  let youtubeSaveChain=Promise.resolve();
  const audioListeners=new Set();
  const pauseListeners=new Set();

  function emit(set,value){ for(const fn of set){ try{fn(value);}catch(_){ } } }
  function normalizeBool(v,fallback){
    if(typeof v==='boolean') return v;
    if(v && typeof v==='object'){
      for(const k of ['enabled','isEnabled','value','paused','isPaused']) if(typeof v[k]==='boolean') return v[k];
    }
    return fallback;
  }
  function localGet(key){ try{return localStorage.getItem(localPrefix+key);}catch(_){return null;} }
  function localSet(key,value){ try{localStorage.setItem(localPrefix+key,value);}catch(_){ } }
  function youtubeEnv(){ return typeof window.ytgame!=='undefined' && !!window.ytgame?.IN_PLAYABLES_ENV; }

  function firstFrameReady(){
    if(firstFrameReadySent)return;
    firstFrameReadySent=true;
    if(mode==='youtube'){
      try{window.ytgame.game.firstFrameReady();}catch(_){ }
    }
  }

  async function initYouTube(){
    mode='youtube';
    firstFrameReady();
    try{ platformAudio=!!window.ytgame.system.isAudioEnabled(); }catch(_){ platformAudio=true; }
    try{window.ytgame.system.onAudioEnabledChange(v=>{platformAudio=!!v;emit(audioListeners,platformAudio);});}catch(_){ }
    try{window.ytgame.system.onPause(()=>{platformPaused=true;emit(pauseListeners,true);try{window.dispatchEvent(new Event('pagehide'));}catch(_){ }});}catch(_){ }
    try{window.ytgame.system.onResume(()=>{platformPaused=false;emit(pauseListeners,false);});}catch(_){ }
    try{
      const raw=await window.ytgame.game.loadData();
      if(raw){
        const parsed=JSON.parse(raw);
        if(parsed&&typeof parsed==='object'&&parsed.values&&typeof parsed.values==='object')youtubeCloud={version:Number(parsed.version)||1,values:parsed.values};
      }
    }catch(_){youtubeCloud={version:1,values:{}};}
    youtubeLoaded=true;
    return true;
  }

  async function initPlaygama(){
    if(!window.bridge||typeof window.bridge.initialize!=='function')return false;
    try{
      await window.bridge.initialize();
      bridgeReady=true;mode='playgama';
      if(typeof window.bridge.platform?.isAudioEnabled==='boolean')platformAudio=window.bridge.platform.isAudioEnabled;
      if(typeof window.bridge.platform?.on==='function'){
        try{window.bridge.platform.on('audio_state_changed',v=>{platformAudio=normalizeBool(v,platformAudio);emit(audioListeners,platformAudio);});}catch(_){ }
        try{window.bridge.platform.on('pause_state_changed',v=>{platformPaused=normalizeBool(v,platformPaused);emit(pauseListeners,platformPaused);if(platformPaused){try{window.dispatchEvent(new Event('pagehide'));}catch(_){ }}});}catch(_){ }
      }
      return true;
    }catch(_){bridgeReady=false;mode='local';return false;}
  }

  async function init(){
    if(youtubeEnv())return initYouTube();
    const pg=await initPlaygama();
    if(!pg){mode='local';firstFrameReady();}
    return pg;
  }

  async function gameReady(){
    if(gameReadySent)return;
    gameReadySent=true;
    if(mode==='youtube'){try{window.ytgame.game.gameReady();}catch(_){ }return;}
    if(mode==='playgama'&&bridgeReady){try{await window.bridge.platform.sendMessage('game_ready');}catch(_){ }}
  }

  async function get(key){
    if(mode==='youtube'){
      if(!youtubeLoaded)return null;
      const v=youtubeCloud.values[key];
      return v===undefined||v===null?null:String(v);
    }
    const local=localGet(key);
    if(mode==='playgama'&&bridgeReady){
      try{const remote=await window.bridge.storage.get(prefix+key);if(remote!==null&&remote!==undefined){const s=String(remote);localSet(key,s);return s;}}catch(_){ }
    }
    return local;
  }

  async function set(key,value){
    const s=typeof value==='string'?value:JSON.stringify(value);
    if(mode==='youtube'){
      if(!youtubeLoaded)return;
      youtubeCloud.values[key]=s;
      const payload=JSON.stringify(youtubeCloud);
      youtubeSaveChain=youtubeSaveChain.then(()=>window.ytgame.game.saveData(payload)).catch(()=>{});
      await youtubeSaveChain;
      return;
    }
    localSet(key,s);
    if(mode==='playgama'&&bridgeReady){try{await window.bridge.storage.set(prefix+key,s);}catch(_){ }}
  }

  window.GridShiftPlatform={
    init,firstFrameReady,gameReady,get,set,
    platformMode:()=>mode,
    isBridgeReady:()=>bridgeReady,
    isPlatformAudioEnabled:()=>platformAudio,
    isPlatformPaused:()=>platformPaused,
    onAudioChange(fn){audioListeners.add(fn);return()=>audioListeners.delete(fn);},
    onPauseChange(fn){pauseListeners.add(fn);return()=>pauseListeners.delete(fn);}
  };
})();
