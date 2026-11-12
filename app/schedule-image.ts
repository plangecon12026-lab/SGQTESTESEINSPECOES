export type ScheduleExportPlan = {
  project_name: string; pep: string; ls: string; activity: string; test: string; area: string;
  start_date: string; end_date: string; status: string; priority: string; owner: string; next_step: string;
  progress: number;
};

type Input = { plans: ScheduleExportPlan[]; start: string; end: string; today: string; scope: string };
const colors = { ink: '#18353b', muted: '#667d80', green: '#167a6b', blue: '#327ea5', red: '#c8543b', pale: '#f3f7f6', line: '#dce8e7', white: '#ffffff' };
const formatDate = (value: string) => value ? new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}) : 'A definir';
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const tone = (plan: ScheduleExportPlan, today: string) => plan.status === 'Concluído' ? 'done' : plan.status === 'Cancelado' ? 'cancelled' : (plan.end_date && plan.end_date < today) || plan.status === 'Atrasado' ? 'late' : plan.status === 'Em andamento' ? 'ongoing' : 'waiting';
const toneColor = (key: string) => ({ done:'#25815d', cancelled:'#9caeb0', late:colors.red, ongoing:'#f5bd42', waiting:colors.blue } as Record<string,string>)[key] || colors.blue;

export async function createScheduleImage({plans,start,end,today,scope}:Input): Promise<Blob> {
  const relevant = plans.filter(p => p.start_date && p.end_date && p.start_date <= end && p.end_date >= start)
    .sort((a,b)=>a.start_date.localeCompare(b.start_date));
  const days=Array.from({length:7},(_,i)=>{const d=new Date(`${start}T12:00:00`);d.setDate(d.getDate()+i);return dateKey(d)});
  const gantt = relevant.slice(0,14);
  const actions = [...plans].filter(p=>p.status!=='Concluído'&&p.status!=='Cancelado')
    .sort((a,b)=>Number(tone(b,today)==='late')-Number(tone(a,today)==='late') || (a.start_date||'9999').localeCompare(b.start_date||'9999')).slice(0,5);
  const width=1600, height=610+Math.max(gantt.length,1)*72+Math.max(actions.length,1)*76+125;
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Este navegador não conseguiu gerar a imagem.');
  const rect=(x:number,y:number,w:number,h:number,fill:string,r=0)=>{ctx.fillStyle=fill;if(r&&typeof ctx.roundRect==='function'){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}else ctx.fillRect(x,y,w,h);};
  const write=(value:string,x:number,y:number,size=22,fill=colors.ink,weight=400,maxWidth?:number)=>{ctx.font=`${weight} ${size}px Arial, sans-serif`;ctx.fillStyle=fill;let v=value;if(maxWidth){while(v.length>1&&ctx.measureText(v).width>maxWidth)v=v.slice(0,-1);if(v!==value)v=v.trimEnd()+'…';}ctx.fillText(v,x,y);};
  const wrap=(value:string,x:number,y:number,maxWidth:number,lineHeight:number,maxLines:number,size=18,fill=colors.ink,weight=400)=>{ctx.font=`${weight} ${size}px Arial, sans-serif`;const words=value.trim().split(/\s+/),lines:string[]=[];let line='';for(const word of words){const candidate=line?`${line} ${word}`:word;if(ctx.measureText(candidate).width>maxWidth&&line){lines.push(line);line=word}else line=candidate}if(line)lines.push(line);lines.slice(0,maxLines).forEach((part,i)=>write(i===maxLines-1&&lines.length>maxLines?part+'…':part,x,y+i*lineHeight,size,fill,weight,maxWidth));};

  rect(0,0,width,height,colors.white);
  rect(0,0,width,22,colors.green);rect(0,22,width,200,'#123d3b');
  write('PLANGECON  /  SISTEMA DE GESTÃO DA QUALIDADE',62,73,19,'#b5ddd5',700);
  write('Cronograma de inspeções e testes',62,132,42,colors.white,700);
  write(`Período: ${formatDate(start)} a ${formatDate(end)}   ·   ${scope}`,62,180,20,'#d9edeb',400,1430);

  const counts=[['REGISTROS',plans.length,colors.ink],['NA SEMANA',relevant.length,colors.blue],['PRAZO VENCIDO',plans.filter(p=>tone(p,today)==='late').length,colors.red],['CONCLUÍDOS',plans.filter(p=>p.status==='Concluído').length,colors.green]] as const;
  counts.forEach(([label,value,color],i)=>{const x=62+i*375;rect(x,245,353,118,colors.pale,13);write(label,x+20,280,15,colors.muted,700);write(String(value),x+20,336,46,color,700)});
  let y=420;
  write('Programação diária da semana',62,y,28,colors.ink,700);write(`Atualizado em ${formatDate(today)}`,1300,y,16,colors.muted);y+=34;
  rect(62,y,1476,52,'#eaf3f1',8);write('INSPEÇÃO / LOCAL',78,y+33,16,colors.ink,700);
  days.forEach((day,i)=>{const d=new Date(`${day}T12:00:00`);write(d.toLocaleDateString('pt-BR',{weekday:'short'}).replace('.','').toUpperCase(),680+i*122,y+20,13,colors.ink,700);write(formatDate(day).slice(0,5),680+i*122,y+40,13,colors.muted,400)});
  y+=52;
  if(!gantt.length){rect(62,y,1476,62,colors.pale);write('Nenhuma inspeção programada neste período.',80,y+38,19,colors.muted);y+=62}
  else for(const p of gantt){rect(62,y,1476,72,colors.white);ctx.strokeStyle=colors.line;ctx.beginPath();ctx.moveTo(62,y+71);ctx.lineTo(1538,y+71);ctx.stroke();write(p.test,78,y+22,19,colors.ink,700,435);write(`LOCAL: ${p.area||'A definir'}`,78,y+43,15,'#075b54',700,435);write(`${p.project_name} · ${p.activity}`,78,y+62,12,colors.muted,400,435);write(`${p.progress}%`,540,y+41,19,tone(p,today)==='ongoing'?'#875c00':toneColor(tone(p,today)),700);
    days.forEach((day,i)=>{rect(672+i*122,y+7,116,58,day>=p.start_date&&day<=p.end_date?toneColor(tone(p,today)):'#f4f8f7',4)});y+=72}
  if(relevant.length>gantt.length){write(`+ ${relevant.length-gantt.length} programações adicionais neste período. Filtre por projeto para exportar uma visão específica.`,78,y+26,16,colors.muted);y+=44}
  y+=18;[['Em andamento','ongoing'],['A iniciar','waiting'],['Atenção','late'],['Concluído','done'],['Cancelado','cancelled']].forEach(([label,key],i)=>{const x=72+i*282;rect(x,y-12,17,17,toneColor(key),4);write(label,x+27,y+2,15,colors.muted)});y+=18;
  y+=38;write('Próximos passos',62,y,28,colors.ink,700);y+=25;
  if(!actions.length){rect(62,y,1476,70,colors.pale,9);write('Nenhuma ação pendente no filtro selecionado.',82,y+43,19,colors.muted);y+=70}
  else for(const p of actions){rect(62,y,1476,68,colors.pale,9);rect(62,y,7,68,toneColor(tone(p,today)),4);write(p.test,84,y+26,18,colors.ink,700,345);write(`${p.project_name} · ${p.area||'Local a definir'} · ${p.progress}%`,84,y+51,14,colors.muted,400,345);wrap(p.next_step||'Definir próximo passo com a equipe.',465,y+27,750,21,2,17,colors.ink);write(p.end_date?formatDate(p.end_date):'Sem data',1320,y+40,15,toneColor(tone(p,today)),700,185);y+=76}
  y+=18;ctx.strokeStyle=colors.line;ctx.beginPath();ctx.moveTo(62,y);ctx.lineTo(1538,y);ctx.stroke();write('Fonte: SGQ · Cronograma de inspeções e testes',62,y+36,15,colors.muted);write(`${gantt.length} de ${relevant.length} faixas no período · ${actions.length} próximos passos exibidos`,960,y+36,15,colors.muted,400,570);
  return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Não foi possível salvar a imagem.')),'image/png'));
}
