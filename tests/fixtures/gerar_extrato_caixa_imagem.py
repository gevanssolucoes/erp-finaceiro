# Gera um extrato "Extrato por período" no formato da Caixa, só imagem (sem texto), com dados fictícios.
# Uso: python3 tests/fixtures/gerar_extrato_caixa_imagem.py  -> tests/fixtures/extrato_caixa_imagem_exemplo.pdf
from PIL import Image, ImageDraw, ImageFont
import os
F='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
f=ImageFont.truetype(F,26);fb=ImageFont.truetype(F,44);ft=ImageFont.truetype(F,34);fr=ImageFont.truetype(F,22)
W,H=1957,3230;img=Image.new('RGB',(W,H),'white');d=ImageDraw.Draw(img)
d.text((130,120),'CAIXA',font=fb,fill=(0,90,170));d.text((130,260),'Extrato por período',font=ft,fill='black')
for i,(k,v) in enumerate([('Cliente','EMPRESA TESTE LTDA'),('Conta','1234 / 1288.000000000000-1'),('Data','10/11/2026 - 20:03'),('Mês','Outubro'),('Período dos lançamentos','01/10/2026 até 31/10/2026')]):
  d.text((130,350+i*60),k,font=f,fill='black');d.text((560,350+i*60),v,font=f,fill='black')
d.text((1050,660),'SALDO ANTERIOR',font=f,fill='black');d.text((1620,660),'R$ 1.000,00 C',font=f,fill='black')
cols=[100,470,620,1080,1300,1480,1640]
for x,t in zip(cols,['Lançamentos','Nr. Doc','Histórico/Complemento','Favorecido','CPF/CNPJ','Valor','Saldo']):d.text((x,740),t,font=f,fill='black')
# mais recente primeiro, como no app da Caixa
lin=[('20/10/2026 - 00:00:00','000000','SALDO DIA','','','0,00 C','2.584,50 C'),
 ('20/10/2026 - 10:15:00','201015','PAGAMENTO DE BOLETO','Energia Teste SA','**111.222/0**','215,50 D','2.584,50 C'),
 ('15/10/2026 - 09:00:00','150900','DEB PIX CHAVE','Fornecedor Teste','**333.444/0**','1.200,00 D','2.800,00 C'),
 ('05/10/2026 - 12:08:02','000246','RECEBIMENTO TED','Cliente Teste Ltda','**555.666/0**','3.000,00 C','4.000,00 C')]
y=820
for r in lin:
  for x,t in zip(cols,r):d.text((x,y),t,font=fr,fill='black')
  y+=75
out=os.path.join(os.path.dirname(__file__),'extrato_caixa_imagem_exemplo.pdf');img.save(out,'PDF',resolution=240);print(out)
