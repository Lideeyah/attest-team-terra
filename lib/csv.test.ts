import {it,expect} from 'vitest';
import {parseCsv} from './csv';
it('reads quoted commas, escaped quotes, BOM and multiline evidence without shifting columns',()=>{expect(parseCsv('\uFEFFname,reason\r\n"A, B","A ""quoted"" reason\ncontinued"\r\n')).toEqual([{name:'A, B',reason:'A "quoted" reason\ncontinued'}]);});
it('rejects duplicate headers, incomplete quotes and different row widths',()=>{expect(()=>parseCsv('name,name\na,b')).toThrow();expect(()=>parseCsv('name,reason\na')).toThrow();expect(()=>parseCsv('name\n"unfinished')).toThrow();});
