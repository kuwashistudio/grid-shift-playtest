
/*
  GRID SHIFT v1.1 platform adapter.
  Runs offline with localStorage. If Playgama Bridge is bundled before this file,
  it also uses bridge.storage and listens for platform pause/audio state changes.
*/
(function(){
  'use strict';
  const prefix='gridshift_test_v180_';
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

  window.GridShiftPlatform={
    init, gameReady, get, set,
    isBridgeReady:()=>ready,
    isPlatformAudioEnabled:()=>platformAudio,
    isPlatformPaused:()=>platformPaused,
    onAudioChange(fn){audioListeners.add(fn); return ()=>audioListeners.delete(fn);},
    onPauseChange(fn){pauseListeners.add(fn); return ()=>pauseListeners.delete(fn);}
  };
})();
