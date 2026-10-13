'use client';

import {useEffect,useRef,useState} from 'react';
import type {KeyboardEvent} from 'react';
import {Check,ChevronsUpDown} from 'lucide-react';

const options=[
  {value:'latest',label:'最新发布'},
  {value:'important',label:'重要优先'},
  {value:'recent-important',label:'近期重要'},
];

export function SortMenu({value,onChange}:{value:string;onChange:(value:string)=>void}){
  const [open,setOpen]=useState(false);
  const root=useRef<HTMLDivElement>(null);
  const current=options.find(option=>option.value===value)??options[0];

  useEffect(()=>{
    if(!open)return;
    const close=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false)};
    document.addEventListener('pointerdown',close);
    return()=>document.removeEventListener('pointerdown',close);
  },[open]);

  function choose(next:string){onChange(next);setOpen(false)}
  function onKeyDown(event:KeyboardEvent){
    if(event.key==='Escape'){setOpen(false);return}
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){
      event.preventDefault();
      const index=options.findIndex(option=>option.value===value);
      const step=event.key==='ArrowDown'?1:-1;
      choose(options[(index+step+options.length)%options.length].value);
    }
  }

  return <div className="sort-menu" ref={root}>
    <button className="sort-trigger" type="button" aria-haspopup="menu" aria-expanded={open} onKeyDown={onKeyDown} onClick={()=>setOpen(next=>!next)}>
      <span>{current.label}</span><ChevronsUpDown aria-hidden="true"/>
    </button>
    {open&&<div className="sort-options" role="menu" aria-label="新闻排序">
      {options.map(option=><button type="button" role="menuitemradio" aria-checked={option.value===value} key={option.value} onClick={()=>choose(option.value)}>
        <span>{option.label}</span>{option.value===value&&<Check aria-hidden="true"/>}
      </button>)}
    </div>}
  </div>
}
