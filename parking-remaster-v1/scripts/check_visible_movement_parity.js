const fs=require('fs');
const f=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
function overlap(a0,a1,b0,b1){return a0<=b1 && b0<=a1;}
function legal(c){const v=c.vehicle; for(const b of c.blockers){
  if(v.axis==='+x' && overlap(v.y,v.y+v.h,b.y,b.y+b.h) && b.x<=c.exit && b.x+b.w>=v.x+v.w) return false;
  if(v.axis==='-x' && overlap(v.y,v.y+v.h,b.y,b.y+b.h) && b.x+b.w>=c.exit && b.x<=v.x) return false;
  if(v.axis==='+y' && overlap(v.x,v.x+v.w,b.x,b.x+b.w) && b.y<=c.exit && b.y+b.h>=v.y+v.h) return false;
  if(v.axis==='-y' && overlap(v.x,v.x+v.w,b.x,b.x+b.w) && b.y+b.h>=c.exit && b.y<=v.y) return false;
 } return true; }
process.stdout.write(JSON.stringify(Object.fromEntries(f.cases.map(c=>[c.id,legal(c)]))));
