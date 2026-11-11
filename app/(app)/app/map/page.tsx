import { backendRequest } from "@/lib/api/backend";
import { api } from "@/lib/api/client";
import { BucketMap } from "@/components/public/BucketMap";
import { Notice } from "@/components/Notice";
import type { GeoJsonObject } from "geojson";
export default async function ProjectMap(){
  const session=await api.session();
  if(!session.ok||!session.data.projectId)return <Notice title="Choose a project"><p>Sign in to inspect a project boundary.</p></Notice>;
  const id=session.data.projectId;
  const result=await Promise.all([backendRequest<{boundary:GeoJsonObject;synthetic:boolean;areaHectares:number|null;name:string;capturePoints:{point:[number,number];flags:string[];capturedAt:string}[]}>(`/api/projects/${id}/map`),api.geography(id)]).then(data=>({data,error:null})).catch((error:unknown)=>({data:null,error}));
  if(!result.data)return <Notice title="Map unavailable"><p>{result.error instanceof Error?result.error.message:"The project map could not be loaded. Please try again."}</p></Notice>;
  const [context,geography]=result.data;
    return <div className="console-page stack-lg"><header className="stack"><p className="eyebrow">Project geography</p><h1 className="h2-display">{context.data.name}</h1><p className="note">Explore the project boundary and the distribution of enrolled households.</p></header>
    <p className="record-cell">{context.data.areaHectares===null?'Area not available':`${context.data.areaHectares.toLocaleString(undefined,{maximumFractionDigits:2})} hectares · project area`}</p>
    {geography.ok?<BucketMap buckets={geography.data.buckets} resolution={geography.data.resolution} boundary={context.data.boundary} demonstration={context.data.synthetic} capturePoints={context.data.capturePoints}/>:<Notice title="Distribution unavailable"><p>{geography.message}</p></Notice>}</div>;
}
