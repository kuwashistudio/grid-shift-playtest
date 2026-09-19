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

  function conflictGroups(level){
    return Array.isArray(level.conflict_groups)?level.conflict_groups:[];
  }

  function conflictGroupForVehicle(level,vehicleId){
    const groups=conflictGroups(level).filter(g=>g.vehicle_ids.includes(vehicleId));
    if(groups.length>1)throw new Error('Vehicle belongs to multiple conflict groups: '+vehicleId);
    return groups[0]||null;
  }

  function createGameState(level){
    return {activeIds:level.vehicles.map(v=>v.id),occupiedGroups:{},failed:null};
  }

  function copyState(state){
    return {
      activeIds:[...state.activeIds],
      occupiedGroups:{...state.occupiedGroups},
      failed:state.failed?{...state.failed}:null
    };
  }

  function conflictRisk(level,state,vehicleId){
    const group=conflictGroupForVehicle(level,vehicleId);
    if(!group)return null;
    const occupant=state.occupiedGroups[group.id]||null;
    return occupant&&occupant!==vehicleId?{groupId:group.id,occupantId:occupant}:null;
  }

  function safeMoves(level,state){
    if(state.failed)return [];
    const active=new Set(state.activeIds);
    return legalMoves(level,active).filter(id=>!conflictRisk(level,state,id));
  }

  function riskyConflictMoves(level,state){
    if(state.failed)return [];
    const active=new Set(state.activeIds);
    return legalMoves(level,active).filter(id=>!!conflictRisk(level,state,id));
  }

  function attemptLaunch(level,state,vehicleId){
    const next=copyState(state);
    if(next.failed)return {status:'failed_state',state:next};
    if(!next.activeIds.includes(vehicleId))return {status:'inactive',state:next};

    const active=new Set(next.activeIds);
    const staticBlocker=blockerId(level,vehicleId,active);
    if(staticBlocker)return {status:'blocked',blockerId:staticBlocker,state:next};

    const risk=conflictRisk(level,next,vehicleId);
    if(risk){
      next.failed={
        type:'shared_exit_conflict',
        groupId:risk.groupId,
        occupantId:risk.occupantId,
        attemptedVehicleId:vehicleId
      };
      return {status:'conflict_fail',failure:{...next.failed},state:next};
    }

    next.activeIds=next.activeIds.filter(id=>id!==vehicleId);
    const group=conflictGroupForVehicle(level,vehicleId);
    if(group)next.occupiedGroups[group.id]=vehicleId;
    return {status:'launched',groupId:group?group.id:null,state:next};
  }

  function completeExit(level,state,vehicleId){
    const next=copyState(state);
    for(const group of conflictGroups(level)){
      if(next.occupiedGroups[group.id]===vehicleId)delete next.occupiedGroups[group.id];
    }
    return next;
  }

  return Object.freeze({
    intersect,corridorFor,blockerId,legalMoves,
    conflictGroups,conflictGroupForVehicle,createGameState,
    conflictRisk,safeMoves,riskyConflictMoves,attemptLaunch,completeExit
  });
});
