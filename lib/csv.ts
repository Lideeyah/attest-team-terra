/** RFC 4180 fields, including quoted commas, escaped quotes and embedded newlines. */
export function parseCsv(input:string):Record<string,string>[] {
  const records:string[][]=[];let record:string[]=[],field='',quoted=false;
  const source=input.replace(/^\uFEFF/,'');
  for(let i=0;i<source.length;i++){
    const c=source[i];
    if(c==='"'){if(quoted&&source[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
    else if(c===','&&!quoted){record.push(field);field='';}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&source[i+1]==='\n')i++;record.push(field);if(record.some(v=>v.trim()))records.push(record);record=[];field='';}
    else field+=c;
  }
  if(quoted)throw Error('A quoted field is not closed.');record.push(field);if(record.some(v=>v.trim()))records.push(record);
  const headers=records.shift()?.map(h=>h.trim())??[];if(!headers.length||new Set(headers).size!==headers.length)throw Error('Use a unique header for every column.');
  return records.map((values,index)=>{if(values.length!==headers.length)throw Error(`Row ${index+2} has a different number of columns.`);return Object.fromEntries(headers.map((h,i)=>[h,values[i].trim()]));});
}
