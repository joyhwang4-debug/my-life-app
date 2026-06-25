import { useState, useEffect, useRef } from "react";

// ── CONSTANTS ──────────────────────────────────────────────
const DAYS = ["월","화","수","목","금","토","일"];
const TODAY_IDX = new Date().getDay()===0?6:new Date().getDay()-1;
const C = {
  bg:"#FAFAF8", white:"#FFFFFF", dark:"#2B2A28",
  gold:"#C9A96E", goldLight:"#FFF4E0",
  border:"#F0EEE9", borderInput:"#EAE7E0",
  muted:"#A8A39A", light:"#C4C0B8", inputBg:"#FBFAF8", tabBg:"#F3F1ED",
};
const WISH_EMOJI = {watch:"🎬",go:"✈️",buy:"🛍",do:"✨"};

// ── STORAGE ────────────────────────────────────────────────
async function loadKey(key, def) {
  try { const r=await window.storage.get(key); return r?JSON.parse(r.value):def; } catch { return def; }
}
async function saveKey(key, val) {
  try { await window.storage.set(key, JSON.stringify(val)); } catch(e) { console.error(e); }
}

// ── WEEK UTILS ─────────────────────────────────────────────
function getMonday(offset=0) {
  const now=new Date(), d=now.getDay()===0?6:now.getDay()-1, m=new Date(now);
  m.setDate(now.getDate()-d+offset*7); m.setHours(0,0,0,0);
  return m.toISOString().split("T")[0];
}
function getWeekDates(offset=0) {
  const m=new Date(getMonday(offset));
  return Array.from({length:7},(_,i)=>{const d=new Date(m);d.setDate(m.getDate()+i);return `${d.getMonth()+1}/${d.getDate()}`;});
}
function weekLabel(key) {
  if(key===getMonday(0))return"이번 주";
  if(key===getMonday(-1))return"지난 주";
  return key;
}
function todayStr() { return new Date().toISOString().split("T")[0].replace(/-/g,"."); }

// ── SHARED COMPONENTS ──────────────────────────────────────
function PageHeader({sub,title,right,note}){
  return(
    <div style={{padding:"28px 24px 12px"}}>
      <div style={{fontSize:12,letterSpacing:"0.08em",color:C.light,textTransform:"uppercase",marginBottom:3}}>{sub}</div>
      <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between"}}>
        <h1 style={{fontSize:24,fontWeight:600,color:C.dark,margin:0,letterSpacing:"-0.01em"}}>{title}</h1>
        {right&&<span style={{fontSize:13,color:C.muted}}>{right}</span>}
      </div>
      {note&&<p style={{margin:"6px 0 0",fontSize:12,color:C.light,lineHeight:1.5}}>{note}</p>}
    </div>
  );
}

function SegTabs({options,value,onChange}){
  return(
    <div style={{display:"flex",background:C.tabBg,borderRadius:10,padding:3}}>
      {options.map(o=>(
        <button key={o.key} onClick={()=>onChange(o.key)} style={{
          flex:1,border:"none",borderRadius:8,padding:"8px 0",fontSize:13,
          fontWeight:value===o.key?600:400,color:value===o.key?C.dark:C.muted,
          background:value===o.key?C.white:"transparent",cursor:"pointer",fontFamily:"inherit",
          boxShadow:value===o.key?"0 1px 4px rgba(0,0,0,0.08)":"none",transition:"all 0.2s",
        }}>{o.label}</button>
      ))}
    </div>
  );
}

function ProgressBar({value,max,gold}){
  const pct=max?Math.min(value/max*100,100):0;
  return(
    <div style={{height:3,background:C.border,borderRadius:2,overflow:"hidden"}}>
      <div style={{height:"100%",width:`${pct}%`,background:gold?C.gold:"#D6D2C8",transition:"width 0.3s"}}/>
    </div>
  );
}

function Checkbox({checked,onChange}){
  return(
    <button onClick={onChange} style={{width:20,height:20,flexShrink:0,borderRadius:"50%",border:checked?"none":"1.5px solid #D6D2C8",background:checked?C.gold:"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",padding:0}}>
      {checked&&<svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M3 8.5L6.2 12L13 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
    </button>
  );
}

function Stars({value,onChange}){
  const [hov,setHov]=useState(0);
  return(
    <div style={{display:"flex",gap:3}}>
      {[1,2,3,4,5].map(s=>(
        <span key={s} onClick={()=>onChange&&onChange(s)} onMouseEnter={()=>onChange&&setHov(s)} onMouseLeave={()=>onChange&&setHov(0)}
          style={{fontSize:15,cursor:onChange?"pointer":"default",color:s<=(hov||value)?C.gold:"#E3E0D9",transition:"color 0.1s"}}>★</span>
      ))}
    </div>
  );
}

function ModalSheet({onClose,children}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.25)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200}} onClick={onClose}>
      <div style={{width:"100%",maxWidth:420,background:C.white,borderRadius:"16px 16px 0 0",padding:"24px 20px 36px",maxHeight:"92vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function TagRow({options,value,onChange,small}){
  return(
    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
      {options.map(o=>(
        <button key={o.key} onClick={()=>onChange(o.key)} style={{
          border:value===o.key?"none":`1px solid ${C.borderInput}`,
          borderRadius:16,padding:small?"4px 10px":"5px 13px",fontSize:small?12:13,
          color:value===o.key?"#fff":C.muted,
          background:value===o.key?C.gold:"transparent",
          cursor:"pointer",fontFamily:"inherit",
        }}>{o.label}</button>
      ))}
    </div>
  );
}

// ── PAGE 1: DAILY TODO ─────────────────────────────────────
function DailyTodo({data,onChange}){
  const [input,setInput]=useState("");
  const [editId,setEditId]=useState(null);
  const [editText,setEditText]=useState("");
  const today=new Date().toLocaleDateString("ko-KR");
  const items=data.filter(t=>t.date===today||!t.done);
  const sorted=[...items].sort((a,b)=>{if(a.done!==b.done)return a.done?1:-1;if(a.important!==b.important)return a.important?-1:1;return 0;});
  const doneCount=items.filter(t=>t.done).length;

  function add(){if(!input.trim())return;onChange([...data,{id:Date.now(),text:input.trim(),done:false,important:false,date:today}]);setInput("");}
  function toggle(id){onChange(data.map(t=>t.id===id?{...t,done:!t.done}:t));}
  function toggleImp(id){onChange(data.map(t=>t.id===id?{...t,important:!t.important}:t));}
  function del(id){onChange(data.filter(t=>t.id!==id));}
  function commitEdit(){if(editText.trim())onChange(data.map(t=>t.id===editId?{...t,text:editText.trim()}:t));setEditId(null);}

  return(
    <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
      <PageHeader sub="데일리 투두" title={new Date().toLocaleDateString("ko-KR",{month:"long",day:"numeric",weekday:"short"})} right={`${doneCount}/${items.length} 완료`}/>
      <div style={{padding:"0 24px 10px"}}><ProgressBar value={doneCount} max={items.length} gold/></div>
      <div style={{flex:1,padding:"4px 16px",overflowY:"auto"}}>
        {sorted.length===0&&<div style={{textAlign:"center",color:C.light,fontSize:14,marginTop:60}}>오늘 할 일이 없어요.<br/>아래에 추가해보세요.</div>}
        {sorted.map(task=>(
          <div key={task.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 8px",borderBottom:`1px solid ${C.border}`,opacity:task.done?0.45:1,transition:"opacity 0.25s"}}>
            <Checkbox checked={task.done} onChange={()=>toggle(task.id)}/>
            <div style={{flex:1,cursor:task.done?"default":"text"}} onClick={()=>!task.done&&(setEditId(task.id),setEditText(task.text))}>
              {editId===task.id
                ?<input autoFocus value={editText} onChange={e=>setEditText(e.target.value)} onBlur={commitEdit} onKeyDown={e=>{if(e.key==="Enter")commitEdit();if(e.key==="Escape")setEditId(null);}} style={{width:"100%",border:"none",outline:"none",fontSize:15,fontFamily:"inherit",color:C.dark,background:"transparent"}}/>
                :<span style={{fontSize:15,color:C.dark,textDecoration:task.done?"line-through":"none"}}>{task.text}</span>
              }
            </div>
            <button onClick={()=>toggleImp(task.id)} style={{border:"none",background:"transparent",cursor:"pointer",padding:4,fontSize:16,color:task.important?C.gold:"#E3E0D9"}}>★</button>
            <button onClick={()=>del(task.id)} style={{border:"none",background:"transparent",cursor:"pointer",padding:4,fontSize:14,color:"#D8D4CB"}}>✕</button>
          </div>
        ))}
      </div>
      <div style={{padding:"10px 16px 16px",borderTop:`1px solid ${C.border}`,background:C.white}}>
        <div style={{display:"flex",gap:8}}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="할 일을 입력하세요" style={{flex:1,border:`1px solid ${C.borderInput}`,borderRadius:10,padding:"11px 14px",fontSize:15,outline:"none",fontFamily:"inherit",color:C.dark,background:C.inputBg}}/>
          <button onClick={add} style={{border:"none",borderRadius:10,padding:"0 18px",background:C.dark,color:"#fff",fontSize:14,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>추가</button>
        </div>
      </div>
    </div>
  );
}

// ── PAGE 2: LONGTERM TODO ──────────────────────────────────
function LongtermTodo({data,onChange}){
  const [input,setInput]=useState("");
  const [tab,setTab]=useState("year");
  const [openMemo,setOpenMemo]=useState(null);
  const [memoText,setMemoText]=useState("");
  const items=data[tab]||[];
  const done=items.filter(t=>t.done).length;

  function add(){if(!input.trim())return;onChange({...data,[tab]:[...items,{id:Date.now(),text:input.trim(),done:false,memo:""}]});setInput("");}
  function toggle(id){onChange({...data,[tab]:items.map(t=>t.id===id?{...t,done:!t.done}:t)});}
  function del(id){onChange({...data,[tab]:items.filter(t=>t.id!==id)});}
  function saveMemo(id){onChange({...data,[tab]:items.map(t=>t.id===id?{...t,memo:memoText}:t)});setOpenMemo(null);}

  return(
    <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
      <PageHeader sub="장기 목표" title="내가 꼭 할 것들" right={`${done}/${items.length} 달성`}/>
      <div style={{padding:"0 24px 6px"}}><SegTabs options={[{key:"year",label:"올해 안에"},{key:"life",label:"죽기 전에"}]} value={tab} onChange={setTab}/></div>
      <div style={{padding:"8px 24px 10px"}}><ProgressBar value={done} max={items.length} gold/></div>
      <div style={{flex:1,padding:"4px 16px",overflowY:"auto"}}>
        {items.length===0&&<div style={{textAlign:"center",color:C.light,fontSize:14,marginTop:60}}>아직 목표가 없어요.</div>}
        {items.map(task=>(
          <div key={task.id} style={{borderBottom:`1px solid ${C.border}`,opacity:task.done?0.5:1}}>
            <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 8px"}}>
              <Checkbox checked={task.done} onChange={()=>toggle(task.id)}/>
              <span style={{flex:1,fontSize:15,color:C.dark,textDecoration:task.done?"line-through":"none"}}>{task.text}</span>
              <button onClick={()=>{setOpenMemo(openMemo===task.id?null:task.id);setMemoText(task.memo||"");}} style={{border:"none",background:"transparent",cursor:"pointer",padding:4,fontSize:13,color:task.memo?C.gold:"#D8D4CB"}}>▼</button>
              <button onClick={()=>del(task.id)} style={{border:"none",background:"transparent",cursor:"pointer",padding:4,fontSize:14,color:"#D8D4CB"}}>✕</button>
            </div>
            {openMemo===task.id&&(
              <div style={{padding:"0 8px 12px 40px"}}>
                <div style={{display:"flex",gap:6}}>
                  <input autoFocus value={memoText} onChange={e=>setMemoText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveMemo(task.id)} placeholder="진행 상황 메모..." style={{flex:1,border:`1px solid ${C.borderInput}`,borderRadius:8,padding:"8px 12px",fontSize:13,outline:"none",fontFamily:"inherit",color:C.dark,background:C.inputBg}}/>
                  <button onClick={()=>saveMemo(task.id)} style={{border:"none",borderRadius:8,padding:"0 12px",background:C.dark,color:"#fff",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>저장</button>
                </div>
                {task.memo&&<p style={{margin:"6px 0 0",fontSize:12,color:C.muted}}>{task.memo}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{padding:"10px 16px 16px",borderTop:`1px solid ${C.border}`,background:C.white}}>
        <div style={{display:"flex",gap:8}}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} placeholder={tab==="year"?"올해 안에 꼭 할 것...":"죽기 전에 꼭 할 것..."} style={{flex:1,border:`1px solid ${C.borderInput}`,borderRadius:10,padding:"11px 14px",fontSize:15,outline:"none",fontFamily:"inherit",color:C.dark,background:C.inputBg}}/>
          <button onClick={add} style={{border:"none",borderRadius:10,padding:"0 18px",background:C.dark,color:"#fff",fontSize:14,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>추가</button>
        </div>
      </div>
    </div>
  );
}

// ── PAGE 3: WISHLIST ───────────────────────────────────────
const WISH_CATS=[{key:"all",label:"전체"},{key:"watch",label:"🎬 보고 싶은"},{key:"go",label:"✈️ 가고 싶은"},{key:"buy",label:"🛍 사고 싶은"},{key:"do",label:"✨ 하고 싶은"}];

function Wishlist({data,onChange}){
  const [input,setInput]=useState("");
  const [tab,setTab]=useState("all");
  const [inputCat,setInputCat]=useState("do");
  const [toast,setToast]=useState(false);
  const filtered=tab==="all"?data:data.filter(i=>i.category===tab);
  const active=filtered.filter(i=>!i.done), done=filtered.filter(i=>i.done);

  function add(){if(!input.trim())return;onChange([{id:Date.now(),text:input.trim(),category:inputCat,done:false},...data]);setInput("");}
  function toggleDone(id){
    const item=data.find(i=>i.id===id);
    if(!item.done){setToast(true);setTimeout(()=>setToast(false),2500);}
    onChange(data.map(i=>i.id===id?{...i,done:!i.done}:i));
  }
  function del(id){onChange(data.filter(i=>i.id!==id));}

  return(
    <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
      <PageHeader sub="위시리스트" title="하고 싶은 것들" right={`${data.filter(i=>i.done).length}/${data.length} 달성`}/>
      <div style={{padding:"0 24px 12px",overflowX:"auto",display:"flex",gap:8,scrollbarWidth:"none"}}>
        {WISH_CATS.map(c=><button key={c.key} onClick={()=>setTab(c.key)} style={{flexShrink:0,border:tab===c.key?"none":`1px solid ${C.borderInput}`,borderRadius:20,padding:"5px 13px",fontSize:12,fontWeight:tab===c.key?600:400,color:tab===c.key?"#fff":"#7A756C",background:tab===c.key?C.dark:"transparent",cursor:"pointer",fontFamily:"inherit"}}>{c.label}</button>)}
      </div>
      <div style={{flex:1,padding:"4px 16px",overflowY:"auto"}}>
        {toast&&<div style={{background:C.gold,color:"#fff",borderRadius:10,padding:"10px 16px",fontSize:13,marginBottom:12}}>🎉 달성! 기록하기에 후기를 남겨보세요</div>}
        {active.map(item=>(
          <div key={item.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 8px",borderBottom:`1px solid ${C.border}`}}>
            <Checkbox checked={false} onChange={()=>toggleDone(item.id)}/>
            <span style={{fontSize:14}}>{WISH_EMOJI[item.category]}</span>
            <span style={{flex:1,fontSize:15,color:C.dark}}>{item.text}</span>
            <button onClick={()=>del(item.id)} style={{border:"none",background:"transparent",cursor:"pointer",padding:4,fontSize:14,color:"#D8D4CB"}}>✕</button>
          </div>
        ))}
        {done.length>0&&<>
          <div style={{display:"flex",alignItems:"center",gap:8,margin:"14px 0 8px"}}>
            <div style={{flex:1,height:1,background:C.border}}/><span style={{fontSize:12,color:C.light}}>달성 {done.length}개</span><div style={{flex:1,height:1,background:C.border}}/>
          </div>
          {done.map(item=>(
            <div key={item.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 8px",borderBottom:`1px solid ${C.border}`,opacity:0.45}}>
              <Checkbox checked={true} onChange={()=>toggleDone(item.id)}/>
              <span style={{fontSize:14}}>{WISH_EMOJI[item.category]}</span>
              <span style={{flex:1,fontSize:15,color:C.dark,textDecoration:"line-through"}}>{item.text}</span>
              <button onClick={()=>del(item.id)} style={{border:"none",background:"transparent",cursor:"pointer",padding:4,fontSize:14,color:"#D8D4CB"}}>✕</button>
            </div>
          ))}
        </>}
      </div>
      <div style={{padding:"10px 16px 16px",borderTop:`1px solid ${C.border}`,background:C.white}}>
        <div style={{display:"flex",gap:6,marginBottom:8,overflowX:"auto",scrollbarWidth:"none"}}>
          {WISH_CATS.filter(c=>c.key!=="all").map(c=><button key={c.key} onClick={()=>setInputCat(c.key)} style={{flexShrink:0,border:inputCat===c.key?"none":`1px solid ${C.borderInput}`,borderRadius:16,padding:"3px 10px",fontSize:12,color:inputCat===c.key?"#fff":C.muted,background:inputCat===c.key?C.gold:"transparent",cursor:"pointer",fontFamily:"inherit"}}>{c.label}</button>)}
        </div>
        <div style={{display:"flex",gap:8}}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="원하는 걸 적어요" style={{flex:1,border:`1px solid ${C.borderInput}`,borderRadius:10,padding:"11px 14px",fontSize:15,outline:"none",fontFamily:"inherit",color:C.dark,background:C.inputBg}}/>
          <button onClick={add} style={{border:"none",borderRadius:10,padding:"0 18px",background:C.dark,color:"#fff",fontSize:14,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>추가</button>
        </div>
      </div>
    </div>
  );
}

// ── PAGE 4: RECORDS ────────────────────────────────────────
const REC_CATS=[{key:"all",label:"전체"},{key:"watch",label:"🎬 본 것"},{key:"go",label:"✈️ 다녀온 곳"},{key:"buy",label:"🛍 산 것"},{key:"do",label:"✨ 해본 것"}];

function RecordCard({rec,onDelete}){
  const [exp,setExp]=useState(false);
  return(
    <div style={{borderRadius:12,border:`1px solid ${C.border}`,marginBottom:10,overflow:"hidden"}}>
      <div style={{padding:"14px 16px",cursor:"pointer"}} onClick={()=>setExp(!exp)}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:15}}>{WISH_EMOJI[rec.category]||"📝"}</span>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:500,color:C.dark}}>{rec.text}</div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginTop:4}}>
              <Stars value={rec.rating||0}/>
              <span style={{fontSize:12,color:C.light}}>{rec.date}</span>
            </div>
          </div>
          <span style={{fontSize:12,color:C.light}}>{exp?"▲":"▼"}</span>
        </div>
      </div>
      {exp&&(
        <div style={{padding:"0 16px 14px",borderTop:"1px solid #F8F6F2"}}>
          {rec.photo&&<img src={rec.photo} alt="" style={{width:"100%",borderRadius:10,maxHeight:200,objectFit:"cover",marginTop:12}}/>}
          <p style={{margin:"12px 0 8px",fontSize:14,color:"#5A5650",lineHeight:1.7}}>{rec.review||<span style={{color:C.light}}>감상평이 없어요.</span>}</p>
          <button onClick={()=>onDelete(rec.id)} style={{border:"none",background:"transparent",color:"#D8D4CB",fontSize:12,cursor:"pointer",padding:0,fontFamily:"inherit"}}>삭제</button>
        </div>
      )}
    </div>
  );
}

function Records({data,onChange}){
  const [tab,setTab]=useState("all");
  const [showAdd,setShowAdd]=useState(false);
  const filtered=tab==="all"?data:data.filter(r=>r.category===tab);
  function del(id){onChange(data.filter(r=>r.id!==id));}
  function add(rec){onChange([{id:Date.now(),...rec},...data]);}
  return(
    <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
      <PageHeader sub="기록하기" title="해낸 것들" right={`${data.length}개`}/>
      <div style={{padding:"0 24px 12px",overflowX:"auto",display:"flex",gap:8,scrollbarWidth:"none"}}>
        {REC_CATS.map(c=><button key={c.key} onClick={()=>setTab(c.key)} style={{flexShrink:0,border:tab===c.key?"none":`1px solid ${C.borderInput}`,borderRadius:20,padding:"5px 13px",fontSize:12,fontWeight:tab===c.key?600:400,color:tab===c.key?"#fff":"#7A756C",background:tab===c.key?C.dark:"transparent",cursor:"pointer",fontFamily:"inherit"}}>{c.label}</button>)}
      </div>
      <div style={{flex:1,padding:"4px 16px",overflowY:"auto"}}>
        {filtered.length===0&&<div style={{textAlign:"center",color:C.light,fontSize:14,marginTop:60}}>아직 기록이 없어요.<br/>위시리스트 달성 후 후기를 남겨보세요.</div>}
        {filtered.map(rec=><RecordCard key={rec.id} rec={rec} onDelete={del}/>)}
      </div>
      <div style={{padding:"10px 16px 16px",borderTop:`1px solid ${C.border}`}}>
        <button onClick={()=>setShowAdd(true)} style={{width:"100%",border:`1.5px dashed ${C.light}`,borderRadius:10,padding:"12px 0",background:"transparent",color:C.muted,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>+ 직접 기록 추가하기</button>
      </div>
      {showAdd&&<AddRecordModal onClose={()=>setShowAdd(false)} onSave={add}/>}
    </div>
  );
}

function AddRecordModal({onClose,onSave}){
  const [text,setText]=useState(""); const [cat,setCat]=useState("watch");
  const [rating,setRating]=useState(3); const [review,setReview]=useState("");
  const [photo,setPhoto]=useState(null); const [date,setDate]=useState(new Date().toISOString().split("T")[0]);
  const fileRef=useRef(null);
  function handlePhoto(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setPhoto(ev.target.result);r.readAsDataURL(f);}
  function save(){if(!text.trim())return;onSave({text:text.trim(),category:cat,rating,review,photo,date:date.replace(/-/g,".")});onClose();}
  const CATS=[{key:"watch",label:"🎬 본 것"},{key:"go",label:"✈️ 다녀온 곳"},{key:"buy",label:"🛍 산 것"},{key:"do",label:"✨ 해본 것"}];
  return(
    <ModalSheet onClose={onClose}>
      <div style={{fontSize:16,fontWeight:600,color:C.dark,marginBottom:14}}>기록 추가</div>
      <TagRow options={CATS} value={cat} onChange={setCat} style={{marginBottom:14}}/>
      <div style={{height:10}}/>
      <input autoFocus value={text} onChange={e=>setText(e.target.value)} placeholder="무엇을 했나요?" style={{width:"100%",border:`1px solid ${C.borderInput}`,borderRadius:10,padding:"11px 14px",fontSize:15,outline:"none",fontFamily:"inherit",color:C.dark,background:C.inputBg,boxSizing:"border-box",marginBottom:12}}/>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}><span style={{fontSize:14,color:"#7A756C"}}>별점</span><Stars value={rating} onChange={setRating}/></div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
        <span style={{fontSize:14,color:"#7A756C",flexShrink:0}}>날짜</span>
        <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{flex:1,border:`1px solid ${C.borderInput}`,borderRadius:10,padding:"9px 12px",fontSize:14,outline:"none",fontFamily:"inherit",color:C.dark,background:C.inputBg}}/>
      </div>
      <textarea value={review} onChange={e=>setReview(e.target.value)} placeholder="감상평 (선택)" rows={3} style={{width:"100%",border:`1px solid ${C.borderInput}`,borderRadius:10,padding:"11px 14px",fontSize:14,outline:"none",fontFamily:"inherit",color:C.dark,background:C.inputBg,resize:"none",boxSizing:"border-box",marginBottom:12,lineHeight:1.6}}/>
      <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{display:"none"}}/>
      {photo
        ?<div style={{position:"relative",marginBottom:12}}><img src={photo} alt="" style={{width:"100%",borderRadius:10,maxHeight:160,objectFit:"cover"}}/><button onClick={()=>setPhoto(null)} style={{position:"absolute",top:8,right:8,border:"none",borderRadius:"50%",width:26,height:26,background:"rgba(0,0,0,0.45)",color:"#fff",fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button></div>
        :<button onClick={()=>fileRef.current.click()} style={{width:"100%",border:`1.5px dashed ${C.light}`,borderRadius:10,padding:"10px 0",background:"transparent",color:C.muted,fontSize:13,cursor:"pointer",fontFamily:"inherit",marginBottom:14}}>📷 사진 첨부 (선택)</button>
      }
      <button onClick={save} style={{width:"100%",border:"none",borderRadius:10,padding:"14px 0",background:C.dark,color:"#fff",fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>저장하기</button>
    </ModalSheet>
  );
}

// ── PAGE 5: GRATITUDE ──────────────────────────────────────
function GratitudeCard({entry,onDelete}){
  const [exp,setExp]=useState(false);
  return(
    <div style={{borderRadius:12,border:`1px solid ${C.border}`,marginBottom:10,overflow:"hidden"}}>
      <div style={{padding:"14px 16px",cursor:"pointer",display:"flex",alignItems:"center",gap:12}} onClick={()=>setExp(!exp)}>
        <div style={{flexShrink:0,textAlign:"center",background:"#F9F7F4",borderRadius:10,padding:"6px 10px",minWidth:48}}>
          <div style={{fontSize:11,color:C.light}}>{entry.date.slice(0,7)}</div>
          <div style={{fontSize:18,fontWeight:600,color:C.dark,lineHeight:1.2}}>{entry.date.slice(8)}</div>
        </div>
        <div style={{flex:1}}>
          <p style={{margin:0,fontSize:14,color:exp?C.light:"#5A5650",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{exp?"접기":entry.lines[0]}</p>
          {!exp&&<p style={{margin:"3px 0 0",fontSize:12,color:C.light}}>+{entry.lines.length-1}개 더</p>}
        </div>
        <span style={{fontSize:13,color:C.light}}>{exp?"▲":"▼"}</span>
      </div>
      {exp&&(
        <div style={{padding:"0 16px 14px",borderTop:"1px solid #F8F6F2"}}>
          <ol style={{margin:"12px 0 10px",paddingLeft:20}}>
            {entry.lines.map((l,i)=><li key={i} style={{fontSize:14,color:"#5A5650",lineHeight:1.8}}>{l}</li>)}
          </ol>
          <button onClick={()=>onDelete(entry.id)} style={{border:"none",background:"transparent",color:"#D8D4CB",fontSize:12,cursor:"pointer",padding:0,fontFamily:"inherit"}}>삭제</button>
        </div>
      )}
    </div>
  );
}

function Gratitude({data,onChange}){
  const [showAdd,setShowAdd]=useState(false);
  const total=data.reduce((s,e)=>s+e.lines.length,0);
  return(
    <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
      <PageHeader sub="감사일기" title="감사한 것들" right={`총 ${total}개`} note="매일 안 써도 괜찮아요."/>
      <div style={{flex:1,padding:"4px 16px",overflowY:"auto"}}>
        {data.length===0&&<div style={{textAlign:"center",color:C.light,fontSize:14,marginTop:60}}>아직 기록이 없어요.<br/>오늘 감사한 일 세 가지를 적어보세요.</div>}
        {data.map(e=><GratitudeCard key={e.id} entry={e} onDelete={id=>onChange(data.filter(x=>x.id!==id))}/>)}
      </div>
      <div style={{padding:"10px 16px 16px",borderTop:`1px solid ${C.border}`}}>
        <button onClick={()=>setShowAdd(true)} style={{width:"100%",border:"none",borderRadius:10,padding:"13px 0",background:C.dark,color:"#fff",fontSize:15,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>✏️ 오늘 감사일기 쓰기</button>
      </div>
      {showAdd&&<AddGratitudeModal onClose={()=>setShowAdd(false)} onSave={e=>onChange([{id:Date.now(),...e},...data])}/>}
    </div>
  );
}

function AddGratitudeModal({onClose,onSave}){
  const [date,setDate]=useState(new Date().toISOString().split("T")[0]);
  const [lines,setLines]=useState(["","",""]);
  function save(){const f=lines.map(l=>l.trim()).filter(Boolean);if(!f.length)return;onSave({date:date.replace(/-/g,"."),lines:f});onClose();}
  return(
    <ModalSheet onClose={onClose}>
      <div style={{fontSize:16,fontWeight:600,color:C.dark,marginBottom:6}}>오늘의 감사일기</div>
      <p style={{margin:"0 0 16px",fontSize:13,color:C.light}}>작은 것도 괜찮아요. 떠오르는 대로 적어보세요.</p>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <span style={{fontSize:14,color:"#7A756C",flexShrink:0}}>날짜</span>
        <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{flex:1,border:`1px solid ${C.borderInput}`,borderRadius:10,padding:"9px 12px",fontSize:14,outline:"none",fontFamily:"inherit",color:C.dark,background:C.inputBg}}/>
      </div>
      {lines.map((l,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
          <span style={{width:22,height:22,flexShrink:0,borderRadius:"50%",background:"#F3F1ED",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:C.muted,fontWeight:600}}>{i+1}</span>
          <input autoFocus={i===0} value={l} onChange={e=>setLines(lines.map((x,j)=>j===i?e.target.value:x))} onKeyDown={e=>e.key==="Enter"&&save()}
            placeholder={i===0?"오늘 감사한 일 하나...":i===1?"또 하나...":"마지막으로..."} style={{flex:1,border:`1px solid ${C.borderInput}`,borderRadius:10,padding:"10px 14px",fontSize:14,outline:"none",fontFamily:"inherit",color:C.dark,background:C.inputBg}}/>
        </div>
      ))}
      <button onClick={save} style={{width:"100%",border:"none",borderRadius:10,padding:"14px 0",marginTop:8,background:C.dark,color:"#fff",fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>저장하기</button>
    </ModalSheet>
  );
}

// ── PAGE 6: MEMORY ─────────────────────────────────────────
function MemoryCard({item,onDelete}){
  const [exp,setExp]=useState(false);
  return(
    <div style={{borderRadius:12,border:`1px solid ${C.border}`,marginBottom:10,overflow:"hidden"}}>
      <div style={{padding:"14px 16px",cursor:"pointer"}} onClick={()=>setExp(!exp)}>
        <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
          <div style={{flex:1,minWidth:0}}>
            {item.photo&&<img src={item.photo} alt="" style={{width:"100%",borderRadius:8,maxHeight:140,objectFit:"cover",marginBottom:10}}/>}
            <p style={{margin:0,fontSize:14,color:C.dark,lineHeight:1.65,display:"-webkit-box",WebkitLineClamp:exp?"unset":2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{item.content}</p>
            {item.source&&<p style={{margin:"5px 0 0",fontSize:12,color:C.light}}>{item.source}</p>}
          </div>
          <span style={{fontSize:12,color:"#D8D4CB",flexShrink:0}}>{exp?"▲":"▼"}</span>
        </div>
      </div>
      {exp&&(
        <div style={{padding:"0 16px 12px",borderTop:"1px solid #F8F6F2",display:"flex",gap:14,marginTop:2}}>
          {item.link&&<a href={item.link} target="_blank" rel="noopener noreferrer" style={{fontSize:13,color:C.gold,textDecoration:"none",marginTop:10}}>🔗 링크 열기</a>}
          <button onClick={()=>onDelete(item.id)} style={{border:"none",background:"transparent",color:"#D8D4CB",fontSize:12,cursor:"pointer",padding:0,fontFamily:"inherit",marginTop:10}}>삭제</button>
        </div>
      )}
    </div>
  );
}

function Memory({data,onChange}){
  const [tab,setTab]=useState("soul");
  const [showAdd,setShowAdd]=useState(false);
  const items=data[tab]||[];
  const total=(data.soul||[]).length+(data.info||[]).length;
  function del(id){onChange({soul:(data.soul||[]).filter(i=>i.id!==id),info:(data.info||[]).filter(i=>i.id!==id)});}
  function add(item){const {category,...rest}=item;onChange({...data,[category]:[{id:Date.now(),...rest},...(data[category]||[])]});}
  return(
    <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
      <PageHeader sub="기억하기" title="잊기 싫은 것들" right={`${total}개`}/>
      <div style={{padding:"0 24px 14px"}}><SegTabs options={[{key:"soul",label:"🌿 마음에 새길 것"},{key:"info",label:"💡 유용한 정보"}]} value={tab} onChange={setTab}/></div>
      <div style={{flex:1,padding:"4px 16px",overflowY:"auto"}}>
        {items.length===0&&<div style={{textAlign:"center",color:C.light,fontSize:14,marginTop:60}}>아직 저장된 것이 없어요.</div>}
        {items.map(item=><MemoryCard key={item.id} item={item} onDelete={del}/>)}
      </div>
      <div style={{padding:"10px 16px 16px",borderTop:`1px solid ${C.border}`}}>
        <button onClick={()=>setShowAdd(true)} style={{width:"100%",border:"none",borderRadius:10,padding:"13px 0",background:C.dark,color:"#fff",fontSize:15,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>+ 기억하기 추가</button>
      </div>
      {showAdd&&<AddMemoryModal onClose={()=>setShowAdd(false)} onSave={add} defaultTab={tab}/>}
    </div>
  );
}

function AddMemoryModal({onClose,onSave,defaultTab}){
  const [cat,setCat]=useState(defaultTab||"soul");
  const [content,setContent]=useState(""); const [source,setSource]=useState(""); const [link,setLink]=useState("");
  const [photo,setPhoto]=useState(null); const fileRef=useRef(null);
  function handlePhoto(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setPhoto(ev.target.result);r.readAsDataURL(f);}
  function save(){if(!content.trim()&&!photo)return;onSave({category:cat,content:content.trim(),source:source.trim(),link:link.trim(),photo});onClose();}
  return(
    <ModalSheet onClose={onClose}>
      <div style={{fontSize:16,fontWeight:600,color:C.dark,marginBottom:14}}>기억하기 추가</div>
      <div style={{marginBottom:14}}><SegTabs options={[{key:"soul",label:"🌿 마음에 새길 것"},{key:"info",label:"💡 유용한 정보"}]} value={cat} onChange={setCat}/></div>
      <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{display:"none"}}/>
      {photo
        ?<div style={{position:"relative",marginBottom:12}}><img src={photo} alt="" style={{width:"100%",borderRadius:10,maxHeight:160,objectFit:"cover"}}/><button onClick={()=>setPhoto(null)} style={{position:"absolute",top:8,right:8,border:"none",borderRadius:"50%",width:26,height:26,background:"rgba(0,0,0,0.45)",color:"#fff",fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button></div>
        :<button onClick={()=>fileRef.current.click()} style={{width:"100%",border:`1.5px dashed ${C.light}`,borderRadius:10,padding:"10px 0",background:"transparent",color:C.muted,fontSize:13,cursor:"pointer",fontFamily:"inherit",marginBottom:12}}>📷 이미지/스크린샷 첨부 (선택)</button>
      }
      <textarea autoFocus value={content} onChange={e=>setContent(e.target.value)} placeholder="기억하고 싶은 내용을 적어요" rows={4} style={{width:"100%",border:`1px solid ${C.borderInput}`,borderRadius:10,padding:"11px 14px",fontSize:14,outline:"none",fontFamily:"inherit",color:C.dark,background:C.inputBg,resize:"none",boxSizing:"border-box",marginBottom:10,lineHeight:1.6}}/>
      <input value={source} onChange={e=>setSource(e.target.value)} placeholder="출처 (선택)" style={{width:"100%",border:`1px solid ${C.borderInput}`,borderRadius:10,padding:"10px 14px",fontSize:14,outline:"none",fontFamily:"inherit",color:C.dark,background:C.inputBg,boxSizing:"border-box",marginBottom:10}}/>
      <input value={link} onChange={e=>setLink(e.target.value)} placeholder="링크 URL (선택)" style={{width:"100%",border:`1px solid ${C.borderInput}`,borderRadius:10,padding:"10px 14px",fontSize:14,outline:"none",fontFamily:"inherit",color:C.dark,background:C.inputBg,boxSizing:"border-box",marginBottom:16}}/>
      <button onClick={save} style={{width:"100%",border:"none",borderRadius:10,padding:"14px 0",background:C.dark,color:"#fff",fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>저장하기</button>
    </ModalSheet>
  );
}

// ── PAGE 7: HABIT TRACKER ──────────────────────────────────
function HabitCard({habit,weekKey,dates,isCurrentWeek,onToggle,onDelete,onComment}){
  const checks=habit.history[weekKey]||Array(7).fill(false);
  const comment=habit.comments[weekKey]||"";
  const done=checks.filter(Boolean).length, achieved=done>=habit.targetDays;
  const [editing,setEditing]=useState(false);
  const [draft,setDraft]=useState(comment);
  function save(){onComment(draft);setEditing(false);}
  return(
    <div style={{borderRadius:12,border:`1px solid ${C.border}`,padding:"14px 16px",marginBottom:10}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <div>
          <span style={{fontSize:15,fontWeight:500,color:C.dark}}>{habit.name}</span>
          <span style={{marginLeft:8,fontSize:11,padding:"2px 8px",borderRadius:10,background:achieved?C.goldLight:"#F3F1ED",color:achieved?C.gold:C.muted,fontWeight:achieved?600:400}}>{habit.goal}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:13,color:achieved?C.gold:C.muted,fontWeight:600}}>{done}/{habit.targetDays}{achieved&&" 🎉"}</span>
          {isCurrentWeek&&<button onClick={onDelete} style={{border:"none",background:"transparent",color:"#E0DCD4",fontSize:13,cursor:"pointer",padding:0}}>✕</button>}
        </div>
      </div>
      <div style={{display:"flex",gap:4,marginBottom:10}}>
        {DAYS.map((day,i)=>{
          const isToday=isCurrentWeek&&i===TODAY_IDX;
          return(
            <button key={i} onClick={()=>isCurrentWeek&&onToggle(i)} style={{flex:1,padding:"6px 0",border:"none",borderRadius:8,background:checks[i]?C.gold:isToday?"#F9F7F4":"#F3F1ED",color:checks[i]?"#fff":isToday?C.dark:C.light,fontSize:11,fontWeight:isToday?700:400,cursor:isCurrentWeek?"pointer":"default",fontFamily:"inherit",outline:isToday?`1.5px solid #D6D2C8`:"none",transition:"all 0.15s",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
              <span>{day}</span><span style={{fontSize:9,opacity:0.7}}>{dates[i]}</span>
            </button>
          );
        })}
      </div>
      <ProgressBar value={done} max={habit.targetDays} gold={achieved}/>
      <div style={{marginTop:10}}>
        {editing
          ?<div style={{display:"flex",gap:6}}>
            <input autoFocus value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")save();if(e.key==="Escape")setEditing(false);}} placeholder="이번 주 나를 칭찬해줘요 🌟" style={{flex:1,border:`1px solid ${C.borderInput}`,borderRadius:8,padding:"8px 12px",fontSize:13,outline:"none",fontFamily:"inherit",color:C.dark,background:C.inputBg}}/>
            <button onClick={save} style={{border:"none",borderRadius:8,padding:"0 12px",background:C.dark,color:"#fff",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>저장</button>
          </div>
          :comment
            ?<div onClick={()=>isCurrentWeek&&(setDraft(comment),setEditing(true))} style={{display:"flex",alignItems:"flex-start",gap:6,padding:"8px 10px",borderRadius:8,background:"#FFF9F0",cursor:isCurrentWeek?"text":"default"}}>
              <span style={{fontSize:13}}>🌟</span>
              <p style={{margin:0,fontSize:13,color:"#7A756C",lineHeight:1.5,flex:1}}>{comment}</p>
            </div>
            :isCurrentWeek
              ?<button onClick={()=>{setDraft("");setEditing(true);}} style={{border:"none",background:"transparent",color:C.light,fontSize:12,cursor:"pointer",padding:0,fontFamily:"inherit"}}>+ 칭찬 한마디 남기기</button>
              :null
        }
      </div>
    </div>
  );
}

function HabitTracker({data,onChange}){
  const [weekOffset,setWeekOffset]=useState(0);
  const [showAdd,setShowAdd]=useState(false);
  const currentKey=getMonday(0), viewKey=getMonday(weekOffset), isCurrentWeek=weekOffset===0;
  const dates=getWeekDates(weekOffset);
  function toggleCheck(habitId,dayIdx){if(!isCurrentWeek)return;onChange(data.map(h=>h.id===habitId?{...h,history:{...h.history,[currentKey]:(h.history[currentKey]||Array(7).fill(false)).map((c,i)=>i===dayIdx?!c:c)}}:h));}
  function del(id){onChange(data.filter(h=>h.id!==id));}
  function addHabit(h){onChange([...data,{id:Date.now(),...h}]);}
  function updateComment(habitId,text){onChange(data.map(h=>h.id===habitId?{...h,comments:{...h.comments,[viewKey]:text}}:h));}
  return(
    <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
      <PageHeader sub="습관 트래커" title="나를 위한 기록"/>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 24px 14px"}}>
        <button onClick={()=>setWeekOffset(w=>w-1)} style={{border:"none",background:"transparent",fontSize:20,color:C.light,cursor:"pointer",padding:"4px 8px"}}>‹</button>
        <div style={{textAlign:"center"}}>
          <span style={{fontSize:14,fontWeight:600,color:C.dark}}>{weekLabel(viewKey)}</span>
          {!isCurrentWeek&&<button onClick={()=>setWeekOffset(0)} style={{display:"block",margin:"2px auto 0",border:"none",background:"transparent",fontSize:11,color:C.gold,cursor:"pointer",fontFamily:"inherit"}}>이번 주로 돌아가기</button>}
        </div>
        <button onClick={()=>weekOffset<0&&setWeekOffset(w=>w+1)} style={{border:"none",background:"transparent",fontSize:20,color:weekOffset<0?C.light:"#E8E5DF",cursor:weekOffset<0?"pointer":"default",padding:"4px 8px"}}>›</button>
      </div>
      <div style={{flex:1,padding:"4px 16px",overflowY:"auto"}}>
        {!isCurrentWeek&&<div style={{background:"#F9F7F4",borderRadius:10,padding:"10px 14px",marginBottom:12,fontSize:13,color:C.muted,textAlign:"center"}}>과거 기록은 수정할 수 없어요</div>}
        {data.length===0&&<div style={{textAlign:"center",color:C.light,fontSize:14,marginTop:60}}>아직 습관이 없어요.</div>}
        {data.map(habit=><HabitCard key={habit.id} habit={habit} weekKey={viewKey} dates={dates} isCurrentWeek={isCurrentWeek} onToggle={i=>toggleCheck(habit.id,i)} onDelete={()=>del(habit.id)} onComment={text=>updateComment(habit.id,text)}/>)}
      </div>
      <div style={{padding:"10px 16px 16px",borderTop:`1px solid ${C.border}`}}>
        {isCurrentWeek&&<button onClick={()=>setShowAdd(true)} style={{width:"100%",border:`1.5px dashed ${C.light}`,borderRadius:10,padding:"12px 0",background:"transparent",color:C.muted,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>+ 새 습관 추가</button>}
      </div>
      {showAdd&&<AddHabitModal onClose={()=>setShowAdd(false)} onSave={addHabit}/>}
    </div>
  );
}

function AddHabitModal({onClose,onSave}){
  const [name,setName]=useState(""); const [target,setTarget]=useState(5);
  const label=target===7?"매일":`주 ${target}회`;
  function save(){if(!name.trim())return;onSave({name:name.trim(),goal:label,targetDays:target,history:{[getMonday(0)]:Array(7).fill(false)},comments:{}});onClose();}
  return(
    <ModalSheet onClose={onClose}>
      <div style={{fontSize:16,fontWeight:600,color:C.dark,marginBottom:18}}>습관 추가</div>
      <input autoFocus value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&save()} placeholder="예: 운동 💪, 독서 📖" style={{width:"100%",border:`1px solid ${C.borderInput}`,borderRadius:10,padding:"12px 14px",fontSize:15,outline:"none",fontFamily:"inherit",color:C.dark,background:C.inputBg,boxSizing:"border-box",marginBottom:18}}/>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:14,color:"#7A756C"}}>목표 빈도</span><span style={{fontSize:14,fontWeight:600,color:C.gold}}>{label}</span></div>
      <input type="range" min={1} max={7} value={target} onChange={e=>setTarget(Number(e.target.value))} style={{width:"100%",accentColor:C.gold}}/>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.light,marginTop:4,marginBottom:20}}><span>주 1회</span><span>주 7회(매일)</span></div>
      <button onClick={save} style={{width:"100%",border:"none",borderRadius:10,padding:"14px 0",background:C.dark,color:"#fff",fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>추가하기</button>
    </ModalSheet>
  );
}

// ── BOTTOM NAV ─────────────────────────────────────────────
const NAV=[{id:"daily",label:"오늘",emoji:"📋"},{id:"longterm",label:"장기",emoji:"🎯"},{id:"wishlist",label:"위시",emoji:"⭐"},{id:"records",label:"기록",emoji:"📝"},{id:"gratitude",label:"감사",emoji:"🙏"},{id:"memory",label:"기억",emoji:"💡"},{id:"habits",label:"습관",emoji:"💪"}];

function BottomNav({current,onChange}){
  return(
    <div style={{display:"flex",borderTop:`1px solid ${C.border}`,background:C.white,overflowX:"auto",scrollbarWidth:"none",flexShrink:0}}>
      {NAV.map(n=>(
        <button key={n.id} onClick={()=>onChange(n.id)} style={{flex:"0 0 auto",minWidth:54,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"8px 4px 10px",border:"none",background:"transparent",cursor:"pointer",fontFamily:"inherit",borderTop:`2px solid ${current===n.id?C.gold:"transparent"}`,transition:"border-color 0.15s"}}>
          <span style={{fontSize:18}}>{n.emoji}</span>
          <span style={{fontSize:10,color:current===n.id?C.dark:C.light,fontWeight:current===n.id?600:400,marginTop:2}}>{n.label}</span>
        </button>
      ))}
    </div>
  );
}

// ── MAIN APP ───────────────────────────────────────────────
const DEFAULT={dailyTodos:[],longtermTodos:{year:[],life:[]},wishlist:[],records:[],gratitude:[],memory:{soul:[],info:[]},habits:[]};

export default function App(){
  const [page,setPage]=useState("daily");

  const [loading,setLoading]=useState(true);
  const [d,setD]=useState(DEFAULT);

  useEffect(()=>{(async()=>{const saved=await loadKey("mylife:v1",DEFAULT);setD(saved);setLoading(false);})();},[]);
  useEffect(()=>{if(!loading)saveKey("mylife:v1",d);},[d,loading]);

  function upd(key,val){setD(prev=>({...prev,[key]:val}));}


  if(loading)return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:C.bg,fontFamily:"'Pretendard',-apple-system,sans-serif"}}>
      <div style={{textAlign:"center",color:C.light,fontSize:14}}>불러오는 중...</div>
    </div>
  );

  return(
    <div style={{fontFamily:"'Pretendard',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",background:C.bg,minHeight:"100vh",display:"flex",justifyContent:"center"}}>
      <div style={{width:"100%",maxWidth:420,height:"100vh",background:C.white,display:"flex",flexDirection:"column",boxShadow:"0 0 40px rgba(0,0,0,0.04)",position:"relative",overflow:"hidden"}}>
        
        {/* Page content */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",position:"relative"}}>
          {page==="daily"&&<DailyTodo data={d.dailyTodos} onChange={v=>upd("dailyTodos",v)}/>}
          {page==="longterm"&&<LongtermTodo data={d.longtermTodos} onChange={v=>upd("longtermTodos",v)}/>}
          {page==="wishlist"&&<Wishlist data={d.wishlist} onChange={v=>upd("wishlist",v)}/>}
          {page==="records"&&<Records data={d.records} onChange={v=>upd("records",v)}/>}
          {page==="gratitude"&&<Gratitude data={d.gratitude} onChange={v=>upd("gratitude",v)}/>}
          {page==="memory"&&<Memory data={d.memory} onChange={v=>upd("memory",v)}/>}
          {page==="habits"&&<HabitTracker data={d.habits} onChange={v=>upd("habits",v)}/>}
          
          {/* 나중에 AI 입력 기능 추가 가능 */}
        </div>
        
        <BottomNav current={page} onChange={setPage}/>
      </div>
    </div>
  );
}
