/* GRID SHIFT recording-only iOS audio capture test v1.8.8.
   Does not change production gameplay. It requests the media playback audio session
   and prevents the runtime from forcing Web Audio into low-latency interactive mode,
   which is associated with iOS 26 screen-recording audio corruption. */
(function(){
  'use strict';
  try{
    if(navigator.audioSession && 'type' in navigator.audioSession){
      navigator.audioSession.type='playback';
    }
  }catch(_){ }

  const NativeAC=window.AudioContext||window.webkitAudioContext;
  if(!NativeAC)return;

  const PatchedAC=new Proxy(NativeAC,{
    construct(Target,args){
      const incoming=(args&&args[0]&&typeof args[0]==='object')?args[0]:{};
      const opts={...incoming};
      delete opts.latencyHint;
      return new Target(opts);
    }
  });

  try{window.AudioContext=PatchedAC;}catch(_){ }
  try{window.webkitAudioContext=PatchedAC;}catch(_){ }
})();
