"use client";
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {backendRequest} from '@/lib/api/backend';
export function ProjectPicker({projectId}:{projectId?:string}){
 const [selected,setSelected]=useState(projectId??'');
 const [projects,setProjects]=useState<{id:string;name:string}[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[opening,setOpening]=useState(false);
 useEffect(()=>{let active=true;void backendRequest<{id:string;name:string}[]>('/api/projects?per_page=100').then(r=>{if(active){setProjects(r.data);setSelected(current=>current||r.data[0]?.id||'');}}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
 return <div className="stack"><form action="/project" method="post" className="project-picker" onSubmit={()=>setOpening(true)}><select className="select" name="projectId" value={selected} onChange={e=>setSelected(e.target.value)} aria-label="Project" required disabled={loading||opening||!projects.length}>{!projects.length?<option value="">{loading?'Loading projects...':'No projects available'}</option>:projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><button className="btn-outline btn-sm" disabled={loading||opening||!projects.length} aria-busy={opening||undefined}>{opening?'Opening...':'Open project'}</button><Link href="/onboarding/developer/project">Add project</Link></form>{error?<p role="status">{error}</p>:null}</div>;
}
