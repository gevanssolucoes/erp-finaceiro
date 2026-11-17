// gera boleto de teste: código de barras (44), linha digitável (47), imagem ITF e PDF com texto
function mod10(s){let soma=0,peso=2;for(let i=s.length-1;i>=0;i--){const n=+s[i]*peso;soma+=n>9?Math.floor(n/10)+n%10:n;peso=peso===2?1:2}return (10-soma%10)%10}
function mod11b(s){let soma=0,peso=2;for(let i=s.length-1;i>=0;i--){soma+=+s[i]*peso;peso=peso===9?2:peso+1}let dv=11-soma%11;return dv===0||dv>9?1:dv}
function boleto(banco,venc,valor,livre){
  const fator=1000+Math.round((Date.UTC(...venc.split('-').map((x,i)=>i===1?x-1:+x))-Date.UTC(2025,1,22))/864e5);
  const semDv=banco+'9'+String(fator)+String(Math.round(valor*100)).padStart(10,'0')+livre;const bc=semDv.slice(0,4)+mod11b(semDv)+semDv.slice(4);
  const c1=bc.slice(0,4)+bc.slice(19,24),c2=bc.slice(24,34),c3=bc.slice(34);const linha=c1+mod10(c1)+c2+mod10(c2)+c3+mod10(c3)+bc[4]+bc.slice(5,19);
  return {bc,linha};
}
const fmt=d=>`${d.slice(0,5)}.${d.slice(5,10)} ${d.slice(10,15)}.${d.slice(15,21)} ${d.slice(21,26)}.${d.slice(26,32)} ${d[32]} ${d.slice(33)}`;
function pdfTexto(linhas){
  const conteudo='BT /F1 11 Tf 40 780 Td 14 TL '+linhas.map(l=>`(${l.replace(/[()\\]/g,'')}) '`).join(' ')+' ET';
  const objs=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${conteudo.length} >>\nstream\n${conteudo}\nendstream`,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  let out='%PDF-1.4\n';const off=[];objs.forEach((o,i)=>{off.push(out.length);out+=`${i+1} 0 obj\n${o}\nendobj\n`});
  const x=out.length;out+=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`+off.map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size ${objs.length+1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF`;
  return Buffer.from(out,'latin1');
}
// desenha o ITF numa página e devolve PNG (como foto: com margem e texto em volta)
async function pngITF(pg,bc){
  const url=await pg.evaluate(d=>{const P=['NNWWN','WNNNW','NWNNW','WWNNN','NNWNW','WNWNN','NWWNN','NNNWW','WNNWN','NWNWN'];const n=3,w=8;
    const seq=['n','n','n','n'];for(let i=0;i<d.length;i+=2){const a=P[+d[i]],b=P[+d[i+1]];for(let j=0;j<5;j++){seq.push(a[j]==='W'?'w':'n');seq.push(b[j]==='W'?'w':'n')}}seq.push('w','n','n');
    const W=seq.reduce((s,x)=>s+(x==='w'?w:n),0)+120;const c=document.createElement('canvas');c.width=W+200;c.height=700;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);
    g.fillStyle='#222';g.font='22px sans-serif';g.fillText('BANCO ITAU  |  Beneficiário: Escola Aprender Ltda',40,60);g.fillText('Vencimento 10/12/2026     Valor R$ 159,90',40,110);
    let x=160;seq.forEach((s,i)=>{const lw=s==='w'?w:n;if(i%2===0){g.fillStyle='#000';g.fillRect(x,480,lw,150)}x+=lw});return c.toDataURL('image/png')},bc);
  return Buffer.from(url.split(',')[1],'base64');
}
module.exports={boleto,fmt,pdfTexto,pngITF};
