import { backendRequest } from "@/lib/api/backend";
import { api } from "@/lib/api/client";
import { BucketMap } from "@/components/public/BucketMap";
import { Notice } from "@/components/Notice";
import type { GeoJsonObject } from "geojson";
export default async function ProjectMap(){
  const session=await api.session();
  if(!session.ok||!session.data.projectId)return <Notice title="Choose a project"><p>Sign in to inspect a project boundary.</p></Notice>;
  const id=session.data.projectId;
  try {
    const [context,geography]=await Promise.all([backendRequest<{boundary:GeoJsonObject;synthetic:boolean;areaHectares:number|null;name:string}>(`/api/projects/${id}/map`),api.geography(id)]);
    return <div className="console-page stack-lg"><header className="stack"><p className="eyebrow">Project geography</p><h1 className="h2-display">{context.data.name}</h1><p className="note">Project boundary and aggregate enrolment distribution. Geometry is stored in PostGIS; displayed coordinates use WGS 84.</p></header>
    <p className="record-cell">{context.data.areaHectares===null?'Area not available':`${context.data.areaHectares.toLocaleString(undefined,{maximumFractionDigits:2})} hectares · PostGIS geography area`}</p>
    {geography.ok?<BucketMap buckets={geography.data.buckets} resolution={geography.data.resolution} boundary={context.data.boundary} demonstration={context.data.synthetic}/>:<Notice title="Distribution unavailable"><p>{geography.message}</p></Notice>}</div>;
  } catch(error){return <Notice title="Map unavailable"><p>{error instanceof Error?error.message:'Project geography could not be loaded.'}</p></Notice>;}
}
