// ============================================================
// アルカの塔 - Character System III
// 全人物を新規の20px論理グリッドと固有シルエットで生成する。
// ============================================================
'use strict';

const CharGen = (() => {
  const INK='#111525';
  const SPECS={
    hero:{role:'hero',skin:'#d9a076',skinL:'#f1c49b',hair:'#6b3d28',hairL:'#9c6238',coat:'#255b9d',coatL:'#4182ca',cloth:'#eee3c8',dark:'#27324a',boot:'#473328',accent:'#bd3442',gold:'#d9b558',glow:'#66e9ef'},
    rino:{role:'rino',skin:'#e0aa80',skinL:'#f3cba2',hair:'#a84f28',hairL:'#df7634',coat:'#9d3656',coatL:'#c8586c',cloth:'#eee1c6',dark:'#58363f',boot:'#553a2c',accent:'#f3ead7',gold:'#c9a95c',glow:'#6fe0a4'},
    gald:{role:'gald',skin:'#a96f53',skinL:'#cf9872',hair:'#25232a',hairL:'#49383a',coat:'#535e6d',coatL:'#8a969d',cloth:'#303846',dark:'#202631',boot:'#28262a',accent:'#8e2f37',gold:'#b58b4c',glow:'#cfdeea'},
    fio:{role:'fio',skin:'#d5a988',skinL:'#ecc7a7',hair:'#abb7c2',hairL:'#e4e8e7',coat:'#176471',coatL:'#278a91',cloth:'#d8d3c5',dark:'#273340',boot:'#29323a',accent:'#d7ae55',gold:'#d7ae55',glow:'#58e4ee'},
    man:{role:'man',skin:'#c9916e',skinL:'#e3b28a',hair:'#5a4030',hairL:'#805b3b',coat:'#3f704e',coatL:'#66955e',cloth:'#76553b',dark:'#30342d',boot:'#49352a',accent:'#bf9a58'},
    woman:{role:'woman',skin:'#d9a17d',skinL:'#efc29b',hair:'#8d432d',hairL:'#c46b38',coat:'#8b536c',coatL:'#ba7184',cloth:'#d6b991',dark:'#473340',boot:'#50342e',accent:'#e4c46b'},
    elder:{role:'elder',skin:'#c99979',skinL:'#e5b998',hair:'#c4cad0',hairL:'#f1f0e9',coat:'#5e477b',coatL:'#8266a0',cloth:'#514064',dark:'#292536',boot:'#3e3147',accent:'#d4b558'},
    merchant:{role:'merchant',skin:'#cf966e',skinL:'#ebb888',hair:'#5a3b27',hairL:'#875b32',coat:'#9b5d2f',coatL:'#ce8745',cloth:'#765136',dark:'#403027',boot:'#4a3328',accent:'#e5c477'},
    guard:{role:'guard',skin:'#c98f69',skinL:'#e6b184',hair:'#43352f',hairL:'#655043',coat:'#66717c',coatL:'#9da7aa',cloth:'#384657',dark:'#242b36',boot:'#30343a',accent:'#9a3139'},
    child:{role:'child',skin:'#dfa77a',skinL:'#f3c99d',hair:'#a95a2e',hairL:'#da813c',coat:'#3e80a4',coatL:'#62acd0',cloth:'#4a577d',dark:'#2b3448',boot:'#563a2a',accent:'#e7cb67',small:true},
    sage:{role:'sage',skin:'#d1a17f',skinL:'#e9c09e',hair:'#aeb5b6',hairL:'#e4e4dd',coat:'#356c79',coatL:'#5797a1',cloth:'#3d5e73',dark:'#293440',boot:'#2d3843',accent:'#d3b45e'},
    celest:{role:'celest',skin:'#dbc0a8',skinL:'#f1deca',hair:'#d8ca91',hairL:'#fff0b7',coat:'#d7dbe1',coatL:'#f5f2e9',cloth:'#909cb3',dark:'#4b5268',boot:'#6e7587',accent:'#e8c55a'},
  };
  function cv(draw){
    // 画面上は従来どおり32px。素材は64pxで持ち、最終キャンバス上で1:1表示する。
    const c=document.createElement('canvas');c.width=64;c.height=64;
    const g=c.getContext('2d');g.imageSmoothingEnabled=true;g.scale(3.2,3.2);
    g.shadowColor='rgba(2,5,12,.48)';g.shadowBlur=.55;g.shadowOffsetY=.45;
    draw(g);g.shadowColor='transparent';return c;
  }
  function R(g,x,y,w,h,c){g.fillStyle=c;g.fillRect(x,y,w,h);}
  function P(g,pts,c){g.fillStyle=c;g.beginPath();g.moveTo(...pts[0]);for(let i=1;i<pts.length;i++)g.lineTo(...pts[i]);g.closePath();g.fill();}
  function L(g,pts,c,w=1){g.strokeStyle=c;g.lineWidth=w;g.lineJoin='miter';g.beginPath();g.moveTo(...pts[0]);for(let i=1;i<pts.length;i++)g.lineTo(...pts[i]);g.stroke();}
  function flip(c){const n=document.createElement('canvas');n.width=c.width;n.height=c.height;const g=n.getContext('2d');g.translate(n.width,0);g.scale(-1,1);g.drawImage(c,0,0);return n;}

  function body(g,s,dir,frame){
    const dy=s.small?2:0, step=frame?1:0;
    // shadow-space outline first
    if(dir==='d'||dir==='u'){
      R(g,6,8+dy,8,8,INK);R(g,4,9+dy,3,6,INK);R(g,13,9+dy,3,6,INK);
      R(g,6,15+dy,4,4-step,INK);R(g,11,15+dy,4,4-(1-step),INK);
      R(g,7,9+dy,6,6,s.coat);R(g,7,10+dy,2,5,s.coatL);R(g,12,10+dy,1,5,s.dark);
      R(g,5,10+dy,2,4,s.coat);R(g,13,10+dy,2,4,s.dark);
      R(g,7,15+dy,3,3-step,s.cloth);R(g,11,15+dy,3,3-(1-step),s.cloth);
      R(g,7,18-step+dy,3,1,s.boot);R(g,11,17+step+dy,3,1,s.boot);
    }else{
      R(g,6,8+dy,8,8,INK);R(g,5,10+dy,3,5,INK);R(g,12,9+dy,3,6,INK);
      R(g,7,9+dy,6,6,s.coat);R(g,7,10+dy,2,5,s.coatL);R(g,12,10+dy,1,5,s.dark);
      R(g,6,11+dy,2,4,s.dark);R(g,12,10+dy,2,4,s.coat);
      R(g,7,15+dy,3,3-step,s.cloth);R(g,10,15+dy,3,3-(1-step),s.cloth);
      R(g,6+step,18+dy,4,1,s.boot);R(g,11-step,17+step+dy,3,1,s.boot);
    }
  }
  function head(g,s,dir){
    const dy=s.small?2:0;
    if(dir==='u'){
      P(g,[[6,3+dy],[8,1+dy],[13,1+dy],[15,3+dy],[14,9+dy],[6,9+dy]],INK);
      R(g,7,3+dy,7,6,s.hair);R(g,8,2+dy,5,2,s.hairL);R(g,7,7+dy,7,2,s.hair);
      return;
    }
    if(dir==='d'){
      P(g,[[6,3+dy],[8,1+dy],[13,1+dy],[15,3+dy],[14,9+dy],[6,9+dy]],INK);
      R(g,7,3+dy,7,5,s.skin);R(g,8,4+dy,5,4,s.skinL);R(g,7,2+dy,7,3,s.hair);R(g,6,3+dy,2,4,s.hair);R(g,13,3+dy,2,3,s.hair);
      R(g,8,5+dy,2,1,INK);R(g,12,5+dy,2,1,INK);R(g,9,7+dy,3,1,'#a3635d');
    }else{
      P(g,[[6,3+dy],[8,1+dy],[13,1+dy],[15,3+dy],[15,8+dy],[7,9+dy]],INK);
      R(g,8,3+dy,6,5,s.skin);R(g,9,4+dy,5,4,s.skinL);R(g,7,2+dy,7,3,s.hair);R(g,7,3+dy,2,5,s.hair);R(g,13,3+dy,2,2,s.hair);
      R(g,12,5+dy,2,1,INK);R(g,14,7+dy,1,1,'#a3635d');
    }
  }
  function details(g,s,dir,frame){
    const r=s.role,dy=s.small?2:0;
    if(r==='hero'){
      if(dir==='d'){P(g,[[7,2],[9,0],[10,3],[12,0],[14,3]],s.hairL);R(g,6,9,2,7,s.accent);P(g,[[6,9],[3,11],[4,17],[8,15]],s.accent);R(g,9,10,3,1,s.gold);R(g,10,11,2,2,s.glow);}
      else if(dir==='u'){P(g,[[7,9],[4,10],[4,17],[9,15]],s.accent);R(g,9,9,3,1,s.gold);}
      else{P(g,[[7,2],[10,0],[10,3],[13,1],[14,4]],s.hairL);P(g,[[7,9],[3,11],[4,17],[8,15]],s.accent);R(g,11,10,2,2,s.glow);L(g,[[14,11],[18,17]],'#d5dbe0',1);}
    }else if(r==='rino'){
      if(dir==='d'){R(g,13,2,4,2,s.accent);P(g,[[14,3],[18,1],[17,5]],s.accent);R(g,6,9,8,3,s.accent);R(g,13,13,4,4,'#6f4a2f');L(g,[[16,9],[18,18]],'#6d4829',1);R(g,17,8,2,2,s.glow);}
      else if(dir==='u'){R(g,4,2,4,2,s.accent);P(g,[[6,3],[2,1],[3,5]],s.accent);R(g,6,9,8,3,'#d8cfbd');L(g,[[16,9],[18,18]],'#6d4829',1);}
      else{R(g,5,2,4,2,s.accent);P(g,[[7,3],[3,1],[4,5]],s.accent);R(g,7,9,7,3,s.accent);R(g,5,13,3,4,'#6f4a2f');L(g,[[15,9],[17,18]],'#6d4829',1);R(g,16,8,2,2,s.glow);}
    }else if(r==='gald'){
      if(dir==='d'){R(g,5,9,5,4,s.accent);R(g,6,9,3,1,'#d05a53');R(g,8,10,5,2,s.coatL);R(g,10,12,2,3,s.dark);R(g,14,9,4,8,'#37414e');R(g,15,10,2,6,s.coatL);R(g,8,7,1,1,'#753d3d');R(g,8,8,6,1,s.hair);}
      else if(dir==='u'){R(g,4,8,12,9,'#37414e');R(g,6,9,8,6,'#202a36');R(g,9,8,2,8,s.coatL);}
      else{R(g,4,8,5,9,'#37414e');R(g,5,9,2,7,s.coatL);R(g,11,9,5,4,s.accent);R(g,12,9,3,1,'#d05a53');R(g,13,8,1,1,s.hair);}
    }else if(r==='fio'){
      if(dir==='d'){R(g,9,9,1,7,s.gold);R(g,10,10,2,1,s.gold);R(g,11,11,2,2,s.glow);R(g,13,12,4,5,'#684630');R(g,14,13,2,1,'#d0a663');P(g,[[7,15],[5,19],[10,18]],s.coat);}
      else if(dir==='u'){R(g,7,9,1,7,s.gold);R(g,13,12,4,5,'#684630');}
      else{R(g,10,9,1,7,s.gold);R(g,12,11,2,2,s.glow);R(g,5,12,4,5,'#684630');R(g,6,13,2,1,'#d0a663');P(g,[[7,15],[5,19],[10,18]],s.coat);}
    }else if(r==='elder'){R(g,7,7+dy,7,3,s.hairL);R(g,8,8+dy,5,3,s.hair);R(g,8,11+dy,5,1,s.accent);}
    else if(r==='merchant'){P(g,[[5,3+dy],[8,1+dy],[15,3+dy],[16,5+dy],[4,5+dy]],s.hair);R(g,6,4+dy,9,1,s.hairL);R(g,8,11+dy,5,2,s.accent);}
    else if(r==='guard'){P(g,[[5,4+dy],[8,1+dy],[14,1+dy],[16,4+dy],[15,6+dy],[6,6+dy]],s.coatL);R(g,7,4+dy,8,2,s.dark);P(g,[[10,1+dy],[11,0+dy],[12,1+dy]],s.accent);R(g,8,10+dy,6,2,s.coatL);}
    else if(r==='celest'){R(g,6,3+dy,9,1,s.accent);R(g,10,2+dy,2,2,'#fff0a5');R(g,9,10+dy,3,2,s.accent);}
  }
  // 128px原画から32pxへ縮小する、新しいイラスト調フィールドスプライト。
  // 旧20pxグリッド版は設計の参照として残し、実際の登録はこちらを使う。
  function cvHD(draw){
    const c=document.createElement('canvas');c.width=128;c.height=128;
    const g=c.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
    draw(g);return c;
  }
  function rr(g,x,y,w,h,r,c,stroke=INK,sw=3){
    g.fillStyle=c;g.beginPath();g.roundRect(x,y,w,h,r);g.fill();
    if(stroke){g.strokeStyle=stroke;g.lineWidth=sw;g.stroke();}
  }
  function el(g,x,y,rx,ry,c,stroke=null,sw=2){
    g.fillStyle=c;g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fill();
    if(stroke){g.strokeStyle=stroke;g.lineWidth=sw;g.stroke();}
  }
  function pathHD(g,pts,c,stroke=INK,sw=3){
    g.fillStyle=c;g.beginPath();g.moveTo(...pts[0]);
    for(let i=1;i<pts.length;i++){const q=pts[i];q.length===2?g.lineTo(...q):q.length===4?g.quadraticCurveTo(...q):g.bezierCurveTo(...q);}
    g.closePath();g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=sw;g.lineJoin='round';g.stroke();}
  }
  function gradHD(g,x0,y0,x1,y1,a,b){const z=g.createLinearGradient(x0,y0,x1,y1);z.addColorStop(0,a);z.addColorStop(1,b);return z;}
  function spriteHD(s,dir,frame){return cvHD(g=>{
    const side=dir==='r', back=dir==='u', bob=frame?-1:0, step=frame?4:-3;
    g.save();g.translate(0,bob);
    el(g,64,113,29,7,'rgba(2,5,13,.42)');

    // 後ろ側のマント、装備、髪。
    if(s.role==='hero') pathHD(g,[[43,60],[29,70],[35,104],[57,92],[60,62]],gradHD(g,30,60,60,104,s.accent,'#6f1f34'));
    if(s.role==='rino') pathHD(g,[[42,57],[30,69],[38,101],[64,91],[66,58]],gradHD(g,30,57,66,101,s.accent,s.dark));
    if(s.role==='fio') pathHD(g,[[42,61],[31,105],[61,98],[66,61]],gradHD(g,31,61,66,105,s.coatL,s.coat));
    if(s.role==='gald') rr(g,72,55,28,54,11,gradHD(g,72,55,100,109,'#9daab2','#35404d'),INK,4);

    // 脚とブーツ。歩行差分はシルエットで読める程度に留める。
    rr(g,47+step*.35,82,14,27,6,s.cloth,INK,3);rr(g,67-step*.35,82,14,27,6,s.dark,INK,3);
    rr(g,43+step*.6,103,21,11,5,s.boot,INK,3);rr(g,65-step*.6,103,21,11,5,s.boot,INK,3);

    // 胴体は布のグラデーションと縁取りで、縮小時にも立体感を残す。
    const coatGrad=gradHD(g,40,54,88,94,s.coatL,s.coat);
    pathHD(g,[[45,53],[38,65],[41,94],[57,99],[76,98],[89,91],[88,65],[80,53]],coatGrad,INK,4);
    if(!back){
      g.strokeStyle=s.accent;g.lineWidth=4;g.beginPath();g.moveTo(64,57);g.lineTo(64,92);g.stroke();
      rr(g,48,78,34,7,3,s.gold,null,0);rr(g,60,77,9,10,3,s.dark,null,0);
    }
    rr(g,31,58,17,36,8,side?s.dark:s.coat,INK,3);rr(g,80,58,17,36,8,side?s.coat:s.dark,INK,3);
    el(g,38,91,8,8,s.skin,INK,3);el(g,91,91,8,8,s.skin,INK,3);

    // 頭部。向きごとに顔、髪、視線の位置を変える。
    el(g,64,39,24,25,side?s.skin:s.skinL,INK,4);
    if(back){
      pathHD(g,[[40,40],[42,22],[53,11],[72,12],[87,25],[87,55],[77,65],[65,56],[51,64],[40,52]],gradHD(g,43,12,83,61,s.hairL,s.hair),INK,4);
    }else if(side){
      pathHD(g,[[40,39],[43,20],[55,11],[75,14],[88,27],[84,45],[77,34],[66,29],[61,18],[48,33],[48,55],[39,51]],gradHD(g,42,12,84,54,s.hairL,s.hair),INK,4);
      el(g,75,40,3.8,5,s.dark);el(g,76,38.5,1.2,1.7,'#fff');
      g.strokeStyle='#a25e5b';g.lineWidth=2.5;g.beginPath();g.arc(77,49,6,.2,.95);g.stroke();
    }else{
      pathHD(g,[[40,38],[42,21],[53,11],[71,12],[86,23],[89,39],[80,34],[75,23],[66,31],[59,20],[50,34],[42,51]],gradHD(g,42,11,86,49,s.hairL,s.hair),INK,4);
      el(g,55,40,3.8,5,s.dark);el(g,74,40,3.8,5,s.dark);el(g,56,38.5,1.2,1.7,'#fff');el(g,75,38.5,1.2,1.7,'#fff');
      g.strokeStyle='#a25e5b';g.lineWidth=2.5;g.beginPath();g.arc(64,49,7,.2,.95);g.stroke();
    }

    // 固有デザイン。小さくしても色面と持ち物で判別できる。
    const r=s.role;
    if(r==='hero'){
      pathHD(g,[[39,57],[26,64],[31,91],[47,84]],s.accent,INK,3);
      el(g,64,69,7,7,s.glow,INK,2);el(g,64,68,2.5,2.5,'#efffff');
      g.strokeStyle='#dce8eb';g.lineWidth=4;g.beginPath();g.moveTo(91,69);g.lineTo(111,105);g.stroke();rr(g,105,101,9,5,2,s.gold,INK,2);
    }else if(r==='rino'){
      if(!back){pathHD(g,[[43,20],[29,9],[31,27],[43,31]],s.accent,INK,3);pathHD(g,[[82,20],[98,9],[95,28],[83,31]],s.accent,INK,3);}
      rr(g,82,76,17,24,6,'#70492e',INK,3);g.strokeStyle='#765134';g.lineWidth=4;g.beginPath();g.moveTo(99,54);g.lineTo(109,111);g.stroke();el(g,99,52,8,8,s.glow,INK,3);
    }else if(r==='gald'){
      rr(g,29,55,28,38,10,gradHD(g,29,55,57,93,'#c05458',s.accent),INK,4);rr(g,39,61,12,7,3,'#e27a63',null,0);
      g.strokeStyle='#7d4340';g.lineWidth=3;g.beginPath();g.moveTo(50,45);g.lineTo(57,51);g.stroke();
    }else if(r==='fio'){
      rr(g,82,75,23,29,5,'#684630',INK,3);g.strokeStyle='#d8b86a';g.lineWidth=2;g.beginPath();g.moveTo(86,82);g.lineTo(101,82);g.moveTo(93,78);g.lineTo(93,101);g.stroke();
      pathHD(g,[[53,69],[62,58],[72,69],[64,80]],s.glow,INK,2);el(g,64,68,3,3,'#efffff');
    }else if(r==='guard'){
      pathHD(g,[[39,32],[43,14],[64,5],[85,14],[90,32]],gradHD(g,39,5,90,32,s.coatL,s.dark),INK,4);rr(g,49,27,31,6,2,s.dark,null,0);pathHD(g,[[61,7],[64,0],[68,8]],s.accent,INK,2);
    }else if(r==='merchant'){
      rr(g,78,68,27,35,12,'#8e5b31',INK,3);rr(g,49,76,31,7,3,s.accent,null,0);
    }else if(r==='elder'||r==='sage'){
      if(!back){pathHD(g,[[48,51],[54,69],[64,61],[74,70],[81,50]],s.hairL,INK,2);}
    }else if(r==='celest'){
      g.strokeStyle=s.accent;g.shadowColor=s.accent;g.shadowBlur=8;g.lineWidth=4;g.beginPath();g.ellipse(64,11,18,6,0,0,Math.PI*2);g.stroke();g.shadowBlur=0;
    }
    g.restore();
  });}
  function sprite(s,dir,frame){return spriteHD(s,dir,frame);}
  function install(){
    for(const [name,s] of Object.entries(SPECS)){
      for(const f of [0,1]){
        for(const d of ['d','u','r'])Art.register(`${name}_${d}${f}`,sprite(s,d,f));
        Art.register(`${name}_l${f}`,flip(Art.get(`${name}_r${f}`)));
      }
      Art.register(`${name}_0`,Art.get(`${name}_d0`));Art.register(`${name}_1`,Art.get(`${name}_d1`));
    }
  }
  return {install};
})();
