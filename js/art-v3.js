// ============================================================
// アルカの塔 - Visual System III
// 旧ドット定義を使用せず、タイル・魔物・ボスを新規生成する。
// ============================================================
'use strict';

const Art = (() => {
  const cache = Object.create(null);
  const tileCache = Object.create(null);
  const INK = '#111525';
  const TILE_SIZE = 64;

  const T = { FLOOR: 0, WALL: 1, UP: 2, DOWN: 3, WATER: 4, GRASS: 5, TREE: 6, CHEST: 7, CHEST_OPEN: 8,
    COUNTER: 9, CARPET: 10, PILLAR: 11, VOID: 12, BED: 13, SIGN: 14, CIRCLE: 15, TABLE: 16, DOOR: 17,
    HOUSE: 18, ROOF: 19, PATH: 20, FLOWER: 21, LAMP: 22, FENCE: 23 };

  const TIER_THEMES = [
    { bg:'#0b1720', floor:'#77935c', floorD:'#47683e', floorL:'#a5bd77', wall:'#4a5361', wallD:'#282e3a', wallL:'#788392', accent:'#5de0d8', sky:'#86b5c8', name:'根元の庭' },
    { bg:'#101321', floor:'#6d7070', floorD:'#41444b', floorL:'#99998e', wall:'#535867', wallD:'#292e3b', wallL:'#858d9b', accent:'#69dbe4', sky:'#637a9b', name:'古塔' },
    { bg:'#071929', floor:'#507c8b', floorD:'#28505e', floorL:'#83adad', wall:'#3a6379', wallD:'#20394c', wallL:'#69a0b0', accent:'#71edff', sky:'#315a7c', name:'水脈' },
    { bg:'#1b120b', floor:'#967345', floorD:'#5d4428', floorL:'#c2a06a', wall:'#7b5e3f', wallD:'#493520', wallL:'#b08b5b', accent:'#ffd06b', sky:'#98724f', name:'砂楼' },
    { bg:'#080717', floor:'#4c435e', floorD:'#29233c', floorL:'#746989', wall:'#38334e', wallD:'#1d192d', wallL:'#665d7d', accent:'#b27cff', sky:'#33274f', name:'常夜' },
    { bg:'#07150f', floor:'#5c7f5e', floorD:'#34513a', floorL:'#91aa78', wall:'#3e624e', wallD:'#213b30', wallL:'#6d9172', accent:'#80f0b1', sky:'#517b69', name:'空庭' },
    { bg:'#081015', floor:'#66717b', floorD:'#39434e', floorL:'#98a5aa', wall:'#4b5964', wallD:'#26333d', wallL:'#83929a', accent:'#65e4e7', sky:'#425b69', name:'機関' },
    { bg:'#190906', floor:'#7d503d', floorD:'#4a2a24', floorL:'#b77a58', wall:'#68382f', wallD:'#3b1d1a', wallL:'#a85c45', accent:'#ff9655', sky:'#79382c', name:'竜眼' },
    { bg:'#12152a', floor:'#8b8ba0', floorD:'#55576d', floorL:'#c8c4cf', wall:'#73758b', wallD:'#444659', wallL:'#b2b2bf', accent:'#fff0a3', sky:'#7a8fb1', name:'雲上' },
    { bg:'#080513', floor:'#49405f', floorD:'#272038', floorL:'#716683', wall:'#332b4b', wallD:'#1a142b', wallL:'#625679', accent:'#76deff', sky:'#2b204d', name:'星影' },
    { bg:'#151108', floor:'#9b8756', floorD:'#605033', floorL:'#d5c382', wall:'#817047', wallD:'#4b3e27', wallL:'#c6b477', accent:'#fff0a0', sky:'#827759', name:'天蓋' },
  ];

  function canvas(w, h, logicalScale, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    const s = logicalScale || 1; g.scale(s, s); draw(g, w / s, h / s);
    return c;
  }
  function rect(g,x,y,w,h,c){ g.fillStyle=c; g.fillRect(x,y,w,h); }
  function poly(g, pts, c){ g.fillStyle=c; g.beginPath(); g.moveTo(pts[0][0],pts[0][1]); for(let i=1;i<pts.length;i++)g.lineTo(pts[i][0],pts[i][1]); g.closePath(); g.fill(); }
  function line(g, pts, c, width=1){ g.strokeStyle=c; g.lineWidth=width; g.lineJoin='miter'; g.lineCap='butt'; g.beginPath(); g.moveTo(pts[0][0],pts[0][1]); for(let i=1;i<pts.length;i++)g.lineTo(pts[i][0],pts[i][1]); g.stroke(); }
  function ellipse(g,x,y,rx,ry,c){ g.fillStyle=c; g.beginPath(); g.ellipse(x,y,rx,ry,0,0,Math.PI*2); g.fill(); }
  function mirror(g,w,fn){ g.save(); g.translate(w,0); g.scale(-1,1); fn(); g.restore(); }
  function hi(hex){ return hex; }

  function monster(kind, p, mods={}) {
    return canvas(192,192,8,(g,w,h)=>{
      const dark=p.dark||INK, body=p.body, light=p.light, glow=p.glow||'#ffdd72';
      g.translate(0,1);
      if(kind==='slime'){
        poly(g,[[4,20],[6,12],[10,7],[12,3],[14,7],[19,11],[21,19],[19,22],[5,22]],dark);
        poly(g,[[5,19],[7,12],[11,8],[12,5],[14,9],[18,12],[20,19],[18,21],[6,21]],body);
        rect(g,8,11,5,2,light); rect(g,8,12,2,2,'#ffffff66');
        rect(g,9,15,2,2,INK); rect(g,15,15,2,2,INK); rect(g,12,18,3,1,dark);
        if(mods.crown){rect(g,8,5,9,2,'#d7b957');poly(g,[[8,5],[9,1],[12,5],[14,1],[16,5]],'#f4d96a');}
      } else if(kind==='bat'){
        poly(g,[[12,9],[7,5],[1,7],[5,11],[1,16],[9,14],[12,18]],dark);
        poly(g,[[12,10],[7,7],[3,8],[7,11],[4,14],[10,12],[12,17]],body);
        mirror(g,w,()=>{poly(g,[[12,9],[7,5],[1,7],[5,11],[1,16],[9,14],[12,18]],dark);poly(g,[[12,10],[7,7],[3,8],[7,11],[4,14],[10,12],[12,17]],body);});
        ellipse(g,12,13,5,6,dark); ellipse(g,12,13,4,5,body); rect(g,8,9,2,3,dark); rect(g,14,9,2,3,dark);
        rect(g,9,12,2,2,glow);rect(g,14,12,2,2,glow);rect(g,11,16,3,1,light);
      } else if(kind==='rat'){
        line(g,[[4,17],[1,14],[2,11],[5,10]],dark,2); ellipse(g,13,16,9,6,dark);ellipse(g,13,15,8,5,body);
        ellipse(g,19,13,5,5,dark);ellipse(g,19,13,4,4,body);ellipse(g,17,9,3,3,dark);ellipse(g,17,9,2,2,light);
        rect(g,20,12,2,2,glow);rect(g,22,15,2,1,'#e7a7a3');
        for(let x=7;x<16;x+=3)poly(g,[[x,11],[x+1,7],[x+2,12]],dark);
        rect(g,8,20,3,2,dark);rect(g,17,19,3,2,dark);
      } else if(kind==='goblin'){
        poly(g,[[7,6],[9,2],[11,7],[18,5],[16,9],[19,13],[18,20],[14,23],[8,22],[5,18],[6,11]],dark);
        poly(g,[[8,7],[10,4],[11,8],[16,7],[15,10],[17,13],[16,17],[13,19],[9,18],[7,16],[8,10]],body);
        rect(g,9,10,2,2,glow);rect(g,14,10,2,2,glow);rect(g,11,14,4,1,dark);
        rect(g,8,18,8,4,p.cloth);rect(g,6,19,3,3,dark);rect(g,16,19,3,3,dark);
        if(mods.armor){rect(g,7,17,10,4,p.metal);rect(g,10,17,4,1,p.metalL);rect(g,4,8,3,9,p.metal);line(g,[[5,8],[5,2]],p.metalL,1);}
        if(mods.crown){poly(g,[[7,8],[7,3],[10,6],[12,2],[15,6],[18,3],[17,9]],'#d6ad45');}
      } else if(kind==='aquan'){
        poly(g,[[12,1],[16,7],[20,12],[19,19],[15,23],[8,22],[4,18],[5,11],[9,7]],dark);
        poly(g,[[12,3],[15,8],[18,12],[17,18],[14,21],[9,20],[6,17],[7,12],[10,8]],body);
        rect(g,8,9,5,2,light);rect(g,9,12,2,2,INK);rect(g,15,12,2,2,INK);rect(g,11,16,4,1,glow);
        line(g,[[6,17],[2,21],[5,20]],light,1);line(g,[[18,17],[22,21],[19,20]],light,1);
      } else if(kind==='mush'){
        ellipse(g,12,9,11,7,dark);ellipse(g,12,8,10,6,body);rect(g,6,5,4,2,light);rect(g,15,8,4,2,p.spot);
        poly(g,[[8,11],[16,11],[18,21],[15,23],[9,23],[6,20]],dark);rect(g,9,12,6,9,p.stem);
        rect(g,9,15,2,2,INK);rect(g,14,15,2,2,INK);rect(g,11,19,3,1,dark);
      } else if(kind==='thief'){
        poly(g,[[7,5],[12,2],[18,6],[17,13],[20,21],[15,23],[7,22],[4,18],[7,12]],dark);
        poly(g,[[8,6],[12,4],[16,7],[15,12],[17,20],[13,21],[8,20],[6,17],[9,11]],body);
        rect(g,8,8,8,3,p.skin);rect(g,10,9,2,1,glow);rect(g,14,9,2,1,glow);
        rect(g,5,15,3,7,p.cloth);rect(g,17,14,3,8,p.cloth);line(g,[[5,19],[1,22]],p.metal,2);line(g,[[19,18],[23,21]],p.metal,2);
      } else if(kind==='rock'){
        poly(g,[[5,6],[11,2],[18,5],[22,11],[20,19],[16,23],[7,22],[2,17],[3,10]],dark);
        poly(g,[[6,7],[11,4],[17,6],[20,11],[18,18],[15,21],[8,20],[4,16],[5,10]],body);
        poly(g,[[6,7],[11,4],[10,11],[5,12]],light);poly(g,[[11,4],[17,6],[15,11],[10,11]],p.mid||body);
        rect(g,7,13,4,3,INK);rect(g,15,12,4,3,INK);rect(g,8,13,2,1,glow);rect(g,16,12,2,1,glow);line(g,[[10,18],[14,19],[17,17]],dark,1);
        if(mods.lava){line(g,[[11,4],[10,11],[13,15],[12,21]],'#ffd34d',2);line(g,[[17,6],[15,11],[18,14]],'#ff6038',1);}
      } else if(kind==='ghost'){
        poly(g,[[6,21],[4,16],[5,8],[9,3],[15,3],[20,8],[20,16],[22,22],[18,19],[15,23],[12,19],[8,23]],dark);
        poly(g,[[7,19],[6,15],[7,9],[10,5],[14,5],[18,9],[18,16],[19,19],[16,17],[14,21],[12,17],[9,20]],body);
        rect(g,8,10,3,3,glow);rect(g,15,10,3,3,glow);rect(g,9,11,1,1,'#fff');rect(g,16,11,1,1,'#fff');ellipse(g,13,16,3,2,dark);
      } else if(kind==='plant'){
        line(g,[[12,23],[10,15],[12,8]],dark,3);line(g,[[12,18],[5,14],[3,8]],dark,2);line(g,[[12,17],[19,13],[21,7]],dark,2);
        ellipse(g,12,8,7,6,dark);ellipse(g,12,8,6,5,body);poly(g,[[8,7],[12,4],[17,7],[14,10],[10,10]],p.mouth);rect(g,10,7,1,2,'#fff');rect(g,14,7,1,2,'#fff');
        poly(g,[[5,14],[1,11],[2,17]],light);poly(g,[[19,13],[23,10],[22,17]],light);poly(g,[[10,19],[5,23],[11,22]],body);poly(g,[[14,19],[19,23],[13,22]],body);
      } else if(kind==='machine'){
        poly(g,[[6,5],[18,5],[21,9],[20,20],[16,23],[7,22],[3,18],[4,9]],dark);
        rect(g,6,7,12,12,body);rect(g,8,6,8,2,light);rect(g,7,10,10,5,p.panel);rect(g,9,11,6,2,glow);rect(g,11,11,2,2,'#fff');
        rect(g,2,10,5,8,dark);rect(g,18,10,5,8,dark);rect(g,7,19,4,4,dark);rect(g,14,19,4,4,dark);rect(g,11,16,3,2,p.metal);
        if(mods.guard){rect(g,1,7,5,13,p.metal);line(g,[[3,8],[3,19]],light,1);rect(g,19,8,3,13,p.metal);}
      } else if(kind==='dragon'){
        poly(g,[[7,20],[3,16],[2,9],[7,12],[8,5],[12,1],[16,5],[18,10],[23,8],[21,16],[18,20]],dark);
        poly(g,[[8,19],[5,15],[4,11],[8,14],[10,6],[12,3],[15,6],[16,13],[20,11],[19,16],[16,19]],body);
        poly(g,[[8,12],[3,7],[2,15]],p.wing);poly(g,[[16,12],[22,7],[21,16]],p.wing);
        rect(g,10,7,2,2,glow);rect(g,14,7,2,2,glow);poly(g,[[11,11],[14,11],[13,14]],p.belly);
        rect(g,7,19,4,4,dark);rect(g,15,19,4,4,dark);line(g,[[18,17],[23,20],[21,22]],dark,2);
        if(mods.crown)poly(g,[[8,6],[8,1],[11,4],[13,0],[16,4],[18,1],[17,7]],'#e1bd54');
      } else if(kind==='angel'){
        poly(g,[[8,7],[4,4],[1,7],[5,10],[1,14],[8,13],[9,21]],dark);poly(g,[[7,8],[4,6],[3,8],[7,11],[4,13],[9,12]],p.wing);
        mirror(g,w,()=>{poly(g,[[8,7],[4,4],[1,7],[5,10],[1,14],[8,13],[9,21]],dark);poly(g,[[7,8],[4,6],[3,8],[7,11],[4,13],[9,12]],p.wing);});
        ellipse(g,12,3,5,2,glow);ellipse(g,12,3,3,1,'#172044');ellipse(g,12,9,5,5,dark);ellipse(g,12,9,4,4,p.skin);
        poly(g,[[8,12],[16,12],[18,22],[6,22]],dark);poly(g,[[9,13],[15,13],[16,21],[8,21]],body);rect(g,10,8,1,2,INK);rect(g,14,8,1,2,INK);rect(g,11,14,2,5,glow);
      } else if(kind==='shadow'){
        poly(g,[[7,4],[12,1],[18,5],[17,11],[20,22],[14,20],[10,23],[5,20],[7,11]],dark);
        poly(g,[[9,5],[12,3],[16,6],[15,11],[17,19],[13,18],[10,21],[7,19],[9,10]],body);
        rect(g,9,8,3,2,glow);rect(g,14,8,3,2,glow);poly(g,[[7,12],[2,15],[6,19]],p.cape);line(g,[[18,14],[22,21]],glow,1);
      }
    });
  }

  function boss(kind,p){
    return canvas(256,256,8,(g,w,h)=>{
      // ボスは通常魔物とは別の大判構成。
      if(kind==='guardio'){
        poly(g,[[7,29],[4,18],[8,10],[13,8],[14,3],[18,1],[22,4],[22,8],[27,11],[30,20],[27,30]],INK);
        rect(g,9,11,18,17,p.body);rect(g,12,5,12,9,p.mid);rect(g,14,7,3,3,p.glow);rect(g,21,7,3,3,p.glow);
        poly(g,[[5,13],[11,10],[12,27],[5,29],[2,24]],p.dark);poly(g,[[27,12],[31,16],[31,27],[25,28],[25,11]],p.dark);
        rect(g,13,16,11,8,p.light);poly(g,[[17,17],[22,17],[22,22],[17,22]],p.glow);rect(g,9,29,7,3,p.dark);rect(g,22,29,7,3,p.dark);
      }else if(kind==='aquera'){
        for(let i=0;i<5;i++) line(g,[[16,30],[6+i*5,20-i%2*3],[3+i*6,10]],i%2?p.body:p.light,2);
        poly(g,[[7,30],[9,14],[13,5],[17,1],[21,5],[25,14],[27,30]],INK);poly(g,[[9,29],[11,14],[15,7],[17,3],[20,7],[23,15],[25,29]],p.body);
        ellipse(g,17,13,7,6,p.light);rect(g,13,12,2,2,p.glow);rect(g,20,12,2,2,p.glow);line(g,[[15,17],[19,18],[22,16]],p.dark,1);
      }else if(kind==='nocturna'){
        poly(g,[[5,31],[8,14],[11,8],[10,3],[16,1],[22,4],[23,10],[27,15],[30,31]],INK);
        poly(g,[[8,30],[10,15],[14,10],[13,4],[17,3],[21,5],[20,11],[25,16],[27,30]],p.body);
        ellipse(g,17,8,6,6,p.skin);rect(g,13,7,2,2,p.glow);rect(g,20,7,2,2,p.glow);poly(g,[[12,3],[17,0],[22,3],[20,5],[14,5]],p.crown);
        for(let i=0;i<4;i++)poly(g,[[9+i*5,15],[6+i*6,29],[12+i*4,26]],i%2?p.light:p.dark);
        ellipse(g,5,14,4,2,p.glow);ellipse(g,28,12,3,2,p.glow);
      }else if(kind==='makinas'){
        poly(g,[[3,29],[4,10],[9,4],[15,5],[18,1],[22,5],[28,6],[31,13],[29,30]],INK);
        rect(g,7,8,21,19,p.body);rect(g,10,5,15,8,p.light);rect(g,12,9,11,5,p.panel);rect(g,15,10,5,3,p.glow);
        ellipse(g,17,20,8,7,p.dark);ellipse(g,17,20,5,5,p.body);rect(g,15,18,4,4,p.glow);
        rect(g,2,12,7,14,p.dark);rect(g,26,11,6,16,p.dark);rect(g,7,27,8,5,p.dark);rect(g,21,27,8,5,p.dark);
        for(let i=0;i<3;i++){rect(g,4+i*11,7,2,3,p.glow);}
      }else if(kind==='arcacore'){
        for(let r=15;r>5;r-=4){g.strokeStyle=r%3?p.body:p.glow;g.lineWidth=1;g.beginPath();g.ellipse(16,16,r,r*0.45,r*0.12,0,Math.PI*2);g.stroke();}
        poly(g,[[16,2],[27,10],[26,23],[16,30],[5,23],[4,10]],INK);poly(g,[[16,4],[24,11],[23,21],[16,27],[7,21],[7,11]],p.light);
        poly(g,[[16,7],[21,12],[20,20],[16,24],[11,20],[11,12]],p.body);rect(g,14,13,5,7,p.glow);rect(g,15,14,3,5,'#fff6c4');
        for(const [x,y] of [[3,5],[28,6],[2,25],[29,25]]){ellipse(g,x,y,2,2,p.glow);}
      }
    });
  }

  // 高精細戦闘スプライト。旧来の24px輪郭ではなく96px論理座標で描く。
  function monsterHD(kind,p,mods={}){
    return canvas(192,192,2,(g,w,h)=>{
      const D=p.dark||INK,B=p.body,L=p.light,G=p.glow||'#ffe27a';
      const grd=(x0,y0,x1,y1,a,b)=>{const z=g.createLinearGradient(x0,y0,x1,y1);z.addColorStop(0,a);z.addColorStop(1,b);return z;};
      const path=(pts,c)=>{g.fillStyle=c;g.beginPath();g.moveTo(...pts[0]);for(let i=1;i<pts.length;i++){const q=pts[i];q.length===2?g.lineTo(...q):q.length===4?g.quadraticCurveTo(...q):g.bezierCurveTo(...q);}g.closePath();g.fill();};
      g.save();g.translate(0,3);g.shadowColor='rgba(2,5,14,.65)';g.shadowBlur=5;g.shadowOffsetY=4;
      if(kind==='slime'){
        g.fillStyle=grd(20,18,72,79,L,D);g.beginPath();g.moveTo(12,77);g.bezierCurveTo(10,57,24,42,39,34);g.bezierCurveTo(46,29,47,15,49,8);g.bezierCurveTo(55,24,62,31,72,39);g.bezierCurveTo(88,52,91,77,75,84);g.bezierCurveTo(59,91,28,90,12,77);g.fill();
        g.fillStyle='#ffffff55';g.beginPath();g.ellipse(36,44,13,8,-.4,0,Math.PI*2);g.fill();
        ellipse(g,36,61,5,7,D);ellipse(g,65,61,5,7,D);ellipse(g,38,59,1.5,2,'#fff');ellipse(g,67,59,1.5,2,'#fff');
        g.strokeStyle=D;g.lineWidth=3;g.beginPath();g.arc(51,67,11,.15*Math.PI,.85*Math.PI);g.stroke();
        if(mods.crown){path([[31,34],[29,15],[42,27],[51,10],[60,27],[74,14],[71,38]],grd(0,0,0,38,'#fff09a','#b27a24'));}
      }else if(kind==='bat'){
        g.fillStyle=grd(0,10,48,70,L,D);g.beginPath();g.moveTo(47,50);g.bezierCurveTo(31,36,17,18,3,23);g.bezierCurveTo(12,34,2,45,4,66);g.bezierCurveTo(17,55,29,67,46,71);g.fill();
        g.save();g.translate(96,0);g.scale(-1,1);g.beginPath();g.moveTo(47,50);g.bezierCurveTo(31,36,17,18,3,23);g.bezierCurveTo(12,34,2,45,4,66);g.bezierCurveTo(17,55,29,67,46,71);g.fill();g.restore();
        ellipse(g,48,54,22,27,D);ellipse(g,48,52,18,23,B);path([[32,37],[34,15],[46,35]],D);path([[50,34],[63,15],[64,39]],D);
        ellipse(g,40,49,5,6,G);ellipse(g,57,49,5,6,G);ellipse(g,42,47,1.5,2,'#fff');ellipse(g,59,47,1.5,2,'#fff');path([[43,65],[48,72],[53,65]],'#f1d3c3');
      }else if(kind==='rat'){
        g.strokeStyle=D;g.lineWidth=7;g.lineCap='round';g.beginPath();g.moveTo(20,69);g.bezierCurveTo(-3,79,4,42,22,49);g.stroke();
        g.fillStyle=grd(22,30,75,82,L,D);g.beginPath();g.ellipse(48,60,35,25,-.08,0,Math.PI*2);g.fill();ellipse(g,75,47,20,18,B);ellipse(g,68,31,11,11,D);ellipse(g,69,31,7,7,p.light||L);
        path([[30,44],[37,19],[47,45]],D);path([[43,40],[53,14],[60,45]],D);path([[56,43],[68,20],[72,48]],D);
        ellipse(g,78,45,5,6,G);ellipse(g,80,43,1.5,2,'#fff');ellipse(g,92,52,4,3,'#e8a6a4');
        ellipse(g,35,79,12,5,D);ellipse(g,70,78,12,5,D);
      }else if(kind==='goblin'){
        g.fillStyle=grd(25,20,72,82,L,D);g.beginPath();g.moveTo(22,38);g.lineTo(3,30);g.lineTo(20,51);g.bezierCurveTo(17,67,25,85,47,88);g.bezierCurveTo(72,88,81,68,76,50);g.lineTo(94,27);g.lineTo(71,38);g.bezierCurveTo(60,20,35,18,22,38);g.fill();
        ellipse(g,37,49,5,6,G);ellipse(g,62,49,5,6,G);ellipse(g,39,47,1.5,2,'#fff');ellipse(g,64,47,1.5,2,'#fff');
        g.strokeStyle=D;g.lineWidth=3;g.beginPath();g.moveTo(39,65);g.quadraticCurveTo(49,71,61,63);g.stroke();path([[40,64],[43,73],[47,65]],'#eee4d5');path([[57,65],[61,73],[64,63]],'#eee4d5');
        g.fillStyle=p.cloth||'#654339';g.roundRect(26,69,46,23,7);g.fill();
        if(mods.armor){g.fillStyle=grd(25,62,70,90,p.metalL||'#d9e0df',p.metal||'#707d86');g.roundRect(23,65,51,27,7);g.fill();g.strokeStyle=D;g.lineWidth=3;g.strokeRect(47,67,3,22);path([[15,62],[4,69],[7,91],[27,88],[26,65]],p.metal||'#707d86');}
        if(mods.crown)path([[23,38],[22,12],[39,28],[49,6],[61,28],[78,12],[73,41]],grd(0,0,0,40,'#fff09b','#b37d24'));
      }else if(kind==='aquan'){
        g.fillStyle=grd(22,9,71,90,L,D);g.beginPath();g.moveTo(48,4);g.bezierCurveTo(43,29,16,42,17,65);g.bezierCurveTo(18,90,78,94,81,65);g.bezierCurveTo(83,43,57,29,48,4);g.fill();
        g.fillStyle='#ffffff55';g.beginPath();g.ellipse(35,40,13,8,-.5,0,Math.PI*2);g.fill();ellipse(g,37,60,5,7,D);ellipse(g,61,60,5,7,D);g.strokeStyle=D;g.lineWidth=3;g.beginPath();g.moveTo(40,76);g.quadraticCurveTo(49,81,59,75);g.stroke();
        g.strokeStyle=L;g.lineWidth=4;g.beginPath();g.moveTo(21,68);g.bezierCurveTo(7,77,14,89,2,91);g.moveTo(77,67);g.bezierCurveTo(91,77,83,88,95,91);g.stroke();
      }else if(kind==='mush'){
        g.fillStyle=grd(27,41,65,94,p.stem||'#d8c8a8',D);g.beginPath();g.moveTo(34,43);g.bezierCurveTo(30,61,23,83,35,91);g.bezierCurveTo(48,98,67,94,70,84);g.bezierCurveTo(65,66,61,54,61,43);g.fill();
        g.fillStyle=grd(12,7,77,54,L,B);g.beginPath();g.moveTo(5,49);g.bezierCurveTo(7,17,29,5,50,6);g.bezierCurveTo(74,7,91,23,92,51);g.bezierCurveTo(72,58,25,59,5,49);g.fill();
        for(const [x,y,r]of[[28,25,8],[60,17,6],[75,36,7]])ellipse(g,x,y,r,r*.65,p.spot||'#ffe18a');ellipse(g,41,69,5,7,D);ellipse(g,60,69,5,7,D);g.strokeStyle=D;g.lineWidth=3;g.beginPath();g.moveTo(44,82);g.quadraticCurveTo(50,86,57,81);g.stroke();
      }else if(kind==='thief'){
        g.fillStyle=grd(20,8,74,91,L,D);g.beginPath();g.moveTo(49,5);g.bezierCurveTo(22,7,14,29,20,51);g.lineTo(11,89);g.lineTo(83,89);g.lineTo(75,49);g.bezierCurveTo(84,26,68,7,49,5);g.fill();
        g.fillStyle=p.skin||'#c28b68';g.roundRect(27,31,43,25,10);g.fill();g.fillStyle=D;g.fillRect(25,31,47,10);ellipse(g,39,42,4,5,G);ellipse(g,59,42,4,5,G);
        g.fillStyle=p.cloth||B;g.roundRect(21,58,56,34,8);g.fill();g.strokeStyle=p.metal||'#d5c46f';g.lineWidth=4;g.beginPath();g.moveTo(22,71);g.lineTo(75,71);g.stroke();
        g.strokeStyle=p.metal||'#d8d1a4';g.lineWidth=5;g.beginPath();g.moveTo(19,65);g.lineTo(3,89);g.moveTo(78,65);g.lineTo(94,89);g.stroke();
      }else if(kind==='rock'){
        g.fillStyle=grd(12,8,83,89,L,D);path([[48,4],[77,15],[93,43],[87,75],[68,93],[32,90],[8,72],[4,39],[22,14]],g.fillStyle);
        path([[22,14],[48,4],[43,38],[8,39]],L);path([[48,4],[77,15],[70,42],[43,38]],p.mid||B);path([[8,39],[43,38],[36,76],[9,72]],B);path([[43,38],[70,42],[87,75],[36,76]],D);
        ellipse(g,31,53,9,7,'#171923');ellipse(g,66,52,9,7,'#171923');ellipse(g,32,52,4,3,G);ellipse(g,67,51,4,3,G);g.strokeStyle='#171923';g.lineWidth=4;g.beginPath();g.moveTo(34,70);g.lineTo(49,76);g.lineTo(65,68);g.stroke();
        if(mods.lava){g.strokeStyle='#ffdd53';g.shadowColor='#ff6938';g.shadowBlur=8;g.lineWidth=6;g.beginPath();g.moveTo(48,5);g.lineTo(43,38);g.lineTo(55,57);g.lineTo(48,91);g.moveTo(76,16);g.lineTo(70,42);g.lineTo(84,58);g.stroke();}
      }else if(kind==='ghost'){
        g.fillStyle=grd(19,5,74,93,L,D);g.beginPath();g.moveTo(49,4);g.bezierCurveTo(22,4,13,25,18,50);g.bezierCurveTo(21,67,8,77,8,93);g.lineTo(27,80);g.lineTo(39,94);g.lineTo(52,80);g.lineTo(67,93);g.lineTo(77,76);g.bezierCurveTo(72,60,83,46,78,28);g.bezierCurveTo(74,12,64,4,49,4);g.fill();
        ellipse(g,35,39,8,10,G);ellipse(g,62,39,8,10,G);ellipse(g,37,36,2,3,'#fff');ellipse(g,64,36,2,3,'#fff');ellipse(g,49,61,12,9,D);ellipse(g,49,59,5,3,L);
      }else if(kind==='plant'){
        g.strokeStyle=D;g.lineWidth=10;g.lineCap='round';g.beginPath();g.moveTo(49,92);g.bezierCurveTo(48,72,41,55,49,39);g.moveTo(44,69);g.bezierCurveTo(26,60,18,49,13,34);g.moveTo(55,69);g.bezierCurveTo(72,60,82,48,85,32);g.stroke();
        ellipse(g,49,33,29,27,D);ellipse(g,49,31,25,23,B);g.fillStyle=p.mouth||'#c64c52';g.beginPath();g.ellipse(49,36,19,11,0,0,Math.PI*2);g.fill();path([[32,36],[48,29],[67,36],[59,43],[40,43]],'#eee4c6');ellipse(g,37,24,4,5,G);ellipse(g,61,24,4,5,G);
        path([[32,69],[10,60],[17,82]],L);path([[64,68],[88,58],[80,82]],L);path([[44,78],[20,92],[45,90]],B);path([[55,78],[78,93],[53,90]],B);
      }else if(kind==='machine'){
        g.fillStyle=grd(15,10,81,88,L,D);g.roundRect(14,13,68,70,14);g.fill();g.strokeStyle=D;g.lineWidth=6;g.stroke();
        g.fillStyle=p.panel||'#344957';g.roundRect(25,24,46,29,7);g.fill();g.fillStyle=G;g.shadowColor=G;g.shadowBlur=8;g.roundRect(35,32,26,12,4);g.fill();g.fillStyle='#eaffff';g.fillRect(39,34,8,7);g.shadowColor='transparent';
        ellipse(g,48,68,16,14,D);ellipse(g,48,68,10,9,p.metal||'#b99a58');ellipse(g,48,68,4,4,G);
        g.fillStyle=D;g.roundRect(2,28,18,48,7);g.fill();g.roundRect(77,28,17,48,7);g.fill();g.roundRect(20,78,24,15,5);g.fill();g.roundRect(54,78,24,15,5);g.fill();
        if(mods.guard){g.fillStyle=p.metal||'#9ba4a5';g.roundRect(0,17,24,69,8);g.fill();g.roundRect(76,17,20,69,8);g.fill();g.strokeStyle=L;g.lineWidth=3;g.strokeRect(5,24,14,54);}
      }else if(kind==='dragon'){
        g.fillStyle=p.wing||'#66475f';g.beginPath();g.moveTo(40,49);g.bezierCurveTo(21,29,8,19,2,24);g.lineTo(9,68);g.bezierCurveTo(17,55,27,58,41,66);g.fill();g.save();g.translate(96,0);g.scale(-1,1);g.beginPath();g.moveTo(40,49);g.bezierCurveTo(21,29,8,19,2,24);g.lineTo(9,68);g.bezierCurveTo(17,55,27,58,41,66);g.fill();g.restore();
        g.fillStyle=grd(27,7,70,93,L,D);g.beginPath();g.moveTo(49,5);g.bezierCurveTo(30,14,26,34,32,53);g.lineTo(23,85);g.lineTo(41,93);g.lineTo(49,83);g.lineTo(58,93);g.lineTo(77,84);g.lineTo(67,52);g.bezierCurveTo(74,31,66,12,49,5);g.fill();
        path([[35,21],[30,3],[45,15]],D);path([[53,15],[69,2],[64,23]],D);ellipse(g,40,35,5,6,G);ellipse(g,59,35,5,6,G);path([[40,51],[49,58],[59,51]],p.belly||'#d5b65d');
        if(mods.crown)path([[29,24],[29,4],[42,16],[50,0],[59,16],[72,3],[69,26]],grd(0,0,0,27,'#fff2a0','#ba7720'));
      }else if(kind==='angel'){
        g.fillStyle=p.wing||'#eee';g.beginPath();g.moveTo(40,35);g.bezierCurveTo(22,15,7,11,1,20);g.bezierCurveTo(15,28,2,36,4,55);g.bezierCurveTo(17,47,26,61,40,67);g.fill();g.save();g.translate(96,0);g.scale(-1,1);g.beginPath();g.moveTo(40,35);g.bezierCurveTo(22,15,7,11,1,20);g.bezierCurveTo(15,28,2,36,4,55);g.bezierCurveTo(17,47,26,61,40,67);g.fill();g.restore();
        g.strokeStyle=G;g.shadowColor=G;g.shadowBlur=7;g.lineWidth=4;g.beginPath();g.ellipse(49,12,20,7,0,0,Math.PI*2);g.stroke();g.shadowColor='transparent';ellipse(g,49,34,18,17,p.skin||'#d9ae88');g.fillStyle=grd(27,49,70,94,L,D);g.beginPath();g.moveTo(32,46);g.lineTo(66,46);g.lineTo(78,94);g.lineTo(20,94);g.closePath();g.fill();ellipse(g,41,33,4,5,D);ellipse(g,58,33,4,5,D);g.fillStyle=G;g.fillRect(45,53,8,31);
      }else if(kind==='shadow'){
        g.fillStyle=grd(22,3,73,94,L,D);g.beginPath();g.moveTo(48,3);g.bezierCurveTo(24,6,18,27,25,46);g.lineTo(14,92);g.lineTo(41,81);g.lineTo(50,95);g.lineTo(61,81);g.lineTo(83,92);g.lineTo(72,43);g.bezierCurveTo(80,23,66,5,48,3);g.fill();
        ellipse(g,38,38,7,5,G);ellipse(g,62,38,7,5,G);g.fillStyle=p.cape||'#4e2743';g.beginPath();g.moveTo(25,48);g.bezierCurveTo(9,54,2,69,3,89);g.lineTo(33,77);g.closePath();g.fill();g.strokeStyle=G;g.shadowColor=G;g.shadowBlur=8;g.lineWidth=4;g.beginPath();g.moveTo(70,58);g.lineTo(91,91);g.stroke();
      }
      g.restore();
    });
  }

  function bossHD(kind,p){
    return canvas(256,256,2,(g,w,h)=>{
      const D=p.dark||INK,B=p.body,L=p.light,G=p.glow||'#76ecf0',grd=(a,b,c,d,e,f)=>{const z=g.createLinearGradient(a,b,c,d);z.addColorStop(0,e);z.addColorStop(1,f);return z;};
      g.translate(0,3);g.shadowColor='rgba(0,2,10,.7)';g.shadowBlur=8;g.shadowOffsetY=6;
      if(kind==='guardio'){
        g.fillStyle=grd(20,8,105,122,L,D);g.beginPath();g.roundRect(29,22,70,92,20);g.fill();g.fillStyle=B;g.roundRect(39,5,51,47,15);g.fill();
        ellipse(g,53,27,7,8,G);ellipse(g,78,27,7,8,G);g.fillStyle=p.mid||B;g.roundRect(40,53,47,47,10);g.fill();g.fillStyle=G;g.roundRect(53,63,23,24,5);g.fill();
        g.fillStyle=D;g.roundRect(5,42,32,77,13);g.fill();g.roundRect(94,42,30,77,13);g.fill();g.roundRect(27,101,34,24,9);g.fill();g.roundRect(72,101,34,24,9);g.fill();
      }else if(kind==='aquera'){
        g.strokeStyle=L;g.lineWidth=7;g.lineCap='round';for(let i=0;i<7;i++){g.beginPath();g.moveTo(64,118);g.bezierCurveTo(16+i*17,102,15+i*14,50,8+i*19,22);g.stroke();}
        g.fillStyle=grd(38,3,90,120,L,D);g.beginPath();g.moveTo(65,2);g.bezierCurveTo(47,31,31,47,35,77);g.bezierCurveTo(38,111,92,115,96,77);g.bezierCurveTo(99,48,78,31,65,2);g.fill();ellipse(g,54,55,7,9,G);ellipse(g,79,55,7,9,G);g.strokeStyle=D;g.lineWidth=4;g.beginPath();g.arc(67,68,13,.15*Math.PI,.85*Math.PI);g.stroke();
      }else if(kind==='nocturna'){
        g.fillStyle=grd(24,4,103,126,L,D);g.beginPath();g.moveTo(65,3);g.bezierCurveTo(35,7,29,35,38,58);g.lineTo(14,124);g.lineTo(51,109);g.lineTo(66,126);g.lineTo(82,108);g.lineTo(118,124);g.lineTo(93,58);g.bezierCurveTo(103,30,86,3,65,3);g.fill();
        ellipse(g,65,38,23,23,p.skin||'#c49a94');ellipse(g,56,38,5,7,G);ellipse(g,76,38,5,7,G);g.fillStyle=p.crown||'#b986da';g.beginPath();g.moveTo(41,24);g.lineTo(43,4);g.lineTo(57,17);g.lineTo(66,0);g.lineTo(77,17);g.lineTo(91,4);g.lineTo(89,25);g.closePath();g.fill();
        for(let i=0;i<5;i++){g.fillStyle=i%2?B:D;g.beginPath();g.ellipse(12+i*27,77+(i%2)*8,11,6,0,0,Math.PI*2);g.fill();}
      }else if(kind==='makinas'){
        g.fillStyle=grd(14,5,112,123,L,D);g.roundRect(19,16,94,95,19);g.fill();g.fillStyle=p.panel||'#344954';g.roundRect(37,29,58,39,10);g.fill();g.fillStyle=G;g.shadowColor=G;g.shadowBlur=12;g.roundRect(50,40,32,18,5);g.fill();g.shadowColor='rgba(0,2,10,.7)';
        ellipse(g,66,88,25,23,D);ellipse(g,66,88,16,15,B);ellipse(g,66,88,7,7,G);g.fillStyle=D;g.roundRect(1,32,27,80,12);g.fill();g.roundRect(105,32,25,80,12);g.fill();g.roundRect(19,102,39,24,8);g.fill();g.roundRect(75,102,39,24,8);g.fill();
        // 肩装甲、継ぎ目、放熱孔を重ね、大型機械としての密度を出す。
        g.strokeStyle='rgba(220,244,241,.48)';g.lineWidth=2.2;g.beginPath();g.moveTo(30,22);g.lineTo(20,43);g.lineTo(20,93);g.moveTo(102,22);g.lineTo(112,43);g.lineTo(112,93);g.moveTo(35,75);g.lineTo(97,75);g.stroke();
        g.fillStyle=p.light||L;g.roundRect(7,39,10,53,4);g.fill();g.roundRect(115,39,9,53,4);g.fill();
        for(let i=0;i<4;i++){g.fillStyle='rgba(8,17,25,.72)';g.roundRect(39+i*14,20,8,5,2);g.fill();}
        for(let i=0;i<5;i++){ellipse(g,14+i*26,14,4,4,G);ellipse(g,14+i*26,14,1.3,1.3,'#efffff');}
        for(const [x,y] of [[30,33],[101,33],[30,96],[101,96]]){ellipse(g,x,y,3,3,p.light||L);ellipse(g,x,y,1,1,D);}
      }else if(kind==='arcacore'){
        for(let r=58;r>18;r-=12){g.strokeStyle=r%3?B:G;g.lineWidth=4;g.globalAlpha=.8;g.beginPath();g.ellipse(65,65,r,r*.42,r*.08,0,Math.PI*2);g.stroke();}g.globalAlpha=1;
        g.fillStyle=grd(25,13,105,117,L,D);g.beginPath();g.moveTo(65,4);g.lineTo(113,33);g.lineTo(111,92);g.lineTo(65,124);g.lineTo(18,92);g.lineTo(17,34);g.closePath();g.fill();g.fillStyle=B;g.beginPath();g.moveTo(65,21);g.lineTo(96,40);g.lineTo(94,82);g.lineTo(65,104);g.lineTo(35,82);g.lineTo(34,41);g.closePath();g.fill();
        g.fillStyle=G;g.shadowColor=G;g.shadowBlur=15;g.roundRect(50,46,30,40,8);g.fill();g.fillStyle='#fffbd5';g.roundRect(57,54,16,24,5);g.fill();
      }
    });
  }

  function installMonsters(){
    const defs={
      m_slime:['slime',{body:'#4fbad4',light:'#8be7e4',dark:'#183d5c'}],m_slime_red:['slime',{body:'#d45245',light:'#ff9a61',dark:'#632737',glow:'#ffe270'}],m_slime_gold:['slime',{body:'#d9a93d',light:'#ffe27b',dark:'#6b4927'}, {crown:true}],m_slime_metal:['slime',{body:'#8799ab',light:'#e5edf2',dark:'#3a4455',glow:'#a8f4ff'}],
      m_bat:['bat',{body:'#72579a',light:'#ad86c3',dark:'#29203e'}],m_bat_dark:['bat',{body:'#3b385e',light:'#64658e',dark:'#151426',glow:'#ff5e72'}],
      m_rat:['rat',{body:'#80715f',light:'#c1a984',dark:'#302d33'}],m_rat_shadow:['rat',{body:'#48405f',light:'#786987',dark:'#1c1928',glow:'#74e4ff'}],
      m_goblin:['goblin',{body:'#6f9a55',light:'#a7c471',dark:'#26362b',cloth:'#775038'}],m_goblin_soldier:['goblin',{body:'#6b8f58',light:'#9cb978',dark:'#27332e',cloth:'#4b5c79',metal:'#98a9b2',metalL:'#d7d7cd'},{armor:true}],m_goblin_lord:['goblin',{body:'#789553',light:'#b1c66f',dark:'#2b3026',cloth:'#713943'},{crown:true}],
      m_aquan:['aquan',{body:'#3e94b5',light:'#76d9e5',dark:'#163649',glow:'#e2faff'}],m_aquan_mist:['aquan',{body:'#758baa',light:'#b8ced8',dark:'#2a344c',glow:'#efffff'}],
      m_mush:['mush',{body:'#d16a4b',light:'#f5a35f',dark:'#512b37',spot:'#ffe18a',stem:'#d7c39d'}],m_mush_poison:['mush',{body:'#8853a4',light:'#ca7bd1',dark:'#382544',spot:'#b9f276',stem:'#b3aaa1'}],
      m_thief:['thief',{body:'#4f3b61',light:'#7d638d',dark:'#211a2b',skin:'#bc8767',cloth:'#813849',metal:'#d5c46f',glow:'#f4d36c'}],
      m_rock:['rock',{body:'#746d64',mid:'#8e8474',light:'#b3a88d',dark:'#302d31',glow:'#f07b57'}],m_rock_metal:['rock',{body:'#667684',mid:'#8598a2',light:'#bccbd0',dark:'#29313e',glow:'#68e2ef'}],m_rock_lava:['rock',{body:'#7d3930',mid:'#9e4a36',light:'#cc7145',dark:'#331b20',glow:'#ffe064'},{lava:true}],
      m_ghost:['ghost',{body:'#8580a8',light:'#b9b6d4',dark:'#28253c',glow:'#76e9f2'}],m_ghost_wraith:['ghost',{body:'#5e467d',light:'#9272aa',dark:'#1d172b',glow:'#d98cff'}],m_ghost_death:['ghost',{body:'#465460',light:'#788891',dark:'#171c25',glow:'#e7d05d'}],
      m_plant:['plant',{body:'#397a4b',light:'#6ab665',dark:'#173626',mouth:'#c64c52'}],m_plant_eater:['plant',{body:'#667a39',light:'#99a852',dark:'#2b361c',mouth:'#e05a42'}],
      m_machine:['machine',{body:'#7b8388',light:'#bbc0bc',dark:'#292f38',panel:'#384957',metal:'#c29b50',glow:'#66e5de'}],m_machine_guard:['machine',{body:'#8b7549',light:'#cfb66e',dark:'#322c28',panel:'#4b3e31',metal:'#9ba4a5',glow:'#f06055'},{guard:true}],m_machine_makina:['machine',{body:'#525e76',light:'#8999ad',dark:'#202633',panel:'#303c51',metal:'#aeb8bd',glow:'#f4d665'}],
      m_dragonchild:['dragon',{body:'#4b9260',light:'#78bd72',dark:'#1d392c',wing:'#6d4d78',belly:'#d5b65d',glow:'#ffd15b'}],m_dragon:['dragon',{body:'#467958',light:'#74a56a',dark:'#1d3329',wing:'#6b3f4e',belly:'#c6a75d',glow:'#ffb94f'}],m_dragon_noir:['dragon',{body:'#3c3850',light:'#655d75',dark:'#171522',wing:'#492d45',belly:'#887d82',glow:'#70e2ff'}],
      m_angel:['angel',{body:'#e7e1d0',light:'#fff9e7',dark:'#4c4b60',wing:'#f2f1e9',skin:'#d9ae88',glow:'#f6dc69'}],m_angel_dark:['angel',{body:'#5d526b',light:'#887891',dark:'#211b2b',wing:'#71647b',skin:'#b48b83',glow:'#ef596d'}],
      m_shadow:['shadow',{body:'#25243a',light:'#47425a',dark:'#0c0b14',cape:'#4e2743',glow:'#56ddf2'}],
      m_boss_dronzo:['thief',{body:'#38263f',light:'#6b3d55',dark:'#160f1c',skin:'#b37b62',cloth:'#8c354a',metal:'#e2b74e',glow:'#ffd96b'}],
      m_boss_gardura:['plant',{body:'#8f762f',light:'#d0b44f',dark:'#3c341d',mouth:'#b6433e'}],
      m_boss_dragnoa:['dragon',{body:'#a93632',light:'#dc6244',dark:'#431c24',wing:'#68263a',belly:'#e0b05a',glow:'#ffe26a'},{crown:true}],
      m_boss_seraphos:['angel',{body:'#f1ead2',light:'#fffdf2',dark:'#524a57',wing:'#fff9df',skin:'#dab28e',glow:'#ffdc4f'}],
      m_boss_shadowsora:['shadow',{body:'#16182a',light:'#343552',dark:'#070710',cape:'#571f39',glow:'#45ecff'}],
    };
    for(const [name,[kind,p,mods]] of Object.entries(defs)) cache[name]=monsterHD(kind,p,mods||{});
    cache.b_guardio=bossHD('guardio',{body:'#6f7375',mid:'#8e918b',light:'#b8b8aa',dark:'#373b43',glow:'#f07855'});
    cache.b_aquera=bossHD('aquera',{body:'#348cae',light:'#78d7dd',dark:'#173d52',glow:'#e8ffff'});
    cache.b_nocturna=bossHD('nocturna',{body:'#3b294f',light:'#765186',dark:'#171020',skin:'#c49a94',crown:'#b986da',glow:'#c57df1'});
    cache.b_makinas=bossHD('makinas',{body:'#68717a',light:'#adb2ad',dark:'#2a3038',panel:'#344954',glow:'#62e6dc'});
    cache.b_arcacore=bossHD('arcacore',{body:'#5e78d8',light:'#eff3f4',dark:'#253365',glow:'#6ff1f4'});
  }

  function drawTile(g,id,x,th){
    const P=(a,b,w,h,c)=>rect(g,x+a,b,w,h,c);
    const floor=()=>{P(0,0,16,16,th.floor);P(0,7,16,1,th.floorD);P(0,15,16,1,th.floorD);P(7,0,1,8,th.floorD);P(3,8,1,8,th.floorD);P(11,8,1,8,th.floorD);P(1,1,5,1,th.floorL);P(8,9,3,1,th.floorL);P(5,6,2,1,'#00000022');};
    if(id===T.FLOOR){floor();}
    else if(id===T.WALL){P(0,0,16,16,th.wall);for(let y=3;y<16;y+=4)P(0,y,16,1,th.wallD);P(2,0,1,3,th.wallL);P(9,4,1,3,th.wallD);P(5,8,1,3,th.wallD);P(12,12,1,3,th.wallD);P(1,1,6,1,th.wallL);P(0,15,16,1,'#00000055');}
    else if(id===T.UP){floor();for(let i=0;i<4;i++){P(i*2,12-i*4,16-i*2,4,i%2?th.wallL:th.floorL);P(i*2,12-i*4,16-i*2,1,th.wallD);}}
    else if(id===T.DOWN){floor();P(2,2,12,12,INK);P(4,4,10,2,th.wallD);P(2,2,2,12,th.wallL);P(5,8,9,1,'#ffffff18');}
    else if(id===T.WATER){P(0,0,16,16,'#24547a');P(0,0,16,2,'#367ca0');P(0,8,16,2,'#1c4267');P(1,4,6,1,'#78d3db');P(9,12,5,1,'#5ab6c9');P(3,14,4,1,'#a0edf0');}
    else if(id===T.GRASS){P(0,0,16,16,th.floor);P(0,15,16,1,th.floorD);for(const [a,b]of[[2,4],[6,12],[10,3],[14,9],[4,7]]){P(a,b,1,4,th.floorD);P(a+1,b+2,1,2,th.floorL);}}
    else if(id===T.TREE){P(0,0,16,16,th.floor);P(6,8,5,8,'#5a3922');P(8,9,2,7,'#9a6331');P(2,3,12,8,'#1d4d34');P(4,1,9,8,'#2d7447');P(1,6,6,5,'#28613c');P(6,2,4,3,'#55a05b');P(9,5,4,3,'#3c8b4e');P(3,9,11,2,'#183c2a');}
    else if(id===T.CHEST||id===T.CHEST_OPEN){floor();if(id===T.CHEST){P(2,5,12,9,'#553220');P(3,4,10,5,'#aa6d31');P(4,5,8,2,'#d59543');P(2,9,12,2,'#35202a');P(7,8,3,4,'#e5c15a');}else{P(2,3,12,3,'#6c4328');P(3,7,10,7,'#6e4227');P(4,8,8,3,INK);P(7,11,3,3,'#d9b452');}}
    else if(id===T.COUNTER){P(0,0,16,16,'#4d3022');P(0,0,16,6,'#96633b');P(0,0,16,2,'#ce9a5e');P(0,6,16,2,'#342126');P(2,9,12,1,'#7c4c31');}
    else if(id===T.CARPET){P(0,0,16,16,'#6e263c');P(2,0,12,16,'#a23d51');P(4,2,8,12,'#7d2d46');P(7,2,2,12,'#d9a84f');P(3,0,1,16,'#d9a84f');P(12,0,1,16,'#d9a84f');}
    else if(id===T.PILLAR){floor();P(3,0,10,16,th.wallD);P(5,1,6,14,th.wall);P(6,1,2,14,th.wallL);P(10,1,2,14,'#00000038');P(2,0,12,3,th.wallL);P(2,14,12,2,th.wallD);}
    else if(id===T.VOID){P(0,0,16,16,th.bg);P(2,3,1,1,th.sky);P(12,7,1,1,th.accent);P(7,13,1,1,'#ffffff88');}
    else if(id===T.BED){floor();P(1,2,14,13,'#52283a');P(2,3,12,4,'#eee5cf');P(2,7,12,7,'#9b3f51');P(3,8,10,2,'#c96768');P(1,14,14,2,'#392434');}
    else if(id===T.SIGN){floor();P(3,2,10,8,'#563721');P(4,3,8,6,'#b18452');P(5,4,6,1,'#614126');P(5,6,4,1,'#614126');P(7,10,2,6,'#68442b');}
    else if(id===T.CIRCLE){floor();g.strokeStyle=th.accent;g.lineWidth=1;g.strokeRect(x+2.5,2.5,11,11);g.beginPath();g.moveTo(x+8,1);g.lineTo(x+14,8);g.lineTo(x+8,15);g.lineTo(x+2,8);g.closePath();g.stroke();P(7,7,2,2,'#eaffff');}
    else if(id===T.TABLE){floor();P(1,4,14,8,'#5b3a26');P(2,3,12,6,'#a57342');P(3,4,10,2,'#cd9b60');P(2,12,3,4,'#4a2e22');P(11,12,3,4,'#4a2e22');}
    else if(id===T.DOOR){P(0,0,16,16,th.wallD);P(2,1,12,15,'#3b2630');P(3,2,10,14,'#805033');P(5,3,6,13,'#9c653a');P(10,9,2,2,'#f1c65d');P(1,0,14,2,th.wallL);}
  }

  function seeded(seed){let n=seed|0;return()=>{n=Math.imul(n^n>>>15,1|n);n^=n+Math.imul(n^n>>>7,61|n);return((n^n>>>14)>>>0)/4294967296;};}
  function drawTileHD(g,id,ox,th,tier){
    const rng=seeded(id*1777+tier*7919+31),P=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(ox+x,y,w,h);};
    const grad=(x0,y0,x1,y1,a,b)=>{const z=g.createLinearGradient(ox+x0,y0,ox+x1,y1);z.addColorStop(0,a);z.addColorStop(1,b);return z;};
    const floor=()=>{
      g.fillStyle=grad(0,0,0,64,th.floorL,th.floor);g.fillRect(ox,0,64,64);
      g.strokeStyle=th.floorD;g.lineWidth=2;for(let y=16;y<64;y+=16){g.beginPath();g.moveTo(ox,y);g.lineTo(ox+64,y);g.stroke();}
      for(let row=0;row<4;row++){const shift=row%2?10:0;for(let x=shift;x<64;x+=30){P(x,row*16,2,16,'#00000024');P(x+2,row*16+1,12,1,'#ffffff20');}}
      for(let i=0;i<10;i++){const x=rng()*60|0,y=rng()*58|0;P(x,y,1+(rng()*3|0),1,'#0000001c');}
    };
    if(id===T.FLOOR) floor();
    else if(id===T.WALL){
      g.fillStyle=grad(0,0,64,64,th.wallL,th.wallD);g.fillRect(ox,0,64,64);
      for(let row=0;row<6;row++){const y=row*11,shift=row%2?9:0;P(0,y+9,64,2,'#00000070');P(0,y,64,1,'#ffffff24');for(let x=shift;x<64;x+=25){P(x,y,2,10,'#00000055');P(x+2,y+1,1,8,'#ffffff18');}}
      P(0,58,64,6,'#11152399');for(let i=0;i<6;i++){const x=rng()*58|0,y=rng()*50|0;P(x,y,4+rng()*8|0,1,'#ffffff16');}
    }else if(id===T.UP){floor();for(let i=0;i<5;i++){const y=52-i*11,x=i*5;P(x,y,64-x,12,i%2?th.wallL:th.floorL);P(x,y,64-x,3,th.wallD);P(x+3,y+3,61-x,2,'#ffffff35');}}
    else if(id===T.DOWN){floor();g.fillStyle=grad(8,8,48,56,'#20283a',INK);g.fillRect(ox+7,7,50,50);P(7,7,50,7,th.wallD);P(7,7,7,50,th.wallL);for(let y=19;y<55;y+=10)P(15,y,40,2,'#ffffff14');}
    else if(id===T.WATER){
      g.fillStyle=grad(0,0,0,64,'#3d88aa','#173e68');g.fillRect(ox,0,64,64);
      for(let i=0;i<9;i++){const x=rng()*52|0,y=4+i*7+(rng()*4|0),w=7+rng()*17|0;g.strokeStyle=i%3===0?'#b0f1ef88':'#6acbd788';g.lineWidth=i%3===0?2:1;g.beginPath();g.moveTo(ox+x,y);g.bezierCurveTo(ox+x+w*.3,y-2,ox+x+w*.7,y+2,ox+x+w,y);g.stroke();}
      P(0,0,64,3,'#a9e9e650');
    }else if(id===T.GRASS){
      g.fillStyle=grad(0,0,0,64,th.floorL,th.floorD);g.fillRect(ox,0,64,64);
      for(let i=0;i<28;i++){const x=rng()*62|0,y=6+rng()*56|0,h=3+rng()*8|0;g.strokeStyle=i%4?th.floorD:th.floorL;g.lineWidth=1;g.beginPath();g.moveTo(ox+x,y+h);g.quadraticCurveTo(ox+x+(i%2?2:-2),y+h/2,ox+x+(i%3-1),y);g.stroke();}
      for(let i=0;i<3;i++){const x=5+rng()*54|0,y=8+rng()*48|0;P(x,y,3,3,i%2?'#f0c9dd':'#f3df82');P(x+1,y+1,1,1,'#fff');}
    }else if(id===T.TREE){
      g.fillStyle=th.floor;g.fillRect(ox,0,64,64);g.fillStyle=grad(25,20,42,64,'#9b6635','#3f291d');g.fillRect(ox+25,26,15,38);P(31,25,5,39,'#d08a43');
      const blobs=[[18,22,17],[32,14,19],[47,25,16],[27,33,21],[45,38,15]];for(const [x,y,r]of blobs){g.fillStyle='#193e2c';g.beginPath();g.arc(ox+x,y,r+3,0,Math.PI*2);g.fill();g.fillStyle=iShade(th.floorD,'#2e7547');g.beginPath();g.arc(ox+x,y-2,r,0,Math.PI*2);g.fill();g.fillStyle='#ffffff18';g.beginPath();g.arc(ox+x-5,y-7,r*.45,0,Math.PI*2);g.fill();}
    }else if(id===T.CHEST||id===T.CHEST_OPEN){floor();g.save();g.translate(ox,0);g.shadowColor='#0009';g.shadowBlur=5;g.shadowOffsetY=4;if(id===T.CHEST){g.fillStyle='#4b2a20';g.fillRect(7,20,50,36);g.fillStyle=grad(-ox+9,15,-ox+9,43,'#d89546','#794126');g.fillRect(9,15,46,28);g.strokeStyle='#e4b15d';g.lineWidth=3;g.strokeRect(10.5,16.5,43,38);g.fillStyle='#f4d46b';g.fillRect(28,31,9,14);}else{g.fillStyle='#5f3724';g.fillRect(8,29,48,28);g.fillStyle='#1b1720';g.fillRect(12,32,40,16);g.fillStyle='#a66634';g.fillRect(8,10,48,13);g.strokeStyle='#d5a253';g.lineWidth=3;g.strokeRect(9.5,11.5,45,11);}g.restore();}
    else if(id===T.COUNTER){g.fillStyle=grad(0,0,0,64,'#c99761','#593622');g.fillRect(ox,0,64,64);P(0,0,64,15,'#d8ad75');P(0,15,64,5,'#3b2630');for(let x=6;x<64;x+=20){P(x,23,2,38,'#ffffff18');P(x+14,23,2,38,'#00000035');}}
    else if(id===T.CARPET){g.fillStyle=grad(0,0,0,64,'#b64662','#68243e');g.fillRect(ox,0,64,64);P(6,0,4,64,'#dfb85c');P(54,0,4,64,'#dfb85c');P(27,0,10,64,'#7d2947');for(let y=5;y<64;y+=16){P(13,y,8,8,'#d18372');P(43,y,8,8,'#d18372');}}
    else if(id===T.PILLAR){floor();g.fillStyle=grad(16,0,48,0,th.wallL,th.wallD);g.fillRect(ox+16,0,32,64);P(11,0,42,10,th.wallL);P(11,54,42,10,th.wallD);P(20,6,7,50,'#ffffff30');P(41,6,5,50,'#00000045');g.strokeStyle=th.accent;g.globalAlpha=.25;g.strokeRect(ox+24.5,19.5,15,20);g.globalAlpha=1;}
    else if(id===T.VOID){g.fillStyle=grad(0,0,0,64,th.bg,'#02040b');g.fillRect(ox,0,64,64);for(let i=0;i<7;i++){const x=rng()*62|0,y=rng()*62|0,s=i%4===0?2:1;P(x,y,s,s,i%3?th.sky:'#fff2b0');}}
    else if(id===T.BED){floor();g.save();g.translate(ox,0);g.shadowColor='#0008';g.shadowBlur=5;g.shadowOffsetY=3;g.fillStyle='#432335';g.fillRect(4,5,56,55);g.fillStyle='#f2eadb';g.fillRect(7,8,50,16);g.fillStyle=grad(-ox+7,24,-ox+7,58,'#bd5669','#742b48');g.fillRect(7,24,50,33);g.fillStyle='#ffffff30';g.fillRect(10,27,44,4);g.restore();}
    else if(id===T.SIGN){floor();g.save();g.translate(ox,0);g.shadowColor='#0008';g.shadowBlur=4;g.fillStyle='#55321f';roundRect(g,10,8,44,31,4);g.fill();g.fillStyle='#c08c54';roundRect(g,13,11,38,25,3);g.fill();g.strokeStyle='#6b4528';g.lineWidth=2;g.beginPath();g.moveTo(19,18);g.lineTo(44,18);g.moveTo(19,26);g.lineTo(38,26);g.stroke();g.fillStyle='#684329';g.fillRect(28,39,8,25);g.restore();}
    else if(id===T.CIRCLE){floor();g.save();g.translate(ox,0);g.strokeStyle=th.accent;g.lineWidth=2;g.shadowColor=th.accent;g.shadowBlur=7;g.beginPath();g.arc(32,32,23,0,Math.PI*2);g.stroke();g.beginPath();g.moveTo(32,6);g.lineTo(55,45);g.lineTo(9,45);g.closePath();g.stroke();g.fillStyle='#eaffff';g.beginPath();g.arc(32,32,4,0,Math.PI*2);g.fill();g.restore();}
    else if(id===T.TABLE){floor();g.save();g.translate(ox,0);g.shadowColor='#0008';g.shadowBlur=5;g.fillStyle=grad(-ox+4,11,-ox+4,45,'#c28c54','#69402a');roundRect(g,4,11,56,36,5);g.fill();g.fillStyle='#ffffff20';roundRect(g,8,14,48,7,3);g.fill();g.fillStyle='#4a2d22';g.fillRect(8,47,9,17);g.fillRect(47,47,9,17);g.restore();}
    else if(id===T.DOOR){g.fillStyle=th.wallD;g.fillRect(ox,0,64,64);g.fillStyle=grad(9,4,55,4,'#b0713f','#4b2c26');roundRect(g,ox+8,3,48,61,8);g.fill();P(13,8,38,56,'#7c472e');P(18,8,4,56,'#b97742');P(45,8,4,56,'#442b2b');g.fillStyle='#f3d36b';g.shadowColor='#ffd875';g.shadowBlur=8;g.beginPath();g.arc(ox+44,37,4,0,Math.PI*2);g.fill();}
    else if(id===T.HOUSE){
      g.fillStyle=grad(0,0,0,64,'#c7b99a','#7e7465');g.fillRect(ox,0,64,64);
      for(let y=10;y<64;y+=15){P(0,y,64,2,'#514d4a77');P(0,y+2,64,1,'#ffffff35');}
      for(let y=0;y<60;y+=15){const shift=(y/15)%2?12:0;for(let x=shift;x<64;x+=28)P(x,y,2,12,'#625e5888');}
      P(5,6,8,50,'#ffffff28');P(52,5,7,53,'#3b394044');P(0,58,64,6,'#332d30aa');
    }else if(id===T.ROOF){
      g.fillStyle=grad(0,0,0,64,'#7c4050','#342637');g.fillRect(ox,0,64,64);
      for(let y=0;y<64;y+=12){P(0,y+9,64,4,'#241c2b');for(let x=(y/12)%2?0:10;x<64;x+=24){P(x,y,3,10,'#a4565e66');P(x+3,y+1,16,2,'#d07b7155');}}
      P(0,0,64,5,'#d09a7455');P(0,57,64,7,'#1d1925cc');
    }else if(id===T.PATH){
      g.fillStyle=grad(0,0,0,64,'#c1b394','#7f7769');g.fillRect(ox,0,64,64);
      for(let i=0;i<14;i++){const x=rng()*59|0,y=rng()*58|0,w=4+rng()*12|0;P(x,y,w,2,i%3?'#554f4b55':'#ffffff44');if(i%4===0)P(x,y+2,2,5,'#5d585355');}
      P(0,0,64,3,'#e3d8ba55');P(0,61,64,3,'#443f3c55');
    }else if(id===T.FLOWER){
      g.fillStyle=grad(0,0,0,64,th.floorL,th.floorD);g.fillRect(ox,0,64,64);
      for(let i=0;i<10;i++){const x=6+rng()*52|0,y=8+rng()*47|0;g.strokeStyle='#35643e';g.lineWidth=2;g.beginPath();g.moveTo(ox+x,y+8);g.lineTo(ox+x,y);g.stroke();g.fillStyle=i%3===0?'#f1d269':i%3===1?'#e58ba8':'#b9d7ef';g.beginPath();g.arc(ox+x,y,4,0,Math.PI*2);g.fill();g.fillStyle='#fff1b5';g.beginPath();g.arc(ox+x,y,1.5,0,Math.PI*2);g.fill();}
      P(0,58,64,6,'#2d5337');
    }else if(id===T.LAMP){
      g.fillStyle=th.floor;g.fillRect(ox,0,64,64);g.fillStyle='#29303a';g.fillRect(ox+29,25,7,39);P(21,55,23,9,'#252b35');P(25,17,15,11,'#3c4751');
      g.fillStyle='#ffe08a';g.shadowColor='#ffd668';g.shadowBlur=15;roundRect(g,ox+27,5,11,17,3);g.fill();g.fillStyle='#fff5c7';g.fillRect(ox+30,8,5,8);g.shadowColor='transparent';P(24,3,17,4,'#303844');P(29,0,7,5,'#303844');
    }else if(id===T.FENCE){
      g.fillStyle=th.floor;g.fillRect(ox,0,64,64);g.fillStyle=grad(0,20,0,54,'#b98b58','#5a3827');g.fillRect(ox,27,64,9);g.fillRect(ox,47,64,8);for(let x=4;x<64;x+=20){P(x,14,9,50,'#68432d');P(x+2,10,5,47,'#bf8a50');P(x+1,8,7,5,'#d9ad69');}P(0,33,64,3,'#ffffff2a');
    }
  }
  function roundRect(g,x,y,w,h,r){g.beginPath();g.roundRect(x,y,w,h,r);}
  function iShade(fallback){return fallback;}
  function getTileSheet(tier){
    if(tileCache[tier])return tileCache[tier];const th=TIER_THEMES[tier]||TIER_THEMES[0];
    const c=canvas(TILE_SIZE*24,TILE_SIZE,1,(g)=>{g.imageSmoothingEnabled=true;for(let i=0;i<24;i++)drawTileHD(g,i,i*TILE_SIZE,th,tier);});tileCache[tier]=c;return c;
  }
  function drawBattleBackdrop(g,tier,time){
    const th=TIER_THEMES[tier]||TIER_THEMES[1],W=512,H=448;
    const sky=g.createLinearGradient(0,0,0,300);sky.addColorStop(0,th.bg);sky.addColorStop(.55,th.sky);sky.addColorStop(1,th.wallD);
    g.fillStyle=sky;g.fillRect(0,0,W,300);
    // 巨大な塔内アーチと遠景の縦構造。
    g.fillStyle=th.wallD;g.fillRect(0,62,66,244);g.fillRect(446,62,66,244);g.fillRect(0,52,512,24);
    g.fillStyle=th.wall;for(let x=12;x<512;x+=42){g.fillRect(x,58,25,8);g.fillRect(x+4,67,17,8);}
    g.strokeStyle=th.wallL;g.lineWidth=7;g.beginPath();g.arc(256,262,210,Math.PI,Math.PI*2);g.stroke();
    g.strokeStyle=th.wallD;g.lineWidth=18;g.beginPath();g.arc(256,265,223,Math.PI,Math.PI*2);g.stroke();
    for(let x=92;x<440;x+=58){g.fillStyle='rgba(5,10,20,.28)';g.fillRect(x,112+(x%4)*8,18,150);g.fillStyle=th.accent;g.globalAlpha=.22;g.fillRect(x+7,125+(x%4)*8,3,95);g.globalAlpha=1;}
    // 地面は遠近のある環状石床。
    const floor=g.createLinearGradient(0,264,0,H);floor.addColorStop(0,th.floorL);floor.addColorStop(.15,th.floor);floor.addColorStop(1,th.floorD);g.fillStyle=floor;g.fillRect(0,264,W,184);
    g.strokeStyle=th.floorD;g.lineWidth=2;for(let y=280;y<448;y+=22) {g.beginPath();g.moveTo(0,y);g.lineTo(W,y);g.stroke();}
    for(let x=-80;x<600;x+=48){g.beginPath();g.moveTo(256+(x-256)*.18,264);g.lineTo(x,448);g.stroke();}
    g.strokeStyle=th.accent;g.globalAlpha=.25;g.lineWidth=2;g.beginPath();g.ellipse(256,333,128,31,0,0,Math.PI*2);g.stroke();g.beginPath();g.ellipse(256,333,88,21,0,0,Math.PI*2);g.stroke();g.globalAlpha=1;
    // 小さな光粒はテーマ色に限定。
    for(let i=0;i<22;i++){const x=(i*83+37)%512,y=(i*47+Math.floor(time*8))%250;g.fillStyle=i%4?th.accent:'#fff4bd';g.globalAlpha=.18+(i%3)*.12;g.fillRect(x,y,2,2);}g.globalAlpha=1;
    const shade=g.createRadialGradient(256,270,100,256,230,370);shade.addColorStop(0,'rgba(0,0,0,0)');shade.addColorStop(1,'rgba(0,0,8,.55)');g.fillStyle=shade;g.fillRect(0,0,W,H);
  }
  function init(){installMonsters();}
  function get(name){return cache[name];}
  function register(name,c){cache[name]=c;}
  return {init,get,register,getTileSheet,drawBattleBackdrop,T,TIER_THEMES,TILE_SIZE};
})();
