"use client";
import { useEffect, useRef, useState } from "react";
import { cellToBoundary, isValidCell } from "h3-js";
import type { GeographyBucket } from "@/lib/api/contract";
import type { GeoJsonObject } from "geojson";
import type { Map as LeafletMap } from "leaflet";

export function BucketMap({buckets,resolution,boundary,demonstration=false}:{buckets:GeographyBucket[];resolution:number;boundary?:GeoJsonObject;demonstration?:boolean}) {
  const host=useRef<HTMLDivElement>(null),map=useRef<LeafletMap|null>(null);
  const [message,setMessage]=useState('Loading map'),[position,setPosition]=useState('WGS 84 · longitude, latitude');
  const valid=buckets.filter(b=>isValidCell(b.h3)&&b.households>=5);
  useEffect(()=>{
    let disposed=false;let cleanup:(()=>void)|undefined;
    void import('leaflet').then(L=>{
      if(disposed||!host.current)return;
      const css=getComputedStyle(host.current),ink=css.getPropertyValue('--bottle-deep').trim(),paper=css.getPropertyValue('--canvas-paper').trim();
      const instance=L.map(host.current,{scrollWheelZoom:false,keyboard:true}).setView([0.5,31.5],7);map.current=instance;
      const tiles=L.tileLayer(process.env.NEXT_PUBLIC_MAP_TILE_URL||'https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',referrerPolicy:'strict-origin-when-cross-origin'}).addTo(instance);
      tiles.on('tileerror',()=>setMessage('Basemap unavailable. The data layers remain accessible.'));
      const cells=L.featureGroup();
      for(const b of buckets){
        if(!isValidCell(b.h3)||b.households<5)continue;
        const polygon=L.polygon(cellToBoundary(b.h3),{color:ink,weight:1.5,fillColor:ink,fillOpacity:b.households>=100?0.65:b.households>=25?0.4:0.18});
        const popup=document.createElement('div');popup.textContent=`${b.households.toLocaleString()} enrolled households · H3 resolution ${resolution}. Aggregate area, not a household address.`;
        polygon.bindPopup(popup);polygon.bindTooltip(`${b.households.toLocaleString()} households`);cells.addLayer(polygon);
      }
      cells.addTo(instance);
      const overlays:Record<string,import('leaflet').Layer>={'Household distribution':cells};
      if(boundary){const layer=L.geoJSON(boundary,{style:{color:ink,weight:2,fillColor:paper,fillOpacity:0.08,dashArray:'6 4'}}).addTo(instance);overlays['Project boundary']=layer;}
      L.control.layers({'OpenStreetMap':tiles},overlays,{collapsed:false}).addTo(instance);
      L.control.scale({imperial:false}).addTo(instance);
      const extent=L.featureGroup(Object.values(overlays));if(extent.getBounds().isValid())instance.fitBounds(extent.getBounds(),{padding:[24,24],maxZoom:11});
      instance.on('mousemove',event=>setPosition(`${event.latlng.lng.toFixed(5)}, ${event.latlng.lat.toFixed(5)} · WGS 84`));
      const observer=new ResizeObserver(()=>instance.invalidateSize());observer.observe(host.current);
      cleanup=()=>{observer.disconnect();instance.remove();map.current=null;};
      setMessage(cells.getLayers().length?'Select an area to inspect its household count.':'No publishable cells. Areas with fewer than five households are suppressed.');
    }).catch(()=>setMessage('Map could not load. The aggregate table below remains available.'));
    return ()=>{disposed=true;cleanup?.();};
  },[buckets,resolution,boundary]);
  const total=valid.reduce((n,b)=>n+b.households,0);
  return <figure className="stack">
    {demonstration?<p className="notice">Synthetic enrolment demonstration. These are not verified household locations or an authentic registry boundary.</p>:null}
    <div className="row-between"><p className="record-cell">{total.toLocaleString()} households in {valid.length} published areas</p><button className="btn-outline btn-sm" type="button" onClick={()=>{if(!map.current||!valid.length)return;map.current.fitBounds(valid.flatMap(b=>cellToBoundary(b.h3)),{padding:[24,24],maxZoom:11});}}>Fit distribution</button></div>
    <div ref={host} className="gis-map" role="region" aria-label="Interactive enrolment distribution map" />
    <p className="record-cell" aria-live="polite">{message}</p><p className="record-cell">{position}</p>
    <figcaption className="note">H3 resolution {resolution} · darker areas contain more enrolled households: 5–24, 25–99, 100+. No household point is published at any zoom. Boundary outlines, when present, are distinct from aggregate cells.</figcaption>
    <details><summary>View aggregate counts as a table</summary><div className="table-scroll"><table className="table"><thead><tr><th>Aggregate area</th><th>Households enrolled</th></tr></thead><tbody>{valid.map((b,i)=><tr key={b.h3}><td>Area {i+1}</td><td>{b.households.toLocaleString()}</td></tr>)}</tbody></table></div></details>
    <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noreferrer">Report a basemap issue</a>
  </figure>;
}
