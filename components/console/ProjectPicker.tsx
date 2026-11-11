"use client";
import {useEffect,useState} from 'react';
import {backendRequest} from '@/lib/api/backend';
export function ProjectPicker(){const [projects,setProjects]=useState<{id:string;name:string}[]>([]);useEffect(()=>{void backendRequest<{id:string;name:string}[]>('/api/projects?per_page=100').then(r=>setProjects(r.data)).catch(()=>{});},[]);return <form action="/project" method="post" className="row"><select className="select" name="projectId" aria-label="Project" required>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><button className="btn-outline btn-sm">Open project</button><a href="/onboarding/developer/project">Add project</a></form>;}
