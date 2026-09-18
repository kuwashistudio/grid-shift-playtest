(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.ParkingLogic=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  function intersect(a,b){
    return !(a[2]<=b[0]||a[0]>=b[2]||a[3]<=b[1]||a[1]>=b[3]);
  }

  function corridorFor(level,vehicle){
    const b=vehicle.body,bounds=level.board.movement_bounds,inset=level.board.corridor_inset;
    if(vehicle.dir==='up')return [b[0]+inset,bounds.top,b[2]-inset,b[1]];
    if(vehicle.dir==='down')return [b[0]+inset,b[3],b[2]-inset,bounds.bottom];
    if(vehicle.dir==='left')return [bounds.left,b[1]+inset,b[0],b[3]-inset];
    if(vehicle.dir==='right')return [b[2],b[1]+inset,bounds.right,b[3]-inset];
    throw new Error('Unknown direction: '+vehicle.dir);
  }

  function blockerId(level,vehicleId,activeIds){
    const active=activeIds instanceof Set?activeIds:new Set(activeIds);
    if(!active.has(vehicleId))return null;
    const vehicle=level.vehicles.find(v=>v.id===vehicleId);
    if(!vehicle)throw new Error('Unknown vehicle: '+vehicleId);
    const corridor=corridorFor(level,vehicle);
    for(const other of level.vehicles){
      if(other.id===vehicleId||!active.has(other.id))continue;
      if(intersect(corridor,other.body))return other.id;
    }
    return null;
  }

  function legalMoves(level,activeIds){
    const active=activeIds instanceof Set?activeIds:new Set(activeIds);
    return level.vehicles
      .filter(v=>active.has(v.id)&&blockerId(level,v.id,active)===null)
      .map(v=>v.id);
  }

  return Object.freeze({intersect,corridorFor,blockerId,legalMoves});
});
