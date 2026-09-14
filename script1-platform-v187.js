/* GRID SHIFT v1.8.7 — Playgama-ready platform adapter.
   Keeps local/Playgama behavior compatible and exposes a single interstitial hook.
   YouTube-specific platform handling is delegated to Playgama Bridge in submission builds. */
(function(){
  'use strict';
  const prefix='gridshift_';
  let ready=false;
  let gameReadySent=false;
  let platformAudio=true;
  let platformPaused=false;
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

  async function init(){
    if(!window.bridge || typeof window.bridge.initialize!=='function') return false;
    try{
      await window.bridge.initialize();
      ready=true;
      if(typeof window.bridge.platform?.isAudioEnabled==='boolean') platformAudio=window.bridge.platform.isAudioEnabled;
      if(typeof window.bridge.platform?.on==='function'){
        try{ window.bridge.platform.on('audio_state_changed', v=>{ platformAudio=normalizeBool(v,platformAudio); emit(audioListeners,platformAudio); }); }catch(_){ }
        try{ window.bridge.platform.on('pause_state_changed', v=>{ platformPaused=normalizeBool(v,platformPaused); emit(pauseListeners,platformPaused); }); }catch(_){ }
      }
      return true;
    }catch(err){
      console.warn('Playgama Bridge unavailable; local fallback active.',err);
      return false;
    }
  }

  async function gameReady(){
    if(gameReadySent) return;
    gameReadySent=true;
    if(ready){ try{ await window.bridge.platform.sendMessage('game_ready'); }catch(_){ } }
  }

  async function get(key){
    const local=localStorage.getItem(prefix+key);
    if(ready){
      try{
        const remote=await window.bridge.storage.get(prefix+key);
        if(remote!==null && remote!==undefined){
          const s=String(remote); localStorage.setItem(prefix+key,s); return s;
        }
      }catch(_){ }
    }
    return local;
  }

  async function set(key,value){
    const s=typeof value==='string'?value:JSON.stringify(value);
    localStorage.setItem(prefix+key,s);
    if(ready){ try{ await window.bridge.storage.set(prefix+key,s); }catch(_){ } }
  }

  async function showInterstitial(placement='run_over'){
    if(!ready) return false;
    try{
      const ads=window.bridge.advertisement;
      if(!ads || !ads.isInterstitialSupported || typeof ads.showInterstitial!=='function') return false;
      await ads.showInterstitial(placement);
      return true;
    }catch(_){
      return false;
    }
  }

  window.GridShiftPlatform={
    init, gameReady, get, set, showInterstitial,
    isBridgeReady:()=>ready,
    isPlatformAudioEnabled:()=>platformAudio,
    isPlatformPaused:()=>platformPaused,
    onAudioChange(fn){audioListeners.add(fn); return ()=>audioListeners.delete(fn);},
    onPauseChange(fn){pauseListeners.add(fn); return ()=>pauseListeners.delete(fn);}
  };
})();
