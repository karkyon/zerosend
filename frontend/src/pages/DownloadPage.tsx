import { useParams } from 'react-router-dom'
export function DownloadPage() {
  const { token } = useParams<{ token: string }>()
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh'}}>
      <div style={{textAlign:'center'}}>
        <h1 style={{fontSize:'1.5rem',fontWeight:'700',color:'#6366f1'}}>ファイル受信</h1>
        <p style={{color:'#94a3b8',marginTop:'8px',fontFamily:'monospace',fontSize:'12px'}}>token: {token}</p>
        <p style={{color:'#94a3b8',marginTop:'4px'}}>Phase 4 で実装予定</p>
      </div>
    </div>
  )
}
