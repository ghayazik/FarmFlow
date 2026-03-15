import { useState, useEffect, useCallback, useRef } from "react";

/*
  V3 ARCHITECTURE:
  - Single admin password: 1317
  - Admin logs in directly, no farm creation step
  - Admin configures farm info + creates users inside the app
  - All data in React state (single source of truth)
  - window.storage for background persistence only (never blocks UI)
  - Users log in with username/password created by admin
*/

var STORE_KEY = "agro_farm_data";

function persist(data) {
  try { window.storage.set(STORE_KEY, JSON.stringify(data)); } catch(e) {}
}

function loadStored() {
  return new Promise(function(resolve) {
    try {
      window.storage.get(STORE_KEY).then(function(r) {
        if (r && r.value) resolve(JSON.parse(r.value));
        else resolve(null);
      }).catch(function() { resolve(null); });
    } catch(e) { resolve(null); }
  });
}

var ADMIN_PASS = "1317";

var ANIMALS = [
  {id:"bovins",label:"Bovins",icon:"\u{1F404}",unit:"têtes"},
  {id:"caprins",label:"Caprins",icon:"\u{1F410}",unit:"têtes"},
  {id:"lapins",label:"Lapins",icon:"\u{1F407}",unit:"cages"},
  {id:"aviculture",label:"Aviculture",icon:"\u{1F414}",unit:"sujets"},
  {id:"apiculture",label:"Apiculture",icon:"\u{1F41D}",unit:"ruches"}
];
var CROPS = [
  {id:"cereales",label:"Céréales",icon:"\u{1F33E}",ex:"Blé, Orge, Maïs"},
  {id:"fruits",label:"Fruits",icon:"\u{1F34A}",ex:"Agrumes, Oliviers"},
  {id:"legumes",label:"Légumes",icon:"\u{1F96C}",ex:"Tomates, Oignons"}
];
var IRRIG = ["Goutte-à-goutte","Aspersion","Gravitaire","Micro-aspersion","Pivot","Submersion"];
var TREATS = ["Fertilisation","Insecticide","Fongicide","Herbicide","Suivi toxicologique"];
var ALLSEC = ["dashboard","planning","elevage","cultures","irrigation","traitements","materiel","meteo","production","chatbot"];
var SL = {dashboard:"Tableau de Bord",planning:"Planning",elevage:"Élevage",cultures:"Cultures",irrigation:"Irrigation",traitements:"Traitements",materiel:"Matériel",meteo:"Météo",production:"Production",chatbot:"AgriBot",admin:"Administration"};
var SI = {admin:"\u2699\uFE0F",dashboard:"\u{1F4CA}",planning:"\u{1F4C5}",elevage:"\u{1F404}",cultures:"\u{1F33E}",irrigation:"\u{1F4A7}",traitements:"\u{1F9EA}",materiel:"\u{1F69C}",meteo:"\u{1F324}\uFE0F",production:"\u{1F4CA}",chatbot:"\u{1F916}"};

var K={bg:"#0c1710",cd:"#142119",ip:"#1c2e23",g:"#4ade80",gf:"rgba(74,222,128,.12)",a:"#f59e0b",af:"rgba(245,158,11,.12)",t:"#e2efe5",m:"#7da688",d:"#4e735a",b:"#283d2f",r:"#ef4444",rf:"rgba(239,68,68,.1)",ok:"#10b981"};

var CSS=`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300..800&family=IBM+Plex+Sans+Arabic:wght@400;600&display=swap');
*{margin:0;padding:0;box-sizing:border-box}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:${K.bg}}::-webkit-scrollbar-thumb{background:${K.b};border-radius:3px}
body{font-family:'DM Sans',sans-serif;background:${K.bg};color:${K.t}}@keyframes spin{to{transform:rotate(360deg)}}`;

function newFarm(){return{name:"Ma Ferme",location:"",totalSurface:0,irrigatedSurface:0,totalEmployees:0,activities:[],animals:{},cultures:{},employees:[],users:[],elevageRecords:[],cultureRecords:[],irrigationPlans:[],traitements:[],productions:[],plannings:[],materiels:[],maintenances:[]};}

/* ═══ UI ═══ */
function Bt({children,v,sm,full,dis,onClick}){var vs={primary:{background:K.g,color:K.bg},secondary:{background:K.ip,color:K.t,border:"1px solid "+K.b},ghost:{background:"none",color:K.m,padding:sm?"4px":"6px"}};return <button style={Object.assign({padding:sm?"6px 14px":"10px 20px",borderRadius:8,fontFamily:"'DM Sans'",fontWeight:600,fontSize:sm?12:14,border:"none",cursor:dis?"default":"pointer",display:"inline-flex",alignItems:"center",gap:8,opacity:dis?.5:1,width:full?"100%":undefined,justifyContent:full?"center":undefined},vs[v||"primary"]||vs.primary)} disabled={dis} onClick={onClick}>{children}</button>;}
function Fl({label,children}){return <div style={{marginBottom:14}}>{label&&<label style={{display:"block",fontSize:11,fontWeight:600,color:K.m,marginBottom:5,textTransform:"uppercase",letterSpacing:.5}}>{label}</label>}{children}</div>;}
function Ip(p){var s=p.style||{};var r={};Object.keys(p).forEach(function(k){if(k!=="style")r[k]=p[k];});return <input {...r} style={Object.assign({width:"100%",padding:"10px 14px",background:K.ip,border:"1px solid "+K.b,borderRadius:8,color:K.t,fontFamily:"'DM Sans'",fontSize:14,outline:"none"},s)}/>;}
function Sl({children,value,onChange,style:s}){return <select value={value} onChange={onChange} style={Object.assign({width:"100%",padding:"10px 14px",background:K.ip,border:"1px solid "+K.b,borderRadius:8,color:K.t,fontFamily:"'DM Sans'",fontSize:14,outline:"none",cursor:"pointer"},s||{})}>{children}</select>;}
function Ta(p){var s=p.style||{};var r={};Object.keys(p).forEach(function(k){if(k!=="style")r[k]=p[k];});return <textarea {...r} style={Object.assign({width:"100%",padding:"10px 14px",background:K.ip,border:"1px solid "+K.b,borderRadius:8,color:K.t,fontFamily:"'DM Sans'",fontSize:14,outline:"none",resize:"vertical",minHeight:70},s)}/>;}
function Cd({children,style:s}){return <div style={Object.assign({background:K.cd,border:"1px solid "+K.b,borderRadius:12,padding:20,marginBottom:16},s||{})}>{children}</div>;}
function Bg({children,c}){var cs={green:{bg:"rgba(16,185,129,.15)",fg:"#10b981"},amber:{bg:K.af,fg:K.a},red:{bg:K.rf,fg:K.r},blue:{bg:"rgba(59,130,246,.15)",fg:"#3b82f6"}};var x=cs[c||"green"]||cs.green;return <span style={{display:"inline-block",padding:"3px 9px",borderRadius:5,fontSize:11,fontWeight:700,background:x.bg,color:x.fg}}>{children}</span>;}
function Ml({children,onClose}){return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:20}} onClick={onClose}><div style={{background:K.cd,border:"1px solid "+K.b,borderRadius:16,padding:28,width:500,maxWidth:"100%",maxHeight:"90vh",overflowY:"auto"}} onClick={function(e){e.stopPropagation();}}>{children}</div></div>;}
function Et({icon,text}){return <div style={{textAlign:"center",padding:"40px 20px",color:K.m}}><div style={{fontSize:48,opacity:.4,marginBottom:8}}>{icon}</div><p>{text}</p></div>;}
function R2({children}){return <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>{children}</div>;}
function PT({icon,children}){return <h1 style={{fontSize:22,fontWeight:800,marginBottom:20,display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:26}}>{icon}</span>{children}</h1>;}
function SG({children}){return <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:12,marginBottom:20}}>{children}</div>;}
function St({icon,value,label,bg}){return <div style={{background:K.cd,border:"1px solid "+K.b,borderRadius:12,padding:16,display:"flex",alignItems:"center",gap:14}}><div style={{fontSize:26,width:46,height:46,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:10,background:bg||K.gf,flexShrink:0}}>{icon}</div><div><div style={{fontSize:20,fontWeight:700}}>{value}</div><div style={{fontSize:12,color:K.m}}>{label}</div></div></div>;}
function Tb({tabs,active,onChange}){return <div style={{display:"flex",gap:4,marginBottom:16,flexWrap:"wrap"}}>{tabs.map(function(t){return <button key={t.id} onClick={function(){onChange(t.id);}} style={{padding:"8px 16px",borderRadius:8,fontSize:13,fontWeight:active===t.id?600:400,cursor:"pointer",color:active===t.id?K.g:K.m,background:active===t.id?K.gf:"none",border:"none",fontFamily:"'DM Sans'"}}>{t.label}</button>;})}</div>;}
function TH({children}){return <th style={{textAlign:"left",padding:"10px 12px",background:K.ip,color:K.m,fontWeight:600,fontSize:11,textTransform:"uppercase",borderBottom:"1px solid "+K.b}}>{children}</th>;}
function TD({children,style:s}){return <td style={Object.assign({padding:"10px 12px"},s||{})}>{children}</td>;}

/* ═══ MAIN ═══ */
export default function App(){
  var _l=useState(true),loading=_l[0],setLoading=_l[1];
  var _u=useState(null),user=_u[0],setUser=_u[1];
  var _f=useState(null),farm=_f[0],setFarm=_f[1];
  var _p=useState("admin"),page=_p[0],setPage=_p[1];
  var _so=useState(false),sideOpen=_so[0],setSideOpen=_so[1];
  var _t=useState(null),toast=_t[0],setToast=_t[1];
  var _mb=useState(false),isMob=_mb[0],setIsMob=_mb[1];
  var flash=useCallback(function(m){setToast(m);setTimeout(function(){setToast(null);},2500);},[]);

  useEffect(function(){var ck=function(){setIsMob(window.innerWidth<768);};ck();window.addEventListener("resize",ck);return function(){window.removeEventListener("resize",ck);};},[]);

  // Load saved data on mount
  useEffect(function(){
    loadStored().then(function(data){
      if(data && data.farm){
        setFarm(data.farm);
        if(data.currentUser) setUser(data.currentUser);
      }
      setLoading(false);
    });
  },[]);

  function doSave(newFarm, currentUser){
    setFarm(newFarm);
    if(currentUser !== undefined) setUser(currentUser);
    persist({farm:newFarm, currentUser: currentUser !== undefined ? currentUser : user});
    flash("\u2705 Sauvegardé");
  }

  function doLogin(u, f){
    setUser(u); setFarm(f);
    persist({farm:f, currentUser:u});
    setPage(u.role==="admin"?"admin":(u.sections && u.sections[0]||"dashboard"));
  }

  function doLogout(){
    setUser(null);
    // Keep farm data, just clear current user
    persist({farm:farm, currentUser:null});
  }

  if(loading) return <div><style>{CSS}</style><div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:48}}>{"\u{1F33F}"}</span></div></div>;

  // Not logged in -> show login
  if(!user) return <div><style>{CSS}</style><LoginPage farm={farm} onLogin={doLogin}/></div>;

  // Logged in
  var secs = user.role==="admin"?["admin"].concat(ALLSEC):(user.sections||ALLSEC);

  return <div style={{display:"flex",minHeight:"100vh"}}>
    <style>{CSS}</style>
    {(isMob?sideOpen:true)&&<div style={{width:230,background:K.cd,borderRight:"1px solid "+K.b,position:"fixed",top:0,left:0,bottom:0,zIndex:100,display:"flex",flexDirection:"column"}}>
      <div style={{padding:20,borderBottom:"1px solid "+K.b}}>
        <div style={{fontSize:17,fontWeight:800,color:K.g}}>{"\u{1F33F} AGRO-ASSIST"}</div>
        <div style={{fontSize:12,color:K.m,marginTop:4}}>{farm?farm.name:"Ma Ferme"}</div>
      </div>
      <nav style={{flex:1,padding:"12px 8px",overflowY:"auto"}}>
        {secs.map(function(s){return <div key={s} onClick={function(){setPage(s);setSideOpen(false);}} style={{padding:"10px 14px",borderRadius:8,cursor:"pointer",display:"flex",alignItems:"center",gap:10,fontSize:14,marginBottom:2,color:page===s?K.g:K.m,background:page===s?K.gf:"transparent",fontWeight:page===s?600:400}}><span style={{fontSize:17,width:24,textAlign:"center"}}>{SI[s]}</span>{SL[s]}</div>;})}
      </nav>
      <div style={{padding:14,borderTop:"1px solid "+K.b}}>
        <div style={{fontSize:12,color:K.m,marginBottom:8}}>{"\u{1F464} "+user.name+" "}<Bg c={user.role==="admin"?"amber":"green"}>{user.role}</Bg></div>
        <Bt v="secondary" sm full onClick={doLogout}>{"\u{1F6AA} Déconnexion"}</Bt>
      </div>
    </div>}
    {isMob&&<div style={{position:"fixed",top:0,left:0,right:0,zIndex:90,padding:"10px 16px",background:K.cd,borderBottom:"1px solid "+K.b,display:"flex",alignItems:"center",justifyContent:"space-between"}}><Bt v="ghost" onClick={function(){setSideOpen(!sideOpen);}}>{sideOpen?"\u2715":"\u2630"}</Bt><span style={{fontWeight:700,color:K.g}}>AGRO-ASSIST</span><span style={{fontSize:12,color:K.m}}>{user.name}</span></div>}
    <div style={{flex:1,marginLeft:isMob?0:230,padding:24,paddingTop:isMob?64:24,minHeight:"100vh"}}>
      {page==="admin"&&user.role==="admin"&&<AdminPage farm={farm} save={function(f){doSave(f);}}/>}
      {page==="dashboard"&&<DashboardPage farm={farm}/>}
      {page==="planning"&&<PlanningPage farm={farm} save={function(f){doSave(f);}}/>}
      {page==="elevage"&&<ElevagePage farm={farm} save={function(f){doSave(f);}}/>}
      {page==="cultures"&&<CulturesPage farm={farm} save={function(f){doSave(f);}}/>}
      {page==="irrigation"&&<IrrigationPage farm={farm} save={function(f){doSave(f);}}/>}
      {page==="traitements"&&<TraitementsPage farm={farm} save={function(f){doSave(f);}}/>}
      {page==="materiel"&&<MaterielPage farm={farm} save={function(f){doSave(f);}}/>}
      {page==="meteo"&&<MeteoPage farm={farm}/>}
      {page==="production"&&<ProductionPage farm={farm} save={function(f){doSave(f);}}/>}
      {page==="chatbot"&&<ChatbotPage farm={farm}/>}
    </div>
    {sideOpen&&isMob&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",zIndex:89}} onClick={function(){setSideOpen(false);}}/>}
    {toast&&<div style={{position:"fixed",bottom:20,right:20,padding:"12px 20px",borderRadius:10,background:K.ok,color:"#fff",fontWeight:600,fontSize:13,zIndex:300}}>{toast}</div>}
  </div>;
}

/* ═══ LOGIN ═══ */
function LoginPage({farm, onLogin}){
  var _tab=useState("admin"),tab=_tab[0],setTab=_tab[1];
  var _un=useState(""),username=_un[0],setUsername=_un[1];
  var _pw=useState(""),password=_pw[0],setPassword=_pw[1];
  var _er=useState(""),err=_er[0],setErr=_er[1];

  function loginAdmin(){
    if(!password) return setErr("Mot de passe requis");
    if(password!==ADMIN_PASS) return setErr("Mot de passe incorrect");
    var f=farm||newFarm();
    onLogin({id:"admin",name:"Administrateur",role:"admin",sections:ALLSEC},f);
  }

  function loginUser(){
    if(!username.trim()) return setErr("Nom d'utilisateur requis");
    if(!password) return setErr("Mot de passe requis");
    if(!farm||!farm.users||farm.users.length===0) return setErr("Aucun utilisateur configuré. L'administrateur doit d'abord créer les comptes.");
    var found=null;
    for(var i=0;i<farm.users.length;i++){
      if(farm.users[i].username===username.trim()&&farm.users[i].password===password){found=farm.users[i];break;}
    }
    if(!found) return setErr("Identifiants incorrects");
    onLogin(found,farm);
  }

  var userCount=(farm&&farm.users)?farm.users.length:0;

  return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,"+K.bg+",#081a0e,#0f2318)",position:"relative",overflow:"hidden"}}>
    <div style={{position:"absolute",width:600,height:600,background:"radial-gradient(circle,rgba(74,222,128,.05),transparent 70%)",top:-120,right:-120}}/>
    <div style={{position:"absolute",width:400,height:400,background:"radial-gradient(circle,rgba(245,158,11,.03),transparent 70%)",bottom:-80,left:-80}}/>

    <div style={{background:K.cd,border:"1px solid "+K.b,borderRadius:20,padding:0,width:420,maxWidth:"94vw",position:"relative",zIndex:1,overflow:"hidden"}}>

      {/* Header */}
      <div style={{padding:"28px 32px 20px",borderBottom:"1px solid "+K.b,background:"linear-gradient(135deg,rgba(74,222,128,.06),transparent)"}}>
        <h1 style={{fontSize:28,fontWeight:800,color:K.g,marginBottom:4}}>{"\u{1F33F} AGRO-ASSIST"}</h1>
        <p style={{color:K.m,fontSize:13}}>{"Plateforme de gestion agricole intégrée \u2014 Maroc"}</p>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",borderBottom:"1px solid "+K.b}}>
        <div onClick={function(){setTab("admin");setErr("");}} style={{flex:1,padding:"14px 0",textAlign:"center",cursor:"pointer",fontSize:14,fontWeight:tab==="admin"?700:400,color:tab==="admin"?K.g:K.m,background:tab==="admin"?K.gf:"transparent",borderBottom:tab==="admin"?"2px solid "+K.g:"2px solid transparent"}}>
          {"\u{1F511} Administrateur"}
        </div>
        <div onClick={function(){setTab("user");setErr("");}} style={{flex:1,padding:"14px 0",textAlign:"center",cursor:"pointer",fontSize:14,fontWeight:tab==="user"?700:400,color:tab==="user"?K.g:K.m,background:tab==="user"?K.gf:"transparent",borderBottom:tab==="user"?"2px solid "+K.g:"2px solid transparent"}}>
          {"\u{1F468}\u200D\u{1F33E} Gérant / Utilisateur"}
        </div>
      </div>

      <div style={{padding:"24px 32px 32px"}}>

        {/* Admin tab */}
        {tab==="admin"&&<div>
          <div style={{padding:14,background:K.gf,borderRadius:10,marginBottom:20,border:"1px solid rgba(74,222,128,.15)"}}>
            <div style={{fontSize:13,color:K.g,fontWeight:600,marginBottom:4}}>{"\u{1F511} Accès Administrateur"}</div>
            <div style={{fontSize:12,color:K.m}}>{"L'admin configure la ferme, crée les gérants et utilisateurs, paramètre les activités, le matériel et les employés."}</div>
          </div>
          <Fl label="Mot de passe administrateur">
            <Ip type="password" value={password} onChange={function(e){setPassword(e.target.value);setErr("");}} onKeyDown={function(e){if(e.key==="Enter")loginAdmin();}} placeholder="\u2022\u2022\u2022\u2022"/>
          </Fl>
          {err&&<div style={{color:K.r,fontSize:13,marginBottom:12,padding:"8px 12px",background:K.rf,borderRadius:6}}>{err}</div>}
          <Bt full onClick={loginAdmin}>{"\u{1F511} Connexion Admin"}</Bt>
        </div>}

        {/* User/Gérant tab */}
        {tab==="user"&&<div>
          <div style={{padding:14,background:K.af,borderRadius:10,marginBottom:20,border:"1px solid rgba(245,158,11,.15)"}}>
            <div style={{fontSize:13,color:K.a,fontWeight:600,marginBottom:4}}>{"\u{1F468}\u200D\u{1F33E} Accès Gérant / Utilisateur"}</div>
            <div style={{fontSize:12,color:K.m}}>
              {userCount>0
                ?"Connectez-vous avec les identifiants créés par l'administrateur. "+userCount+" compte(s) configuré(s)."
                :"Aucun compte configuré. L'administrateur doit d'abord créer vos identifiants."}
            </div>
          </div>
          <Fl label="Nom d'utilisateur">
            <Ip value={username} onChange={function(e){setUsername(e.target.value);setErr("");}} placeholder="Votre identifiant"/>
          </Fl>
          <Fl label="Mot de passe">
            <Ip type="password" value={password} onChange={function(e){setPassword(e.target.value);setErr("");}} onKeyDown={function(e){if(e.key==="Enter")loginUser();}} placeholder="\u2022\u2022\u2022\u2022"/>
          </Fl>
          {err&&<div style={{color:K.r,fontSize:13,marginBottom:12,padding:"8px 12px",background:K.rf,borderRadius:6}}>{err}</div>}
          <Bt full onClick={loginUser} dis={userCount===0}>{"\u{1F468}\u200D\u{1F33E} Se Connecter"}</Bt>
          {userCount===0&&<div style={{fontSize:12,color:K.d,textAlign:"center",marginTop:12}}>{"Connectez-vous en admin pour créer des comptes."}</div>}
        </div>}

        <div style={{fontSize:11,color:K.d,textAlign:"center",marginTop:24,paddingTop:16,borderTop:"1px solid "+K.b}}>{"AgriAssist v3.0 \u2014 Powered by AI \u{1F33F}"}</div>
      </div>
    </div>
  </div>;
}

/* ═══ ADMIN ═══ */
function AdminPage({farm,save}){
  var _t=useState("farm"),tab=_t[0],setTab=_t[1];
  var _m=useState(null),modal=_m[0],setModal=_m[1];
  var _f=useState({}),form=_f[0],setForm=_f[1];
  function addUser(){setForm({name:"",username:"",password:"",role:"gerant",sections:ALLSEC.slice()});setModal("user");}
  function saveUser(){if(!form.name||!form.username||!form.password)return;save(Object.assign({},farm,{users:(farm.users||[]).concat([Object.assign({},form,{id:Date.now()+""})])}));setModal(null);}
  function delUser(id){save(Object.assign({},farm,{users:(farm.users||[]).filter(function(u){return u.id!==id;})}));}
  function addEmp(){setForm({name:"",role:"Ouvrier",phone:""});setModal("emp");}
  function saveEmp(){if(!form.name)return;save(Object.assign({},farm,{employees:(farm.employees||[]).concat([Object.assign({},form,{id:Date.now()+""})])}));setModal(null);}
  function delEmp(id){save(Object.assign({},farm,{employees:(farm.employees||[]).filter(function(e){return e.id!==id;})}));}

  return <div>
    <PT icon={"\u2699\uFE0F"}>Administration</PT>
    <Tb tabs={[{id:"farm",label:"\u{1F3E1} Ferme"},{id:"users",label:"\u{1F465} Utilisateurs"},{id:"emp",label:"\u{1F477} Employés"},{id:"animals",label:"\u{1F404} Élevage"},{id:"crops",label:"\u{1F33E} Cultures"}]} active={tab} onChange={setTab}/>

    {tab==="farm"&&<Cd><h3 style={{fontSize:16,fontWeight:700,marginBottom:16}}>{"\u{1F3E1} Informations Ferme"}</h3>
      <R2><Fl label="Nom de la ferme"><Ip value={farm.name||""} onChange={function(e){save(Object.assign({},farm,{name:e.target.value}));}}/></Fl><Fl label="Localisation"><Ip value={farm.location||""} onChange={function(e){save(Object.assign({},farm,{location:e.target.value}));}} placeholder="Région, Province"/></Fl></R2>
      <R2><Fl label="Surface totale (ha)"><Ip type="number" value={farm.totalSurface||""} onChange={function(e){save(Object.assign({},farm,{totalSurface:parseFloat(e.target.value)||0}));}}/></Fl><Fl label="Surface irriguée (ha)"><Ip type="number" value={farm.irrigatedSurface||""} onChange={function(e){save(Object.assign({},farm,{irrigatedSurface:parseFloat(e.target.value)||0}));}}/></Fl></R2>
      <Fl label="Nombre d'employés"><Ip type="number" value={farm.totalEmployees||""} onChange={function(e){save(Object.assign({},farm,{totalEmployees:parseInt(e.target.value)||0}));}}/></Fl>
      <Fl label="Activités"><div style={{display:"flex",flexWrap:"wrap",gap:4}}>{ALLSEC.filter(function(s){return s!=="chatbot";}).map(function(s){var sel=(farm.activities||[]).indexOf(s)>=0;return <span key={s} onClick={function(){var a=sel?(farm.activities||[]).filter(function(x){return x!==s;}):(farm.activities||[]).concat([s]);save(Object.assign({},farm,{activities:a}));}} style={{padding:"4px 10px",borderRadius:6,fontSize:12,cursor:"pointer",background:sel?K.gf:K.ip,border:"1px solid "+(sel?K.g:K.b),color:sel?K.g:K.m}}>{SL[s]}</span>;})}</div></Fl>
    </Cd>}

    {tab==="users"&&<Cd>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h3 style={{fontSize:16,fontWeight:700}}>{"\u{1F465} Utilisateurs de la ferme"}</h3><Bt sm onClick={addUser}>{"\u2795 Ajouter"}</Bt></div>
      <div style={{fontSize:13,color:K.m,marginBottom:12,padding:12,background:K.ip,borderRadius:8,border:"1px solid "+K.b}}>
        <div style={{marginBottom:6}}><strong style={{color:K.g}}>{"\u{1F468}\u200D\u{1F33E} Gérant"}</strong>{" \u2014 Accès complet à toutes les rubriques. Peut saisir et consulter toutes les données."}</div>
        <div><strong style={{color:"#3b82f6"}}>{"\u{1F464} Utilisateur"}</strong>{" \u2014 Accès limité aux rubriques sélectionnées par l'admin."}</div>
      </div>
      {(farm.users||[]).length===0?<Et icon={"\u{1F465}"} text="Aucun utilisateur. Ajoutez des agriculteurs."/>:
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr><TH>Nom</TH><TH>Login</TH><TH>Rôle</TH><TH>Sections</TH><TH></TH></tr></thead>
      <tbody>{(farm.users||[]).map(function(u){var roleLabel=u.role==="gerant"?"\u{1F468}\u200D\u{1F33E} Gérant":"\u{1F464} Utilisateur";var roleColor=u.role==="gerant"?"green":"blue";return <tr key={u.id} style={{borderBottom:"1px solid "+K.b}}><TD style={{fontWeight:600}}>{u.name}</TD><TD>{u.username}</TD><TD><Bg c={roleColor}>{roleLabel}</Bg></TD><TD style={{fontSize:12}}>{u.role==="gerant"?"Toutes les rubriques":(u.sections||[]).map(function(s){return SL[s];}).join(", ")}</TD><TD><Bt v="ghost" sm onClick={function(){delUser(u.id);}}>{"🗑"}</Bt></TD></tr>;})}</tbody></table></div>}
    </Cd>}

    {tab==="emp"&&<Cd><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h3 style={{fontSize:16,fontWeight:700}}>{"\u{1F477} Employés"}</h3><Bt sm onClick={addEmp}>{"\u2795 Ajouter"}</Bt></div>
      {(farm.employees||[]).length===0?<Et icon={"\u{1F477}"} text="Aucun employé"/>:
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr><TH>Nom</TH><TH>Poste</TH><TH>Tél</TH><TH></TH></tr></thead>
      <tbody>{(farm.employees||[]).map(function(e){return <tr key={e.id} style={{borderBottom:"1px solid "+K.b}}><TD style={{fontWeight:600}}>{e.name}</TD><TD>{e.role}</TD><TD>{e.phone}</TD><TD><Bt v="ghost" sm onClick={function(){delEmp(e.id);}}>{"🗑"}</Bt></TD></tr>;})}</tbody></table></div>}
    </Cd>}

    {tab==="animals"&&<Cd><h3 style={{fontSize:16,fontWeight:700,marginBottom:16}}>{"\u{1F404} Paramétrage Élevage"}</h3>
      {ANIMALS.map(function(a){return <div key={a.id} style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}><span style={{fontSize:24,width:36}}>{a.icon}</span><span style={{width:110,fontWeight:600}}>{a.label}</span><Ip type="number" style={{width:120}} value={(farm.animals||{})[a.id]||""} placeholder="0" onChange={function(e){var an=Object.assign({},farm.animals||{});an[a.id]=parseInt(e.target.value)||0;save(Object.assign({},farm,{animals:an}));}}/><span style={{fontSize:12,color:K.m}}>{a.unit}</span></div>;})}
    </Cd>}

    {tab==="crops"&&<Cd><h3 style={{fontSize:16,fontWeight:700,marginBottom:16}}>{"\u{1F33E} Paramétrage Cultures"}</h3>
      {CROPS.map(function(cr){return <div key={cr.id} style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}><span style={{fontSize:24,width:36}}>{cr.icon}</span><span style={{width:110,fontWeight:600}}>{cr.label}</span><Ip type="number" step="0.1" style={{width:120}} value={((farm.cultures||{})[cr.id]||{}).surface||""} placeholder="0" onChange={function(e){var cu=Object.assign({},farm.cultures||{});cu[cr.id]=Object.assign({},cu[cr.id]||{},{surface:parseFloat(e.target.value)||0});save(Object.assign({},farm,{cultures:cu}));}}/><span style={{fontSize:12,color:K.m}}>{"ha \u2014 "+cr.ex}</span></div>;})}
    </Cd>}

    {modal==="user"&&<Ml onClose={function(){setModal(null);}}><h3 style={{fontSize:18,fontWeight:700,marginBottom:20}}>Nouvel Utilisateur</h3>
      <Fl label="Nom complet"><Ip value={form.name} onChange={function(e){setForm(Object.assign({},form,{name:e.target.value}));}}/></Fl>
      <R2><Fl label="Login"><Ip value={form.username} onChange={function(e){setForm(Object.assign({},form,{username:e.target.value}));}}/></Fl><Fl label="Mot de passe"><Ip value={form.password} onChange={function(e){setForm(Object.assign({},form,{password:e.target.value}));}}/></Fl></R2>
      <Fl label="Rôle"><Sl value={form.role} onChange={function(e){
        var newRole=e.target.value;
        var newSections=newRole==="gerant"?ALLSEC.slice():form.sections;
        setForm(Object.assign({},form,{role:newRole,sections:newSections}));
      }}><option value="gerant">{"\u{1F468}\u200D\u{1F33E} Gérant de ferme"}</option><option value="user">{"\u{1F464} Utilisateur"}</option></Sl></Fl>
      <div style={{padding:10,background:form.role==="gerant"?K.gf:K.ip,borderRadius:8,marginBottom:14,fontSize:12,color:K.m,border:"1px solid "+(form.role==="gerant"?"rgba(74,222,128,.2)":K.b)}}>
        {form.role==="gerant"
          ?"\u{1F468}\u200D\u{1F33E} Le gérant a accès à toutes les rubriques et peut gérer les données de la ferme."
          :"\u{1F464} L'utilisateur n'a accès qu'aux rubriques sélectionnées ci-dessous."}
      </div>
      {form.role!=="gerant"&&<Fl label="Sections autorisées"><div style={{display:"flex",flexWrap:"wrap",gap:4}}>{ALLSEC.map(function(s){var sel=(form.sections||[]).indexOf(s)>=0;return <span key={s} onClick={function(){setForm(Object.assign({},form,{sections:sel?form.sections.filter(function(x){return x!==s;}):form.sections.concat([s])}));}} style={{padding:"4px 10px",borderRadius:6,fontSize:12,cursor:"pointer",background:sel?K.gf:K.ip,border:"1px solid "+(sel?K.g:K.b),color:sel?K.g:K.m}}>{SL[s]}</span>;})}</div></Fl>}
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:20}}><Bt v="secondary" onClick={function(){setModal(null);}}>Annuler</Bt><Bt onClick={saveUser}>Enregistrer</Bt></div>
    </Ml>}

    {modal==="emp"&&<Ml onClose={function(){setModal(null);}}><h3 style={{fontSize:18,fontWeight:700,marginBottom:20}}>Nouvel Employé</h3>
      <Fl label="Nom"><Ip value={form.name} onChange={function(e){setForm(Object.assign({},form,{name:e.target.value}));}}/></Fl>
      <R2><Fl label="Poste"><Sl value={form.role} onChange={function(e){setForm(Object.assign({},form,{role:e.target.value}));}}>{["Ouvrier","Chef d'équipe","Berger","Apiculteur","Mécanicien","Gardien","Irrigateur","Chauffeur"].map(function(r){return <option key={r} value={r}>{r}</option>;})}</Sl></Fl><Fl label="Tél"><Ip value={form.phone} onChange={function(e){setForm(Object.assign({},form,{phone:e.target.value}));}} placeholder="06..."/></Fl></R2>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:20}}><Bt v="secondary" onClick={function(){setModal(null);}}>Annuler</Bt><Bt onClick={saveEmp}>Enregistrer</Bt></div>
    </Ml>}
  </div>;
}

/* ═══ ÉLEVAGE ═══ */
function ElevagePage({farm,save}){
  var _m=useState(null),modal=_m[0],setModal=_m[1];var _f=useState({}),form=_f[0],setForm=_f[1];
  var an=farm.animals||{};var recs=farm.elevageRecords||[];
  function add(){setForm({date:new Date().toISOString().split("T")[0],type:"bovins",event:"Vaccination",notes:"",quantity:1});setModal("add");}
  function sv(){save(Object.assign({},farm,{elevageRecords:recs.concat([Object.assign({},form,{id:Date.now()+""})])}));setModal(null);}
  return <div><PT icon={"\u{1F404}"}>Suivi Élevage</PT>
    <SG>{ANIMALS.map(function(a){return <St key={a.id} icon={a.icon} value={an[a.id]||0} label={a.label+" ("+a.unit+")"}/>;})}</SG>
    <Cd><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h3 style={{fontSize:16,fontWeight:700}}>Journal</h3><Bt sm onClick={add}>{"\u2795 Ajouter"}</Bt></div>
      {recs.length===0?<Et icon={"\u{1F4DD}"} text="Aucun enregistrement"/>:
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr><TH>Date</TH><TH>Type</TH><TH>Événement</TH><TH>Qté</TH><TH>Notes</TH><TH></TH></tr></thead>
      <tbody>{recs.slice().reverse().map(function(r){var a=ANIMALS.find(function(x){return x.id===r.type;})||{icon:"",label:""};return <tr key={r.id} style={{borderBottom:"1px solid "+K.b}}><TD>{r.date}</TD><TD>{a.icon+" "+a.label}</TD><TD><Bg c="blue">{r.event}</Bg></TD><TD>{r.quantity}</TD><TD style={{fontSize:12,color:K.m,maxWidth:160,overflow:"hidden",textOverflow:"ellipsis"}}>{r.notes}</TD><TD><Bt v="ghost" sm onClick={function(){save(Object.assign({},farm,{elevageRecords:recs.filter(function(x){return x.id!==r.id;})}));}}>{"🗑"}</Bt></TD></tr>;})}</tbody></table></div>}</Cd>
    {modal==="add"&&<Ml onClose={function(){setModal(null);}}><h3 style={{fontSize:18,fontWeight:700,marginBottom:20}}>Nouvel Événement</h3>
      <R2><Fl label="Date"><Ip type="date" value={form.date} onChange={function(e){setForm(Object.assign({},form,{date:e.target.value}));}}/></Fl><Fl label="Type"><Sl value={form.type} onChange={function(e){setForm(Object.assign({},form,{type:e.target.value}));}}>{ANIMALS.map(function(a){return <option key={a.id} value={a.id}>{a.icon+" "+a.label}</option>;})}</Sl></Fl></R2>
      <R2><Fl label="Événement"><Sl value={form.event} onChange={function(e){setForm(Object.assign({},form,{event:e.target.value}));}}>{["Vaccination","Traitement","Naissance","Décès","Vente","Achat","Alimentation","Pesée","Tonte","Récolte miel","Contrôle"].map(function(e){return <option key={e} value={e}>{e}</option>;})}</Sl></Fl><Fl label="Quantité"><Ip type="number" value={form.quantity} onChange={function(e){setForm(Object.assign({},form,{quantity:parseInt(e.target.value)||0}));}}/></Fl></R2>
      <Fl label="Notes"><Ta value={form.notes} onChange={function(e){setForm(Object.assign({},form,{notes:e.target.value}));}}/></Fl>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}><Bt v="secondary" onClick={function(){setModal(null);}}>Annuler</Bt><Bt onClick={sv}>Enregistrer</Bt></div>
    </Ml>}</div>;
}

/* ═══ CULTURES ═══ */
function CulturesPage({farm,save}){
  var _m=useState(null),modal=_m[0],setModal=_m[1];var _f=useState({}),form=_f[0],setForm=_f[1];var recs=farm.cultureRecords||[];
  function add(){setForm({date:new Date().toISOString().split("T")[0],type:"cereales",activity:"Semis",parcelle:"",notes:""});setModal("add");}
  function sv(){save(Object.assign({},farm,{cultureRecords:recs.concat([Object.assign({},form,{id:Date.now()+""})])}));setModal(null);}
  return <div><PT icon={"\u{1F33E}"}>Suivi Cultures</PT>
    <SG>{CROPS.map(function(cr){return <St key={cr.id} icon={cr.icon} value={(((farm.cultures||{})[cr.id]||{}).surface||0)+" ha"} label={cr.label} bg={K.af}/>;})}<St icon={"\u{1F4CA}"} value={recs.length} label="Opérations"/></SG>
    <Cd><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h3 style={{fontSize:16,fontWeight:700}}>Journal</h3><Bt sm onClick={add}>{"\u2795 Ajouter"}</Bt></div>
      {recs.length===0?<Et icon={"\u{1F331}"} text="Aucune opération"/>:
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr><TH>Date</TH><TH>Type</TH><TH>Activité</TH><TH>Parcelle</TH><TH></TH></tr></thead>
      <tbody>{recs.slice().reverse().map(function(r){var cr=CROPS.find(function(x){return x.id===r.type;})||{icon:"",label:""};return <tr key={r.id} style={{borderBottom:"1px solid "+K.b}}><TD>{r.date}</TD><TD>{cr.icon+" "+cr.label}</TD><TD><Bg>{r.activity}</Bg></TD><TD>{r.parcelle}</TD><TD><Bt v="ghost" sm onClick={function(){save(Object.assign({},farm,{cultureRecords:recs.filter(function(x){return x.id!==r.id;})}));}}>{"🗑"}</Bt></TD></tr>;})}</tbody></table></div>}</Cd>
    {modal==="add"&&<Ml onClose={function(){setModal(null);}}><h3 style={{fontSize:18,fontWeight:700,marginBottom:20}}>Nouvelle Opération</h3>
      <R2><Fl label="Date"><Ip type="date" value={form.date} onChange={function(e){setForm(Object.assign({},form,{date:e.target.value}));}}/></Fl><Fl label="Type"><Sl value={form.type} onChange={function(e){setForm(Object.assign({},form,{type:e.target.value}));}}>{CROPS.map(function(c){return <option key={c.id} value={c.id}>{c.icon+" "+c.label}</option>;})}</Sl></Fl></R2>
      <R2><Fl label="Activité"><Sl value={form.activity} onChange={function(e){setForm(Object.assign({},form,{activity:e.target.value}));}}>{["Semis","Labour","Récolte","Désherbage","Taille","Plantation","Buttage","Binage","Cueillette","Analyse sol"].map(function(a){return <option key={a} value={a}>{a}</option>;})}</Sl></Fl><Fl label="Parcelle"><Ip value={form.parcelle} onChange={function(e){setForm(Object.assign({},form,{parcelle:e.target.value}));}}/></Fl></R2>
      <Fl label="Notes"><Ta value={form.notes} onChange={function(e){setForm(Object.assign({},form,{notes:e.target.value}));}}/></Fl>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}><Bt v="secondary" onClick={function(){setModal(null);}}>Annuler</Bt><Bt onClick={sv}>Enregistrer</Bt></div>
    </Ml>}</div>;
}

/* ═══ IRRIGATION ═══ */
function IrrigationPage({farm,save}){
  var _m=useState(null),modal=_m[0],setModal=_m[1];var _f=useState({}),form=_f[0],setForm=_f[1];var pl=farm.irrigationPlans||[];
  function add(){setForm({parcelle:"",technique:"Goutte-à-goutte",frequency:"Quotidien",duration:60,notes:""});setModal("add");}
  function sv(){save(Object.assign({},farm,{irrigationPlans:pl.concat([Object.assign({},form,{id:Date.now()+"",status:"actif"})])}));setModal(null);}
  return <div><PT icon={"\u{1F4A7}"}>Irrigation</PT>
    <SG><St icon={"\u{1F4A7}"} value={(farm.irrigatedSurface||0)+" ha"} label="Surface irriguée" bg="rgba(59,130,246,.15)"/><St icon={"\u{1F4CB}"} value={pl.length} label="Plans"/><St icon={"\u2705"} value={pl.filter(function(p){return p.status==="actif";}).length} label="Actifs"/></SG>
    <Cd><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h3 style={{fontSize:16,fontWeight:700}}>Plans</h3><Bt sm onClick={add}>{"\u2795 Nouveau"}</Bt></div>
      {pl.length===0?<Et icon={"\u{1F4A7}"} text="Aucun plan"/>:
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr><TH>Parcelle</TH><TH>Technique</TH><TH>Fréquence</TH><TH>Durée</TH><TH>Statut</TH><TH></TH></tr></thead>
      <tbody>{pl.map(function(p){return <tr key={p.id} style={{borderBottom:"1px solid "+K.b}}><TD style={{fontWeight:600}}>{p.parcelle}</TD><TD>{p.technique}</TD><TD>{p.frequency}</TD><TD>{p.duration+"min"}</TD><TD><span style={{cursor:"pointer"}} onClick={function(){save(Object.assign({},farm,{irrigationPlans:pl.map(function(x){return x.id===p.id?Object.assign({},x,{status:x.status==="actif"?"pause":"actif"}):x;})}));}}><Bg c={p.status==="actif"?"green":"amber"}>{p.status}</Bg></span></TD><TD><Bt v="ghost" sm onClick={function(){save(Object.assign({},farm,{irrigationPlans:pl.filter(function(x){return x.id!==p.id;})}));}}>{"🗑"}</Bt></TD></tr>;})}</tbody></table></div>}</Cd>
    <Cd><h3 style={{fontSize:16,fontWeight:700,marginBottom:12}}>Techniques Recommandées</h3><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))",gap:10}}>{[{a:"Céréales",t:"Aspersion/Pivot",n:"Couverture uniforme"},{a:"Fruits",t:"Goutte-à-goutte",n:"Économie d'eau"},{a:"Légumes",t:"Micro-aspersion",n:"Précision"},{a:"Pâturages",t:"Gravitaire",n:"Simple"},{a:"Mellifères",t:"Goutte-à-goutte",n:"Flore apicole"}].map(function(x,i){return <div key={i} style={{padding:14,background:K.ip,borderRadius:8,border:"1px solid "+K.b}}><div style={{fontWeight:600}}>{x.a}</div><div style={{color:K.g,fontSize:13}}>{"\u2192 "+x.t}</div><div style={{fontSize:12,color:K.m}}>{x.n}</div></div>;})}</div></Cd>
    {modal==="add"&&<Ml onClose={function(){setModal(null);}}><h3 style={{fontSize:18,fontWeight:700,marginBottom:20}}>Nouveau Plan</h3>
      <R2><Fl label="Parcelle"><Ip value={form.parcelle} onChange={function(e){setForm(Object.assign({},form,{parcelle:e.target.value}));}}/></Fl><Fl label="Technique"><Sl value={form.technique} onChange={function(e){setForm(Object.assign({},form,{technique:e.target.value}));}}>{IRRIG.map(function(t){return <option key={t} value={t}>{t}</option>;})}</Sl></Fl></R2>
      <R2><Fl label="Fréquence"><Sl value={form.frequency} onChange={function(e){setForm(Object.assign({},form,{frequency:e.target.value}));}}>{["Quotidien","Tous les 2 jours","Hebdomadaire","Mensuel"].map(function(f){return <option key={f} value={f}>{f}</option>;})}</Sl></Fl><Fl label="Durée (min)"><Ip type="number" value={form.duration} onChange={function(e){setForm(Object.assign({},form,{duration:parseInt(e.target.value)||0}));}}/></Fl></R2>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}><Bt v="secondary" onClick={function(){setModal(null);}}>Annuler</Bt><Bt onClick={sv}>Enregistrer</Bt></div>
    </Ml>}</div>;
}

/* ═══ TRAITEMENTS ═══ */
function TraitementsPage({farm,save}){
  var _m=useState(null),modal=_m[0],setModal=_m[1];var _f=useState({}),form=_f[0],setForm=_f[1];var recs=farm.traitements||[];
  function add(){setForm({date:new Date().toISOString().split("T")[0],type:"Fertilisation",product:"",dose:"",parcelle:"",dar:7,toxicity:"faible",notes:""});setModal("add");}
  function sv(){save(Object.assign({},farm,{traitements:recs.concat([Object.assign({},form,{id:Date.now()+""})])}));setModal(null);}
  var dw=recs.filter(function(r){return Math.floor((Date.now()-new Date(r.date).getTime())/864e5)<(r.dar||0);});
  return <div><PT icon={"\u{1F9EA}"}>Traitements</PT>
    <SG>{TREATS.map(function(t){var ic={Fertilisation:"\u{1F9EA}",Insecticide:"\u{1F99F}",Fongicide:"\u{1F344}",Herbicide:"\u{1F33F}","Suivi toxicologique":"\u2620\uFE0F"};return <St key={t} icon={ic[t]||"\u{1F9EA}"} value={recs.filter(function(r){return r.type===t;}).length} label={t} bg={K.af}/>;})}</SG>
    {dw.length>0&&<Cd style={{borderColor:K.r}}><h3 style={{fontSize:16,fontWeight:700,color:K.r,marginBottom:12}}>{"\u26A0\uFE0F DAR en cours"}</h3>{dw.map(function(r){var rem=(r.dar||0)-Math.floor((Date.now()-new Date(r.date).getTime())/864e5);return <div key={r.id} style={{padding:8,marginBottom:4,background:K.rf,borderRadius:6,fontSize:13}}><strong>{r.product}</strong>{" \u2014 "+r.parcelle+" \u2014 "}<span style={{color:K.r}}>{rem+"j restant(s)"}</span></div>;})}</Cd>}
    <Cd><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h3 style={{fontSize:16,fontWeight:700}}>Registre</h3><Bt sm onClick={add}>{"\u2795 Ajouter"}</Bt></div>
      {recs.length===0?<Et icon={"\u{1F9EA}"} text="Aucun traitement"/>:
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr><TH>Date</TH><TH>Type</TH><TH>Produit</TH><TH>Dose</TH><TH>Parcelle</TH><TH>DAR</TH><TH>Toxicité</TH><TH></TH></tr></thead>
      <tbody>{recs.slice().reverse().map(function(r){return <tr key={r.id} style={{borderBottom:"1px solid "+K.b}}><TD>{r.date}</TD><TD>{r.type}</TD><TD style={{fontWeight:600}}>{r.product}</TD><TD>{r.dose}</TD><TD>{r.parcelle}</TD><TD>{r.dar+"j"}</TD><TD><Bg c={r.toxicity==="élevé"?"red":r.toxicity==="moyen"?"amber":"green"}>{r.toxicity}</Bg></TD><TD><Bt v="ghost" sm onClick={function(){save(Object.assign({},farm,{traitements:recs.filter(function(x){return x.id!==r.id;})}));}}>{"🗑"}</Bt></TD></tr>;})}</tbody></table></div>}</Cd>
    {modal==="add"&&<Ml onClose={function(){setModal(null);}}><h3 style={{fontSize:18,fontWeight:700,marginBottom:20}}>Nouveau Traitement</h3>
      <R2><Fl label="Date"><Ip type="date" value={form.date} onChange={function(e){setForm(Object.assign({},form,{date:e.target.value}));}}/></Fl><Fl label="Type"><Sl value={form.type} onChange={function(e){setForm(Object.assign({},form,{type:e.target.value}));}}>{TREATS.map(function(t){return <option key={t} value={t}>{t}</option>;})}</Sl></Fl></R2>
      <R2><Fl label="Produit"><Ip value={form.product} onChange={function(e){setForm(Object.assign({},form,{product:e.target.value}));}}/></Fl><Fl label="Dose"><Ip value={form.dose} onChange={function(e){setForm(Object.assign({},form,{dose:e.target.value}));}}/></Fl></R2>
      <R2><Fl label="Parcelle"><Ip value={form.parcelle} onChange={function(e){setForm(Object.assign({},form,{parcelle:e.target.value}));}}/></Fl><Fl label="DAR (j)"><Ip type="number" value={form.dar} onChange={function(e){setForm(Object.assign({},form,{dar:parseInt(e.target.value)||0}));}}/></Fl></R2>
      <Fl label="Toxicité"><Sl value={form.toxicity} onChange={function(e){setForm(Object.assign({},form,{toxicity:e.target.value}));}}><option value="faible">Faible</option><option value="moyen">Moyen</option><option value="élevé">Élevé</option></Sl></Fl>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}><Bt v="secondary" onClick={function(){setModal(null);}}>Annuler</Bt><Bt onClick={sv}>Enregistrer</Bt></div>
    </Ml>}</div>;
}

/* ═══ MÉTÉO ═══ */
function MeteoPage({farm}){
  var dn=["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];var wi=["\u2600\uFE0F","\u26C5","\u{1F324}\uFE0F","\u2601\uFE0F","\u{1F327}\uFE0F","\u{1F326}\uFE0F"];
  var fc=[];for(var i=0;i<7;i++){var d=new Date();d.setDate(d.getDate()+i);fc.push({day:dn[d.getDay()],dt:d.toLocaleDateString("fr-FR",{day:"numeric",month:"short"}),icon:wi[i%wi.length],temp:Math.round(20+Math.sin(i)*7+3),min:Math.round(11+Math.sin(i)*4),hum:Math.round(50+Math.cos(i)*15),wind:Math.round(10+Math.sin(i+1)*8),rain:Math.round(Math.max(0,Math.sin(i+2)*12))});}
  var td=fc[0];
  return <div><PT icon={"\u{1F324}\uFE0F"}>{"Météo \u2014 "+(farm.location||"Maroc")}</PT>
    <Cd><div style={{display:"flex",alignItems:"center",gap:24,flexWrap:"wrap"}}><span style={{fontSize:52}}>{td.icon}</span><div><div style={{fontSize:38,fontWeight:800,color:K.g}}>{td.temp+"\u00B0C"}</div><div style={{color:K.m}}>{"Aujourd'hui"}</div></div><div style={{marginLeft:"auto",display:"flex",gap:24}}><div><div style={{fontSize:11,color:K.m}}>Hum.</div><div style={{fontWeight:700,fontSize:18}}>{td.hum+"%"}</div></div><div><div style={{fontSize:11,color:K.m}}>Vent</div><div style={{fontWeight:700,fontSize:18}}>{td.wind+"km/h"}</div></div><div><div style={{fontSize:11,color:K.m}}>Pluie</div><div style={{fontWeight:700,fontSize:18}}>{td.rain+"mm"}</div></div></div></div></Cd>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:10,marginBottom:20}}>{fc.slice(1).map(function(d,i){return <div key={i} style={{background:K.ip,border:"1px solid "+K.b,borderRadius:10,padding:12,textAlign:"center"}}><div style={{fontWeight:600,fontSize:12}}>{d.day}</div><div style={{fontSize:28,margin:"4px 0"}}>{d.icon}</div><div style={{fontSize:20,fontWeight:700,color:K.g}}>{d.temp+"\u00B0"}</div></div>;})}</div>
    <Cd><h3 style={{fontSize:16,fontWeight:700,marginBottom:12}}>Conseils</h3><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:10}}>{[{i:"\u{1F4A7}",t:"Irrigation",p:td.rain>10?"Réduire":"Irriguer"},{i:"\u{1F9EA}",t:"Traitements",p:td.wind>20?"Vent! Pas de pulvé":"OK"},{i:"\u{1F33E}",t:"Cultures",p:td.temp>32?"Protéger":"OK"},{i:"\u{1F404}",t:"Élevage",p:td.temp>35?"Eau!":"Normal"}].map(function(c,i){return <div key={i} style={{padding:14,background:K.ip,borderRadius:8,border:"1px solid "+K.b}}><div style={{fontSize:20,marginBottom:4}}>{c.i}</div><div style={{fontWeight:600,marginBottom:4}}>{c.t}</div><div style={{fontSize:13,color:K.m}}>{c.p}</div></div>;})}</div></Cd></div>;
}

/* ═══ PRODUCTION ═══ */
function ProductionPage({farm,save}){
  var _m=useState(null),modal=_m[0],setModal=_m[1];var _f=useState({}),form=_f[0],setForm=_f[1];var recs=farm.productions||[];
  function add(){setForm({date:new Date().toISOString().split("T")[0],activity:"",product:"",quantity:0,unit:"kg",revenue:0,notes:""});setModal("add");}
  function sv(){save(Object.assign({},farm,{productions:recs.concat([Object.assign({},form,{id:Date.now()+""})])}));setModal(null);}
  var tR=0,tQ=0;for(var i=0;i<recs.length;i++){tR+=parseFloat(recs[i].revenue)||0;tQ+=parseFloat(recs[i].quantity)||0;}
  return <div><PT icon={"\u{1F4CA}"}>Production</PT>
    <SG><St icon={"\u{1F4E6}"} value={recs.length} label="Enregistrements"/><St icon={"\u2696\uFE0F"} value={tQ.toLocaleString()} label="Quantité" bg={K.af}/><St icon={"\u{1F4B0}"} value={tR.toLocaleString()+" MAD"} label="Revenu" bg="rgba(16,185,129,.15)"/></SG>
    <Cd><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h3 style={{fontSize:16,fontWeight:700}}>Registre</h3><Bt sm onClick={add}>{"\u2795 Ajouter"}</Bt></div>
      {recs.length===0?<Et icon={"\u{1F4CA}"} text="Aucune production"/>:
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr><TH>Date</TH><TH>Activité</TH><TH>Produit</TH><TH>Qté</TH><TH>Revenu</TH><TH></TH></tr></thead>
      <tbody>{recs.slice().reverse().map(function(r){return <tr key={r.id} style={{borderBottom:"1px solid "+K.b}}><TD>{r.date}</TD><TD style={{fontWeight:600}}>{r.activity}</TD><TD>{r.product}</TD><TD>{r.quantity+" "+r.unit}</TD><TD style={{color:K.g,fontWeight:600}}>{(parseFloat(r.revenue)||0).toLocaleString()+" MAD"}</TD><TD><Bt v="ghost" sm onClick={function(){save(Object.assign({},farm,{productions:recs.filter(function(x){return x.id!==r.id;})}));}}>{"🗑"}</Bt></TD></tr>;})}</tbody></table></div>}</Cd>
    {modal==="add"&&<Ml onClose={function(){setModal(null);}}><h3 style={{fontSize:18,fontWeight:700,marginBottom:20}}>Nouvelle Production</h3>
      <R2><Fl label="Date"><Ip type="date" value={form.date} onChange={function(e){setForm(Object.assign({},form,{date:e.target.value}));}}/></Fl><Fl label="Activité"><Sl value={form.activity} onChange={function(e){setForm(Object.assign({},form,{activity:e.target.value}));}}><option value="">{"--"}</option>{["Lait bovins","Viande bovins","Lait caprins","Lapins","Oeufs","Poulets","Miel","Cire","Blé","Orge","Maïs","Agrumes","Olives","Tomates","Oignons","Autres"].map(function(a){return <option key={a} value={a}>{a}</option>;})}</Sl></Fl></R2>
      <R2><Fl label="Produit"><Ip value={form.product} onChange={function(e){setForm(Object.assign({},form,{product:e.target.value}));}}/></Fl><Fl label="Quantité"><div style={{display:"flex",gap:8}}><Ip type="number" value={form.quantity} onChange={function(e){setForm(Object.assign({},form,{quantity:parseFloat(e.target.value)||0}));}} style={{flex:1}}/><Sl value={form.unit} onChange={function(e){setForm(Object.assign({},form,{unit:e.target.value}));}} style={{width:80}}>{["kg","L","unités","tonnes","quintaux"].map(function(u){return <option key={u} value={u}>{u}</option>;})}</Sl></div></Fl></R2>
      <Fl label="Revenu (MAD)"><Ip type="number" value={form.revenue} onChange={function(e){setForm(Object.assign({},form,{revenue:parseFloat(e.target.value)||0}));}}/></Fl>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}><Bt v="secondary" onClick={function(){setModal(null);}}>Annuler</Bt><Bt onClick={sv}>Enregistrer</Bt></div>
    </Ml>}</div>;
}

/* ═══ DASHBOARD ═══ */
function DashboardPage({farm}){
  var an=farm.animals||{};var totalAnimals=0;ANIMALS.forEach(function(a){totalAnimals+=(an[a.id]||0);});
  var totalCropHa=0;CROPS.forEach(function(c){totalCropHa+=((farm.cultures||{})[c.id]||{}).surface||0;});
  var elevRecs=farm.elevageRecords||[];var cultRecs=farm.cultureRecords||[];var irPlans=farm.irrigationPlans||[];var treats=farm.traitements||[];var prods=farm.productions||[];var plannings=farm.plannings||[];
  var tRev=0;prods.forEach(function(p){tRev+=parseFloat(p.revenue)||0;});
  var tQty=0;prods.forEach(function(p){tQty+=parseFloat(p.quantity)||0;});
  var now=new Date();var thisMonth=now.getFullYear()+"-"+(now.getMonth()+1<10?"0":"")+(now.getMonth()+1);
  var elevThisMonth=elevRecs.filter(function(r){return r.date&&r.date.substring(0,7)===thisMonth;}).length;
  var cultThisMonth=cultRecs.filter(function(r){return r.date&&r.date.substring(0,7)===thisMonth;}).length;
  var treatsThisMonth=treats.filter(function(r){return r.date&&r.date.substring(0,7)===thisMonth;}).length;
  var prodsThisMonth=prods.filter(function(r){return r.date&&r.date.substring(0,7)===thisMonth;}).length;
  var darActive=treats.filter(function(r){var d=Math.floor((Date.now()-new Date(r.date).getTime())/864e5);return d<(r.dar||0);});
  var activePlans=irPlans.filter(function(p){return p.status==="actif";}).length;

  // Recent activity (last 10 events across all)
  var allEvents=[];
  elevRecs.forEach(function(r){allEvents.push({date:r.date,type:"\u{1F404} Élevage",desc:r.event+" ("+((ANIMALS.find(function(a){return a.id===r.type;})||{}).label||"")+")",color:"blue"});});
  cultRecs.forEach(function(r){allEvents.push({date:r.date,type:"\u{1F33E} Cultures",desc:r.activity+" - "+r.parcelle,color:"green"});});
  treats.forEach(function(r){allEvents.push({date:r.date,type:"\u{1F9EA} Traitement",desc:r.type+" - "+r.product,color:"amber"});});
  prods.forEach(function(r){allEvents.push({date:r.date,type:"\u{1F4E6} Production",desc:r.activity+" "+r.quantity+r.unit,color:"green"});});
  allEvents.sort(function(a,b){return a.date>b.date?-1:1;});
  var recent=allEvents.slice(0,10);

  // Monthly production chart (last 6 months)
  var months=[];for(var i=5;i>=0;i--){var md=new Date();md.setMonth(md.getMonth()-i);var mk=md.getFullYear()+"-"+(md.getMonth()+1<10?"0":"")+(md.getMonth()+1);var ml=md.toLocaleDateString("fr-FR",{month:"short"});var mRev=0;prods.forEach(function(p){if(p.date&&p.date.substring(0,7)===mk)mRev+=parseFloat(p.revenue)||0;});months.push({key:mk,label:ml,rev:mRev});}
  var maxRev=Math.max.apply(null,months.map(function(m){return m.rev;}))||1;

  return <div>
    <PT icon={"\u{1F4CA}"}>Tableau de Bord</PT>

    {/* KPI Row 1 */}
    <SG>
      <St icon={"\u{1F404}"} value={totalAnimals} label="Total Animaux"/>
      <St icon={"\u{1F33E}"} value={totalCropHa+" ha"} label="Cultures"/>
      <St icon={"\u{1F477}"} value={(farm.employees||[]).length} label="Employés"/>
      <St icon={"\u{1F4B0}"} value={tRev.toLocaleString()+" MAD"} label="Revenu Total" bg="rgba(16,185,129,.15)"/>
    </SG>

    {/* KPI Row 2 - This month */}
    <SG>
      <St icon={"\u{1F4C5}"} value={elevThisMonth} label={"Événements élevage ("+thisMonth.substring(5)+")"} bg={K.af}/>
      <St icon={"\u{1F331}"} value={cultThisMonth} label="Opérations cultures" bg={K.af}/>
      <St icon={"\u{1F9EA}"} value={treatsThisMonth} label="Traitements" bg={K.af}/>
      <St icon={"\u{1F4A7}"} value={activePlans} label="Plans irrigation actifs" bg="rgba(59,130,246,.15)"/>
    </SG>

    {/* DAR alerts */}
    {darActive.length>0&&<Cd style={{borderColor:K.r}}>
      <h3 style={{fontSize:15,fontWeight:700,color:K.r,marginBottom:10}}>{"\u26A0\uFE0F "+darActive.length+" DAR en cours"}</h3>
      {darActive.map(function(r){var rem=(r.dar||0)-Math.floor((Date.now()-new Date(r.date).getTime())/864e5);return <div key={r.id} style={{padding:6,marginBottom:3,background:K.rf,borderRadius:6,fontSize:13}}><strong>{r.product}</strong>{" \u2014 "+r.parcelle+" \u2014 "}<span style={{color:K.r}}>{rem+"j"}</span></div>;})}
    </Cd>}

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      {/* Mini bar chart - Revenue per month */}
      <Cd>
        <h3 style={{fontSize:15,fontWeight:700,marginBottom:16}}>{"\u{1F4C8} Revenus (6 derniers mois)"}</h3>
        <div style={{display:"flex",alignItems:"flex-end",gap:8,height:140}}>
          {months.map(function(m){var h=Math.max(8,Math.round(m.rev/maxRev*120));return <div key={m.key} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
            <div style={{fontSize:10,color:K.m,fontWeight:600}}>{m.rev>0?(m.rev/1000).toFixed(0)+"k":""}</div>
            <div style={{width:"100%",height:h,background:m.rev>0?"linear-gradient(to top,"+K.g+",rgba(74,222,128,.4))":K.ip,borderRadius:4}}/>
            <div style={{fontSize:10,color:K.m}}>{m.label}</div>
          </div>;})}
        </div>
      </Cd>

      {/* Animals breakdown */}
      <Cd>
        <h3 style={{fontSize:15,fontWeight:700,marginBottom:16}}>{"\u{1F404} Cheptel"}</h3>
        {ANIMALS.map(function(a){var count=an[a.id]||0;var pct=totalAnimals>0?Math.round(count/totalAnimals*100):0;return <div key={a.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
          <span style={{fontSize:20,width:28}}>{a.icon}</span>
          <span style={{width:80,fontSize:13,fontWeight:600}}>{a.label}</span>
          <div style={{flex:1,height:8,background:K.ip,borderRadius:4,overflow:"hidden"}}><div style={{width:pct+"%",height:"100%",background:K.g,borderRadius:4}}/></div>
          <span style={{fontSize:13,fontWeight:700,minWidth:40,textAlign:"right"}}>{count}</span>
        </div>;})}
      </Cd>
    </div>

    {/* Recent Activity */}
    <Cd>
      <h3 style={{fontSize:15,fontWeight:700,marginBottom:12}}>{"\u{1F551} Activité Récente"}</h3>
      {recent.length===0?<Et icon={"\u{1F4CB}"} text="Aucune activité enregistrée"/>:
      <div>{recent.map(function(ev,i){return <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 0",borderBottom:i<recent.length-1?"1px solid "+K.b:"none"}}>
        <div style={{fontSize:12,color:K.m,minWidth:80}}>{ev.date}</div>
        <Bg c={ev.color}>{ev.type}</Bg>
        <div style={{fontSize:13,flex:1}}>{ev.desc}</div>
      </div>;})}</div>}
    </Cd>
  </div>;
}

/* ═══ PLANNING ═══ */
function PlanningPage({farm,save}){
  var _view=useState("month"),view=_view[0],setView=_view[1];
  var _cur=useState(new Date()),curDate=_cur[0],setCurDate=_cur[1];
  var _modal=useState(null),modal=_modal[0],setModal=_modal[1];
  var _form=useState({}),form=_form[0],setForm=_form[1];
  var plannings=farm.plannings||[];

  var PLAN_CATS=[
    {id:"elevage",label:"Élevage",icon:"\u{1F404}",color:"#3b82f6"},
    {id:"culture",label:"Culture",icon:"\u{1F33E}",color:"#10b981"},
    {id:"irrigation",label:"Irrigation",icon:"\u{1F4A7}",color:"#06b6d4"},
    {id:"traitement",label:"Traitement",icon:"\u{1F9EA}",color:"#f59e0b"},
    {id:"recolte",label:"Récolte",icon:"\u{1F4E6}",color:"#8b5cf6"},
    {id:"maintenance",label:"Maintenance",icon:"\u{1F527}",color:"#ef4444"},
    {id:"autre",label:"Autre",icon:"\u{1F4CC}",color:"#6b7280"}
  ];

  function addPlan(dateStr){
    setForm({date:dateStr||new Date().toISOString().split("T")[0],endDate:"",category:"culture",title:"",description:"",priority:"normal",assignee:""});
    setModal("add");
  }

  function savePlan(){
    if(!form.title)return;
    save(Object.assign({},farm,{plannings:plannings.concat([Object.assign({},form,{id:Date.now()+""})])}));
    setModal(null);
  }

  function delPlan(id){save(Object.assign({},farm,{plannings:plannings.filter(function(p){return p.id!==id;})}));}

  // Calendar helpers
  var year=curDate.getFullYear();var month=curDate.getMonth();
  var firstDay=new Date(year,month,1).getDay();
  var daysInMonth=new Date(year,month+1,0).getDate();
  var monthLabel=curDate.toLocaleDateString("fr-FR",{month:"long",year:"numeric"});

  function nav(dir){
    var d=new Date(curDate);
    if(view==="month") d.setMonth(d.getMonth()+dir);
    else if(view==="week") d.setDate(d.getDate()+dir*7);
    else d.setDate(d.getDate()+dir);
    setCurDate(d);
  }

  function getEventsForDate(dateStr){
    return plannings.filter(function(p){
      if(p.endDate && p.endDate>=dateStr && p.date<=dateStr) return true;
      return p.date===dateStr;
    });
  }

  function getCatInfo(catId){return PLAN_CATS.find(function(c){return c.id===catId;})||PLAN_CATS[6];}

  // Also gather real events from farm records for the calendar
  function getRealEventsForDate(dateStr){
    var evts=[];
    (farm.elevageRecords||[]).forEach(function(r){if(r.date===dateStr)evts.push({cat:"elevage",desc:r.event});});
    (farm.cultureRecords||[]).forEach(function(r){if(r.date===dateStr)evts.push({cat:"culture",desc:r.activity});});
    (farm.traitements||[]).forEach(function(r){if(r.date===dateStr)evts.push({cat:"traitement",desc:r.type});});
    return evts;
  }

  // Week view helpers
  function getWeekDates(){
    var d=new Date(curDate);var day=d.getDay();var start=new Date(d);start.setDate(start.getDate()-day);
    var dates=[];for(var i=0;i<7;i++){var dd=new Date(start);dd.setDate(dd.getDate()+i);dates.push(dd);}
    return dates;
  }

  var dayNames=["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];
  var today=new Date().toISOString().split("T")[0];

  // Priority colors
  function priColor(p){return p==="urgent"?K.r:p==="important"?K.a:K.g;}

  return <div>
    <PT icon={"\u{1F4C5}"}>Planning Prévisionnel</PT>

    {/* View toggle + navigation */}
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
      <Tb tabs={[{id:"day",label:"\u{1F4C6} Jour"},{id:"week",label:"\u{1F4C5} Semaine"},{id:"month",label:"\u{1F5D3}\uFE0F Mois"}]} active={view} onChange={setView}/>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <Bt v="secondary" sm onClick={function(){nav(-1);}}>{"<"}</Bt>
        <span style={{fontWeight:700,fontSize:15,minWidth:160,textAlign:"center"}}>
          {view==="month"?monthLabel:view==="week"?("Semaine du "+getWeekDates()[0].toLocaleDateString("fr-FR",{day:"numeric",month:"short"})):curDate.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
        </span>
        <Bt v="secondary" sm onClick={function(){nav(1);}}>{">"}</Bt>
        <Bt sm onClick={function(){setCurDate(new Date());}}>{"Aujourd'hui"}</Bt>
      </div>
      <Bt sm onClick={function(){addPlan();}}>{"+ Planifier"}</Bt>
    </div>

    {/* ── MONTH VIEW ── */}
    {view==="month"&&<Cd style={{padding:12}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
        {dayNames.map(function(d){return <div key={d} style={{textAlign:"center",padding:6,fontSize:11,fontWeight:700,color:K.m}}>{d}</div>;})}
        {Array.from({length:firstDay}).map(function(_,i){return <div key={"e"+i} style={{padding:6}}/>;})}
        {Array.from({length:daysInMonth}).map(function(_,i){
          var dayNum=i+1;var ds=year+"-"+(month+1<10?"0":"")+(month+1)+"-"+(dayNum<10?"0":"")+dayNum;
          var planned=getEventsForDate(ds);var real=getRealEventsForDate(ds);var isToday=ds===today;
          return <div key={ds} style={{background:isToday?"rgba(74,222,128,.15)":K.ip,border:"1px solid "+(isToday?K.g:K.b),borderRadius:6,padding:4,minHeight:70,cursor:"pointer",overflow:"hidden"}} onClick={function(){setCurDate(new Date(year,month,dayNum));setView("day");}}>
            <div style={{fontSize:12,fontWeight:isToday?800:600,color:isToday?K.g:K.t,marginBottom:2}}>{dayNum}</div>
            {planned.slice(0,2).map(function(p){var cat=getCatInfo(p.category);return <div key={p.id} style={{fontSize:9,padding:"1px 4px",borderRadius:3,marginBottom:1,background:cat.color+"22",color:cat.color,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{cat.icon+" "+p.title}</div>;})}
            {real.slice(0,1).map(function(r,ri){var cat=getCatInfo(r.cat);return <div key={"r"+ri} style={{fontSize:9,padding:"1px 4px",borderRadius:3,marginBottom:1,background:cat.color+"22",color:cat.color,fontStyle:"italic",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{cat.icon+" "+r.desc}</div>;})}
            {(planned.length+real.length)>3&&<div style={{fontSize:9,color:K.m}}>{"+"+(planned.length+real.length-3)}</div>}
          </div>;
        })}
      </div>
    </Cd>}

    {/* ── WEEK VIEW ── */}
    {view==="week"&&<Cd style={{padding:12}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:6}}>
        {getWeekDates().map(function(d){
          var ds=d.toISOString().split("T")[0];var planned=getEventsForDate(ds);var real=getRealEventsForDate(ds);var isToday=ds===today;
          return <div key={ds} style={{background:isToday?"rgba(74,222,128,.12)":K.ip,border:"1px solid "+(isToday?K.g:K.b),borderRadius:8,padding:8,minHeight:180,cursor:"pointer"}} onClick={function(){setCurDate(d);setView("day");}}>
            <div style={{textAlign:"center",marginBottom:6}}>
              <div style={{fontSize:11,color:K.m}}>{dayNames[d.getDay()]}</div>
              <div style={{fontSize:18,fontWeight:isToday?800:600,color:isToday?K.g:K.t}}>{d.getDate()}</div>
            </div>
            {planned.map(function(p){var cat=getCatInfo(p.category);return <div key={p.id} style={{fontSize:11,padding:"3px 6px",borderRadius:4,marginBottom:3,background:cat.color+"22",color:cat.color,borderLeft:"3px solid "+cat.color}}>
              <div style={{fontWeight:600}}>{cat.icon+" "+p.title}</div>
              {p.assignee&&<div style={{fontSize:10,opacity:.7}}>{p.assignee}</div>}
            </div>;})}
            {real.map(function(r,ri){var cat=getCatInfo(r.cat);return <div key={"r"+ri} style={{fontSize:10,padding:"2px 5px",borderRadius:3,marginBottom:2,background:cat.color+"11",color:cat.color,fontStyle:"italic"}}>{cat.icon+" "+r.desc}</div>;})}
            {planned.length===0&&real.length===0&&<div style={{fontSize:11,color:K.d,textAlign:"center",marginTop:20}}>{"Rien"}</div>}
          </div>;
        })}
      </div>
    </Cd>}

    {/* ── DAY VIEW ── */}
    {view==="day"&&function(){
      var ds=curDate.toISOString().split("T")[0];var planned=getEventsForDate(ds);var real=getRealEventsForDate(ds);
      return <div>
        <Cd>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <h3 style={{fontSize:16,fontWeight:700}}>{"\u{1F4C6} Tâches planifiées"}</h3>
            <Bt sm onClick={function(){addPlan(ds);}}>{"+ Ajouter"}</Bt>
          </div>
          {planned.length===0?<Et icon={"\u{1F4C5}"} text="Rien de planifié ce jour"/>:
          <div>{planned.map(function(p){var cat=getCatInfo(p.category);return <div key={p.id} style={{display:"flex",alignItems:"flex-start",gap:12,padding:12,marginBottom:8,background:K.ip,borderRadius:8,borderLeft:"4px solid "+cat.color}}>
            <span style={{fontSize:24}}>{cat.icon}</span>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:15}}>{p.title}</div>
              <div style={{fontSize:12,color:K.m,marginTop:2}}>{cat.label}{p.assignee?" \u2014 "+p.assignee:""}</div>
              {p.description&&<div style={{fontSize:13,color:K.t,marginTop:4}}>{p.description}</div>}
              {p.endDate&&<div style={{fontSize:11,color:K.m,marginTop:2}}>{"Jusqu'au "+p.endDate}</div>}
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
              <Bg c={p.priority==="urgent"?"red":p.priority==="important"?"amber":"green"}>{p.priority}</Bg>
              <Bt v="ghost" sm onClick={function(){delPlan(p.id);}}>{"🗑"}</Bt>
            </div>
          </div>;})}</div>}
        </Cd>
        {real.length>0&&<Cd>
          <h3 style={{fontSize:15,fontWeight:700,marginBottom:10}}>{"\u{1F4CB} Événements réalisés ce jour"}</h3>
          {real.map(function(r,i){var cat=getCatInfo(r.cat);return <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:6,marginBottom:4}}>
            <span style={{fontSize:18}}>{cat.icon}</span><Bg c="blue">{cat.label}</Bg><span style={{fontSize:13}}>{r.desc}</span>
          </div>;})}
        </Cd>}
      </div>;
    }()}

    {/* Legend */}
    <Cd>
      <div style={{display:"flex",flexWrap:"wrap",gap:10,alignItems:"center"}}>
        <span style={{fontSize:12,fontWeight:700,color:K.m}}>Légende :</span>
        {PLAN_CATS.map(function(c){return <span key={c.id} style={{fontSize:11,display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:c.color,display:"inline-block"}}/>{c.icon+" "+c.label}</span>;})}
      </div>
    </Cd>

    {/* Upcoming (next 7 days) */}
    <Cd>
      <h3 style={{fontSize:15,fontWeight:700,marginBottom:12}}>{"\u{1F4C5} Prochains 7 jours"}</h3>
      {function(){
        var upcoming=[];
        for(var i=0;i<7;i++){
          var d=new Date();d.setDate(d.getDate()+i);var ds=d.toISOString().split("T")[0];
          var evts=getEventsForDate(ds);
          if(evts.length>0) evts.forEach(function(p){upcoming.push(Object.assign({},p,{dateStr:ds}));});
        }
        if(upcoming.length===0) return <Et icon={"\u{1F4C5}"} text="Aucune tâche planifiée les 7 prochains jours"/>;
        return <div>{upcoming.map(function(p){var cat=getCatInfo(p.category);return <div key={p.id+p.dateStr} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid "+K.b}}>
          <div style={{fontSize:12,color:K.m,minWidth:80}}>{p.dateStr}</div>
          <span style={{fontSize:16}}>{cat.icon}</span>
          <div style={{flex:1,fontSize:13,fontWeight:600}}>{p.title}</div>
          <Bg c={p.priority==="urgent"?"red":p.priority==="important"?"amber":"green"}>{p.priority}</Bg>
        </div>;})}</div>;
      }()}
    </Cd>

    {/* Add planning modal */}
    {modal==="add"&&<Ml onClose={function(){setModal(null);}}>
      <h3 style={{fontSize:18,fontWeight:700,marginBottom:20}}>Nouvelle Tâche</h3>
      <Fl label="Titre"><Ip value={form.title} onChange={function(e){setForm(Object.assign({},form,{title:e.target.value}));}}/></Fl>
      <R2>
        <Fl label="Date début"><Ip type="date" value={form.date} onChange={function(e){setForm(Object.assign({},form,{date:e.target.value}));}}/></Fl>
        <Fl label="Date fin (optionnel)"><Ip type="date" value={form.endDate} onChange={function(e){setForm(Object.assign({},form,{endDate:e.target.value}));}}/></Fl>
      </R2>
      <R2>
        <Fl label="Catégorie"><Sl value={form.category} onChange={function(e){setForm(Object.assign({},form,{category:e.target.value}));}}>{PLAN_CATS.map(function(c){return <option key={c.id} value={c.id}>{c.icon+" "+c.label}</option>;})}</Sl></Fl>
        <Fl label="Priorité"><Sl value={form.priority} onChange={function(e){setForm(Object.assign({},form,{priority:e.target.value}));}}><option value="normal">Normal</option><option value="important">Important</option><option value="urgent">Urgent</option></Sl></Fl>
      </R2>
      <Fl label="Assigné à">
        <Sl value={form.assignee} onChange={function(e){setForm(Object.assign({},form,{assignee:e.target.value}));}}>
          <option value="">{"-- Non assigné --"}</option>
          {(farm.employees||[]).map(function(emp){return <option key={emp.id} value={emp.name}>{emp.name+" ("+emp.role+")"}</option>;})}
        </Sl>
      </Fl>
      <Fl label="Description"><Ta value={form.description} onChange={function(e){setForm(Object.assign({},form,{description:e.target.value}));}}/></Fl>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}><Bt v="secondary" onClick={function(){setModal(null);}}>Annuler</Bt><Bt onClick={savePlan}>Enregistrer</Bt></div>
    </Ml>}
  </div>;
}

/* ═══ MATÉRIEL AGRICOLE ═══ */
function MaterielPage({farm,save}){
  var _tab=useState("inventaire"),tab=_tab[0],setTab=_tab[1];
  var _modal=useState(null),modal=_modal[0],setModal=_modal[1];
  var _form=useState({}),form=_form[0],setForm=_form[1];
  var mats=farm.materiels||[];
  var maint=farm.maintenances||[];

  var EQUIP_CAT=[
    {id:"tracteur",label:"Tracteurs & Engins",icon:"\u{1F69C}",items:["Tracteur","Motoculteur","Chargeuse","Pelleteuse","Quad agricole","Remorque"]},
    {id:"travail_sol",label:"Travail du Sol",icon:"\u{1F527}",items:["Charrue","Herse","Rotavator","Cultivateur","Sous-soleuse","Disque","Rouleau"]},
    {id:"semis",label:"Semis & Plantation",icon:"\u{1F331}",items:["Semoir","Planteuse","Épandeur engrais","Distributeur semences"]},
    {id:"irrigation_eq",label:"Irrigation",icon:"\u{1F4A7}",items:["Pompe","Tuyaux goutte-à-goutte","Asperseurs","Pivot","Citerne","Groupe motopompe","Filtre"]},
    {id:"traitement_eq",label:"Traitement",icon:"\u{1F9EA}",items:["Pulvérisateur porté","Pulvérisateur traîné","Atomiseur","Désherbeur","Souffleur"]},
    {id:"recolte_eq",label:"Récolte",icon:"\u{1F33E}",items:["Moissonneuse","Ramasseuse","Secoueur oliviers","Vendangeuse","Arracheuse","Faucheuse"]},
    {id:"elevage_eq",label:"Élevage",icon:"\u{1F404}",items:["Machine à traire","Couveuse","Trayeuse","Abreuvoir automatique","Mangeoire","Bascule pesée","Ruches (cadres)"]},
    {id:"transport",label:"Transport & Stockage",icon:"\u{1F69A}",items:["Camionnette","Remorque citerne","Silo","Chambre froide","Bacs stockage"]},
    {id:"outils",label:"Petit Outillage",icon:"\u{1F6E0}\uFE0F",items:["Tronçonneuse","Débroussailleuse","Sécateur électrique","Brouette","Pelle","Pioche","Binette"]}
  ];

  var MAINT_TYPES=["Révision","Vidange","Réparation","Changement pièce","Graissage","Contrôle technique","Hivernage","Mise en service","Calibrage","Nettoyage"];

  var ACTIVITIES_ASSIGN=["Élevage bovins","Élevage caprins","Élevage lapins","Aviculture","Apiculture","Céréales","Fruits","Légumes","Irrigation","Traitement","Transport","Polyvalent"];

  // Stats
  var totalMats=0;mats.forEach(function(m){totalMats+=(parseInt(m.quantity)||1);});
  var enPanne=mats.filter(function(m){return m.status==="panne";}).length;
  var enMaint=mats.filter(function(m){return m.status==="maintenance";}).length;
  var maintsThisMonth=0;var now=new Date();var thisMonth=now.getFullYear()+"-"+(now.getMonth()+1<10?"0":"")+(now.getMonth()+1);
  maint.forEach(function(m){if(m.date&&m.date.substring(0,7)===thisMonth)maintsThisMonth++;});

  // Upcoming maintenance (planned)
  var today=new Date().toISOString().split("T")[0];
  var upcoming=maint.filter(function(m){return m.nextDate&&m.nextDate>=today;}).sort(function(a,b){return a.nextDate>b.nextDate?1:-1;});
  var overdue=maint.filter(function(m){return m.nextDate&&m.nextDate<today;});

  function addMat(){setForm({name:"",category:"tracteur",quantity:1,status:"actif",activity:"Polyvalent",marque:"",annee:"",notes:""});setModal("addMat");}
  function saveMat(){if(!form.name)return;save(Object.assign({},farm,{materiels:mats.concat([Object.assign({},form,{id:Date.now()+""})])}));setModal(null);}
  function delMat(id){
    save(Object.assign({},farm,{materiels:mats.filter(function(m){return m.id!==id;}),maintenances:maint.filter(function(m){return m.materielId!==id;})}));
  }
  function toggleStatus(id,newSt){save(Object.assign({},farm,{materiels:mats.map(function(m){return m.id===id?Object.assign({},m,{status:newSt}):m;})}));}

  function addMaint(){
    var matOpts=mats.map(function(m){return{id:m.id,label:m.name};});
    setForm({materielId:matOpts.length>0?matOpts[0].id:"",date:new Date().toISOString().split("T")[0],type:"Révision",description:"",cost:0,technicien:"",nextDate:"",nextType:"Révision"});
    setModal("addMaint");
  }
  function saveMaint(){if(!form.materielId||!form.date)return;save(Object.assign({},farm,{maintenances:maint.concat([Object.assign({},form,{id:Date.now()+""})])}));setModal(null);}
  function delMaint(id){save(Object.assign({},farm,{maintenances:maint.filter(function(m){return m.id!==id;})}));}

  function getMatName(id){var m=mats.find(function(x){return x.id===id;});return m?m.name:"?";}
  function getCatInfo(catId){return EQUIP_CAT.find(function(c){return c.id===catId;})||{icon:"\u{1F527}",label:"Autre"};}

  return <div>
    <PT icon={"\u{1F69C}"}>{"Matériel Agricole"}</PT>

    <SG>
      <St icon={"\u{1F69C}"} value={totalMats} label="Équipements"/>
      <St icon={"\u2705"} value={mats.filter(function(m){return m.status==="actif";}).length} label="En service"/>
      <St icon={"\u{1F6E0}\uFE0F"} value={enMaint} label="En maintenance" bg={K.af}/>
      <St icon={"\u26A0\uFE0F"} value={enPanne} label="En panne" bg={K.rf}/>
    </SG>

    <Tb tabs={[{id:"inventaire",label:"\u{1F4CB} Inventaire"},{id:"par_activite",label:"\u{1F3E1} Par Activité"},{id:"maintenance",label:"\u{1F527} Maintenance"},{id:"planning_maint",label:"\u{1F4C5} Plan Maintenance"}]} active={tab} onChange={setTab}/>

    {/* ── INVENTAIRE ── */}
    {tab==="inventaire"&&<div>
      <Cd>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h3 style={{fontSize:16,fontWeight:700}}>{"\u{1F4CB} Inventaire Matériel"}</h3>
          <Bt sm onClick={addMat}>{"\u2795 Ajouter"}</Bt>
        </div>
        {mats.length===0?<Et icon={"\u{1F69C}"} text="Aucun matériel enregistré"/>:
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead><tr><TH>Matériel</TH><TH>Catégorie</TH><TH>Qté</TH><TH>Marque</TH><TH>Activité</TH><TH>Statut</TH><TH></TH></tr></thead>
          <tbody>{mats.map(function(m){var cat=getCatInfo(m.category);var lastM=maint.filter(function(x){return x.materielId===m.id;}).sort(function(a,b){return a.date>b.date?-1:1;})[0];
            return <tr key={m.id} style={{borderBottom:"1px solid "+K.b}}>
              <TD style={{fontWeight:600}}><span style={{marginRight:6}}>{cat.icon}</span>{m.name}</TD>
              <TD style={{fontSize:12}}>{cat.label}</TD>
              <TD>{m.quantity||1}</TD>
              <TD style={{fontSize:12,color:K.m}}>{m.marque}{m.annee?" ("+m.annee+")":""}</TD>
              <TD><Bg c="blue">{m.activity||"Polyvalent"}</Bg></TD>
              <TD>
                <Sl value={m.status||"actif"} onChange={function(e){toggleStatus(m.id,e.target.value);}} style={{width:110,padding:"4px 8px",fontSize:12}}>
                  <option value="actif">{"\u2705 Actif"}</option>
                  <option value="maintenance">{"\u{1F527} Maintenance"}</option>
                  <option value="panne">{"\u26A0\uFE0F Panne"}</option>
                  <option value="stocké">{"\u{1F4E6} Stocké"}</option>
                </Sl>
              </TD>
              <TD><Bt v="ghost" sm onClick={function(){delMat(m.id);}}>{"🗑"}</Bt></TD>
            </tr>;})}</tbody>
        </table></div>}
      </Cd>
    </div>}

    {/* ── PAR ACTIVITÉ ── */}
    {tab==="par_activite"&&<div>
      {ACTIVITIES_ASSIGN.map(function(act){
        var actMats=mats.filter(function(m){return m.activity===act;});
        if(actMats.length===0) return null;
        return <Cd key={act}>
          <h3 style={{fontSize:15,fontWeight:700,marginBottom:12}}>{act}</h3>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:8}}>
            {actMats.map(function(m){var cat=getCatInfo(m.category);var stCol=m.status==="panne"?K.r:m.status==="maintenance"?K.a:K.g;
              return <div key={m.id} style={{padding:12,background:K.ip,borderRadius:8,border:"1px solid "+K.b,borderLeft:"4px solid "+stCol}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <span style={{fontSize:20}}>{cat.icon}</span>
                  <div style={{fontWeight:700,fontSize:14}}>{m.name}</div>
                  <span style={{marginLeft:"auto",fontSize:11,fontWeight:700,color:stCol}}>{m.status||"actif"}</span>
                </div>
                <div style={{fontSize:12,color:K.m}}>{"Qté: "+(m.quantity||1)}{m.marque?" \u2014 "+m.marque:""}</div>
              </div>;
            })}
          </div>
        </Cd>;
      })}
      {mats.filter(function(m){return!m.activity||m.activity==="Polyvalent";}).length>0&&<Cd>
        <h3 style={{fontSize:15,fontWeight:700,marginBottom:12}}>Polyvalent</h3>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:8}}>
          {mats.filter(function(m){return!m.activity||m.activity==="Polyvalent";}).map(function(m){var cat=getCatInfo(m.category);return <div key={m.id} style={{padding:12,background:K.ip,borderRadius:8,border:"1px solid "+K.b}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:20}}>{cat.icon}</span><div style={{fontWeight:700,fontSize:14}}>{m.name}</div></div>
            <div style={{fontSize:12,color:K.m}}>{"Qté: "+(m.quantity||1)}</div>
          </div>;})}
        </div>
      </Cd>}
      {mats.length===0&&<Et icon={"\u{1F69C}"} text="Ajoutez du matériel dans l'onglet Inventaire"/>}
    </div>}

    {/* ── HISTORIQUE MAINTENANCE ── */}
    {tab==="maintenance"&&<div>
      <Cd>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h3 style={{fontSize:16,fontWeight:700}}>{"\u{1F527} Historique Maintenance"}</h3>
          <Bt sm onClick={addMaint} dis={mats.length===0}>{"\u2795 Enregistrer"}</Bt>
        </div>
        {mats.length===0&&<div style={{padding:10,background:K.af,borderRadius:8,fontSize:13,marginBottom:12}}>{"Ajoutez d'abord du matériel dans l'inventaire."}</div>}
        <SG>
          <St icon={"\u{1F527}"} value={maint.length} label="Total interventions"/>
          <St icon={"\u{1F4C5}"} value={maintsThisMonth} label="Ce mois" bg={K.af}/>
          <St icon={"\u{1F4B0}"} value={maint.reduce(function(s,m){return s+(parseFloat(m.cost)||0);},0).toLocaleString()+" MAD"} label="Coût total" bg={K.rf}/>
        </SG>
        {maint.length===0?<Et icon={"\u{1F527}"} text="Aucune intervention enregistrée"/>:
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead><tr><TH>Date</TH><TH>Matériel</TH><TH>Type</TH><TH>Description</TH><TH>Coût</TH><TH>Technicien</TH><TH>Prochaine</TH><TH></TH></tr></thead>
          <tbody>{maint.slice().sort(function(a,b){return a.date>b.date?-1:1;}).map(function(m){
            var isOverdue=m.nextDate&&m.nextDate<today;
            return <tr key={m.id} style={{borderBottom:"1px solid "+K.b,background:isOverdue?K.rf+"44":"transparent"}}>
              <TD>{m.date}</TD>
              <TD style={{fontWeight:600}}>{getMatName(m.materielId)}</TD>
              <TD><Bg c="amber">{m.type}</Bg></TD>
              <TD style={{fontSize:12,color:K.m,maxWidth:160,overflow:"hidden",textOverflow:"ellipsis"}}>{m.description}</TD>
              <TD style={{fontWeight:600}}>{(parseFloat(m.cost)||0).toLocaleString()+" MAD"}</TD>
              <TD style={{fontSize:12}}>{m.technicien}</TD>
              <TD>{m.nextDate?<span style={{color:isOverdue?K.r:K.g,fontWeight:600}}>{m.nextDate}{isOverdue?" \u26A0\uFE0F":""}</span>:"\u2014"}</TD>
              <TD><Bt v="ghost" sm onClick={function(){delMaint(m.id);}}>{"🗑"}</Bt></TD>
            </tr>;})}</tbody>
        </table></div>}
      </Cd>
    </div>}

    {/* ── PLAN MAINTENANCE ── */}
    {tab==="planning_maint"&&<div>
      {/* Overdue */}
      {overdue.length>0&&<Cd style={{borderColor:K.r}}>
        <h3 style={{fontSize:15,fontWeight:700,color:K.r,marginBottom:10}}>{"\u26A0\uFE0F Maintenances en retard ("+overdue.length+")"}</h3>
        {overdue.map(function(m){return <div key={m.id} style={{display:"flex",alignItems:"center",gap:12,padding:8,marginBottom:4,background:K.rf,borderRadius:6}}>
          <span style={{fontSize:16}}>{"\u{1F527}"}</span>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:14}}>{getMatName(m.materielId)}</div>
            <div style={{fontSize:12,color:K.m}}>{m.nextType||m.type}{" \u2014 prévu le "+m.nextDate}</div>
          </div>
          <div style={{fontSize:13,fontWeight:700,color:K.r}}>{Math.floor((Date.now()-new Date(m.nextDate).getTime())/864e5)+"j de retard"}</div>
        </div>;})}
      </Cd>}

      {/* Upcoming */}
      <Cd>
        <h3 style={{fontSize:15,fontWeight:700,marginBottom:12}}>{"\u{1F4C5} Prochaines maintenances planifiées"}</h3>
        {upcoming.length===0?<Et icon={"\u{1F4C5}"} text="Aucune maintenance planifiée"/>:
        <div>{upcoming.slice(0,15).map(function(m){
          var daysUntil=Math.floor((new Date(m.nextDate).getTime()-Date.now())/864e5);
          var urgency=daysUntil<=7?"red":daysUntil<=30?"amber":"green";
          return <div key={m.id} style={{display:"flex",alignItems:"center",gap:12,padding:10,marginBottom:6,background:K.ip,borderRadius:8,borderLeft:"4px solid "+(urgency==="red"?K.r:urgency==="amber"?K.a:K.g)}}>
            <div style={{minWidth:90}}>
              <div style={{fontSize:13,fontWeight:700}}>{m.nextDate}</div>
              <div style={{fontSize:11,color:K.m}}>{"dans "+daysUntil+"j"}</div>
            </div>
            <span style={{fontSize:20}}>{"\u{1F527}"}</span>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:14}}>{getMatName(m.materielId)}</div>
              <div style={{fontSize:12,color:K.m}}>{m.nextType||"Révision"}</div>
            </div>
            <Bg c={urgency}>{daysUntil<=7?"Urgent":daysUntil<=30?"Bientôt":"Planifié"}</Bg>
          </div>;
        })}</div>}
      </Cd>

      {/* Maintenance calendar by equipment */}
      <Cd>
        <h3 style={{fontSize:15,fontWeight:700,marginBottom:12}}>{"\u{1F69C} Suivi par Équipement"}</h3>
        {mats.length===0?<Et icon={"\u{1F69C}"} text="Ajoutez du matériel d'abord"/>:
        <div>{mats.map(function(m){
          var matMaints=maint.filter(function(x){return x.materielId===m.id;}).sort(function(a,b){return a.date>b.date?-1:1;});
          var lastM=matMaints[0];
          var nextM=matMaints.find(function(x){return x.nextDate&&x.nextDate>=today;});
          var cat=getCatInfo(m.category);
          var stCol=m.status==="panne"?K.r:m.status==="maintenance"?K.a:K.g;
          return <div key={m.id} style={{padding:12,marginBottom:8,background:K.ip,borderRadius:8,border:"1px solid "+K.b}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
              <span style={{fontSize:22}}>{cat.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:700}}>{m.name}</div>
                <div style={{fontSize:12,color:K.m}}>{cat.label}{m.marque?" \u2014 "+m.marque:""}</div>
              </div>
              <span style={{fontSize:11,fontWeight:700,padding:"3px 8px",borderRadius:4,background:stCol+"22",color:stCol}}>{m.status||"actif"}</span>
            </div>
            <div style={{display:"flex",gap:16,fontSize:12}}>
              <div><span style={{color:K.m}}>Interventions: </span><strong>{matMaints.length}</strong></div>
              <div><span style={{color:K.m}}>Dernière: </span><strong>{lastM?lastM.date+" ("+lastM.type+")":"Aucune"}</strong></div>
              <div><span style={{color:K.m}}>Prochaine: </span><strong style={{color:nextM?K.g:K.m}}>{nextM?nextM.nextDate+" ("+nextM.nextType+")":"Non planifiée"}</strong></div>
            </div>
          </div>;
        })}</div>}
      </Cd>
    </div>}

    {/* ── MODAL: Add Matériel ── */}
    {modal==="addMat"&&<Ml onClose={function(){setModal(null);}}>
      <h3 style={{fontSize:18,fontWeight:700,marginBottom:20}}>{"Ajouter un Équipement"}</h3>
      <Fl label="Catégorie">
        <Sl value={form.category} onChange={function(e){setForm(Object.assign({},form,{category:e.target.value,name:""}));}}>
          {EQUIP_CAT.map(function(c){return <option key={c.id} value={c.id}>{c.icon+" "+c.label}</option>;})}
        </Sl>
      </Fl>
      <Fl label="Matériel">
        <Sl value={form.name} onChange={function(e){setForm(Object.assign({},form,{name:e.target.value}));}}>
          <option value="">{"-- Sélectionner --"}</option>
          {(EQUIP_CAT.find(function(c){return c.id===form.category;})||{items:[]}).items.map(function(item){return <option key={item} value={item}>{item}</option>;})}
          <option value="__custom">{"Autre (saisie libre)"}</option>
        </Sl>
      </Fl>
      {form.name==="__custom"&&<Fl label="Nom personnalisé"><Ip value={form.customName||""} onChange={function(e){setForm(Object.assign({},form,{customName:e.target.value}));}}/></Fl>}
      <R2>
        <Fl label="Quantité"><Ip type="number" value={form.quantity} onChange={function(e){setForm(Object.assign({},form,{quantity:parseInt(e.target.value)||1}));}}/></Fl>
        <Fl label="Marque / Modèle"><Ip value={form.marque} onChange={function(e){setForm(Object.assign({},form,{marque:e.target.value}));}} placeholder="ex: John Deere"/></Fl>
      </R2>
      <R2>
        <Fl label="Année"><Ip value={form.annee} onChange={function(e){setForm(Object.assign({},form,{annee:e.target.value}));}} placeholder="2020"/></Fl>
        <Fl label="Affecté à l'activité">
          <Sl value={form.activity} onChange={function(e){setForm(Object.assign({},form,{activity:e.target.value}));}}>
            {ACTIVITIES_ASSIGN.map(function(a){return <option key={a} value={a}>{a}</option>;})}
          </Sl>
        </Fl>
      </R2>
      <Fl label="Notes"><Ta value={form.notes||""} onChange={function(e){setForm(Object.assign({},form,{notes:e.target.value}));}}/></Fl>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
        <Bt v="secondary" onClick={function(){setModal(null);}}>Annuler</Bt>
        <Bt onClick={function(){
          var finalName=form.name==="__custom"?(form.customName||"Équipement"):form.name;
          if(!finalName)return;
          var toSave=Object.assign({},form,{name:finalName});
          delete toSave.customName;
          save(Object.assign({},farm,{materiels:mats.concat([Object.assign({},toSave,{id:Date.now()+"",status:"actif"})])}));
          setModal(null);
        }}>Enregistrer</Bt>
      </div>
    </Ml>}

    {/* ── MODAL: Add Maintenance ── */}
    {modal==="addMaint"&&<Ml onClose={function(){setModal(null);}}>
      <h3 style={{fontSize:18,fontWeight:700,marginBottom:20}}>{"Enregistrer une Maintenance"}</h3>
      <Fl label="Matériel">
        <Sl value={form.materielId} onChange={function(e){setForm(Object.assign({},form,{materielId:e.target.value}));}}>
          {mats.map(function(m){var cat=getCatInfo(m.category);return <option key={m.id} value={m.id}>{cat.icon+" "+m.name}</option>;})}
        </Sl>
      </Fl>
      <R2>
        <Fl label="Date intervention"><Ip type="date" value={form.date} onChange={function(e){setForm(Object.assign({},form,{date:e.target.value}));}}/></Fl>
        <Fl label="Type"><Sl value={form.type} onChange={function(e){setForm(Object.assign({},form,{type:e.target.value}));}}>{MAINT_TYPES.map(function(t){return <option key={t} value={t}>{t}</option>;})}</Sl></Fl>
      </R2>
      <Fl label="Description"><Ta value={form.description} onChange={function(e){setForm(Object.assign({},form,{description:e.target.value}));}}/></Fl>
      <R2>
        <Fl label="Coût (MAD)"><Ip type="number" value={form.cost} onChange={function(e){setForm(Object.assign({},form,{cost:parseFloat(e.target.value)||0}));}}/></Fl>
        <Fl label="Technicien"><Ip value={form.technicien} onChange={function(e){setForm(Object.assign({},form,{technicien:e.target.value}));}} placeholder="Nom"/></Fl>
      </R2>
      <div style={{padding:12,background:K.gf,borderRadius:8,marginBottom:14,border:"1px solid rgba(74,222,128,.2)"}}>
        <div style={{fontSize:12,fontWeight:700,color:K.g,marginBottom:8}}>{"Planifier la prochaine maintenance"}</div>
        <R2>
          <Fl label="Date prochaine"><Ip type="date" value={form.nextDate} onChange={function(e){setForm(Object.assign({},form,{nextDate:e.target.value}));}}/></Fl>
          <Fl label="Type prévu"><Sl value={form.nextType} onChange={function(e){setForm(Object.assign({},form,{nextType:e.target.value}));}}>{MAINT_TYPES.map(function(t){return <option key={t} value={t}>{t}</option>;})}</Sl></Fl>
        </R2>
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
        <Bt v="secondary" onClick={function(){setModal(null);}}>Annuler</Bt>
        <Bt onClick={saveMaint}>Enregistrer</Bt>
      </div>
    </Ml>}
  </div>;
}

/* ═══ CHATBOT ═══ */
function ChatbotPage({farm}){
  var _ms=useState([{role:"bot",text:"Bonjour! Je suis AgriBot \u{1F33F} votre assistant agricole au Maroc.\n\u0645\u0631\u062D\u0628\u0627! \u0623\u0646\u0627 \u0623\u063A\u0631\u064A-\u0628\u0648\u062A"}]),msgs=_ms[0],setMsgs=_ms[1];
  var _in=useState(""),input=_in[0],setInput=_in[1];
  var _b=useState(false),busy=_b[0],setBusy=_b[1];
  var _l=useState("fr"),lang=_l[0],setLang=_l[1];
  var ref=useRef(null);

  useEffect(function(){if(ref.current)ref.current.scrollTop=ref.current.scrollHeight;},[msgs]);

  function buildSystemPrompt(){
    var ctx="Ferme: "+farm.name+", Localisation: "+(farm.location||"Maroc")+", Surface: "+farm.totalSurface+"ha, Irrigué: "+farm.irrigatedSurface+"ha";
    var anStr="";ANIMALS.forEach(function(a){var n=(farm.animals||{})[a.id]||0;if(n>0)anStr+=a.label+":"+n+" ";});
    if(anStr)ctx+=", Animaux: "+anStr;
    if(lang==="ar") return "\u0623\u0646\u062A \u0623\u063A\u0631\u064A-\u0628\u0648\u062A\u060C \u0645\u0633\u0627\u0639\u062F \u0632\u0631\u0627\u0639\u064A \u062E\u0628\u064A\u0631 \u0645\u062A\u062E\u0635\u0635 \u0641\u064A \u0627\u0644\u0632\u0631\u0627\u0639\u0629 \u0627\u0644\u0645\u063A\u0631\u0628\u064A\u0629. \u0623\u062C\u0628 \u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629. \u0633\u064A\u0627\u0642 \u0627\u0644\u0645\u0632\u0631\u0639\u0629: "+ctx;
    return "Tu es AgriBot, un assistant agricole expert spécialisé dans l'agriculture marocaine. Réponds toujours en français. Donne des conseils pratiques et adaptés au contexte marocain. Réfère aux normes ONSSA quand pertinent. Contexte de la ferme: "+ctx;
  }

  function addBotMsg(text){setMsgs(function(p){return p.concat([{role:"bot",text:text}]);});}

  function send(){
    if(!input.trim()||busy)return;
    var q=input.trim();
    setInput("");
    setMsgs(function(p){return p.concat([{role:"user",text:q}]);});
    setBusy(true);

    var sysPrompt=buildSystemPrompt();
    var body={
      model:"claude-sonnet-4-20250514",
      max_tokens:1000,
      system:sysPrompt,
      messages:[{role:"user",content:q}]
    };

    // Detect environment
    var hostname=window.location.hostname||"";
    // If running inside Claude artifact iframe, hostname is usually empty or a CDN domain
    var isArtifact=!hostname||hostname.indexOf("claude")>=0||hostname.indexOf("anthropic")>=0||hostname.indexOf("cdn")>=0||hostname.indexOf("cloudfront")>=0;

    var apiUrl;
    if(isArtifact){
      // Inside Claude artifact: call Anthropic API directly (auth handled by platform)
      apiUrl="https://api.anthropic.com/v1/messages";
    } else {
      // Netlify or other hosting: call the serverless function directly
      apiUrl="/.netlify/functions/chat";
    }

    fetch(apiUrl,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(body)
    })
    .then(function(response){
      if(!response.ok){
        return response.text().then(function(txt){
          throw new Error("HTTP "+response.status+": "+txt.substring(0,200));
        });
      }
      return response.json();
    })
    .then(function(data){
      if(data.error){
        addBotMsg("\u26A0\uFE0F Erreur API: "+(data.error.message||JSON.stringify(data.error)));
      } else if(data.content&&data.content.length>0){
        var text=data.content.map(function(block){return block.text||"";}).join("\n");
        addBotMsg(text||"\u26A0\uFE0F Réponse vide");
      } else {
        addBotMsg("\u26A0\uFE0F Réponse inattendue du serveur");
      }
      setBusy(false);
    })
    .catch(function(err){
      addBotMsg("\u26A0\uFE0F "+err.message);
      setBusy(false);
    });
  }

  var qk=lang==="fr"?["Calendrier agricole au Maroc","Maladies courantes des oliviers","Alimentation des bovins laitiers","Normes ONSSA pour le miel","Techniques d'irrigation goutte-à-goutte"]:["\u0627\u0644\u062A\u0642\u0648\u064A\u0645 \u0627\u0644\u0632\u0631\u0627\u0639\u064A \u0628\u0627\u0644\u0645\u063A\u0631\u0628","\u0623\u0645\u0631\u0627\u0636 \u0627\u0644\u0632\u064A\u062A\u0648\u0646","\u062A\u063A\u0630\u064A\u0629 \u0627\u0644\u0623\u0628\u0642\u0627\u0631","\u0645\u0639\u0627\u064A\u064A\u0631 \u0623\u0648\u0646\u0633\u0627","\u0627\u0644\u0631\u064A \u0628\u0627\u0644\u062A\u0646\u0642\u064A\u0637"];
  return <div><PT icon={"\u{1F916}"}>AgriBot</PT>
    <div style={{display:"flex",gap:6,marginBottom:10}}><Bt sm v={lang==="fr"?"primary":"secondary"} onClick={function(){setLang("fr");}}>Français</Bt><Bt sm v={lang==="ar"?"primary":"secondary"} onClick={function(){setLang("ar");}}>{"العربية"}</Bt></div>
    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>{qk.map(function(q,i){return <Bt key={i} v="secondary" sm onClick={function(){setInput(q);}}>{q}</Bt>;})}</div>
    <Cd style={{padding:0,overflow:"hidden"}}><div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 280px)",minHeight:400}}>
      <div ref={ref} style={{flex:1,overflowY:"auto",padding:16}}>{msgs.map(function(m,i){return <div key={i} style={{marginBottom:12,display:"flex",gap:10,flexDirection:m.role==="user"?"row-reverse":"row"}}><div style={{width:32,height:32,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,background:m.role==="bot"?K.ip:K.gf,flexShrink:0}}>{m.role==="bot"?"\u{1F33F}":"\u{1F464}"}</div><div style={{maxWidth:"80%",padding:"12px 16px",borderRadius:12,fontSize:14,lineHeight:1.6,whiteSpace:"pre-wrap",background:m.role==="bot"?K.ip:K.gf,border:"1px solid "+(m.role==="bot"?K.b:"rgba(74,222,128,.2)"),fontFamily:lang==="ar"&&m.role==="bot"?"'IBM Plex Sans Arabic'":"inherit",direction:lang==="ar"&&m.role==="bot"?"rtl":"ltr"}}>{m.text}</div></div>;})}
        {busy&&<div style={{display:"flex",gap:10}}><div style={{width:32,height:32,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",background:K.ip}}>{"\u{1F33F}"}</div><div style={{padding:12,borderRadius:12,background:K.ip}}><div style={{width:20,height:20,border:"2px solid "+K.b,borderTopColor:K.g,borderRadius:"50%",animation:"spin .8s linear infinite"}}/></div></div>}</div>
      <div style={{padding:16,borderTop:"1px solid "+K.b,display:"flex",gap:8}}><Ip value={input} onChange={function(e){setInput(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter")send();}} placeholder={lang==="fr"?"Question...":"\u0633\u0624\u0627\u0644..."} style={{direction:lang==="ar"?"rtl":"ltr"}}/><Bt onClick={send} dis={busy}>{"\u{1F4E8}"}</Bt></div>
    </div></Cd></div>;
}
