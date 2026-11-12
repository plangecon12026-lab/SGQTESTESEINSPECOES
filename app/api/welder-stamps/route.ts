import { fieldApiGuard } from '../../management-auth';
import { sgqDb } from '../../../db/sgq';

export async function GET(){const fieldDenied=await fieldApiGuard();if(fieldDenied)return fieldDenied;
  try{
    const result=await sgqDb().prepare("SELECT DISTINCT stamp FROM welders WHERE stamp<>'' AND employment_status='active' ORDER BY stamp").all<{stamp:string}>();
    return Response.json({stamps:result.results.map((row:{stamp:string})=>row.stamp)},{headers:{'Cache-Control':'public, max-age=60'}});
  }catch(error){console.error(error);return Response.json({error:'Sinetes indisponíveis.'},{status:503});}
}
