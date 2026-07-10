const pem = `-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAxekACwcsuqF0/7weVgK4
RNjCZ8/cDQ+BAMbup4nvuk44s74JdDfAtnjsIefMheLiKLNmifrndskEkZSpXjIE
X0FdXpXsWY17zOp5DM5g+c2ffYwmskjSz3JqQegTVwdxBT53qMqKt3m27iNz2sz3
1dKkhQOoyyz5wxsYM1BtdXELan/+2k/rEAsIik01ukDvWiMe1slFgeEuLpGvGnVO
aqkNK3ZtV8iLqE7eChURb/nTxRdHoXq4h2L41wtbpkta56ZUrihOQEDjgd/nepMt
1M69U2P13YZelX9HKKPnqq9zvYHY2czNEqZiGbojH+C6g1CIR4QtuUzAEsxK+P8n
XSrH2ijBlUjof/CGAA/rKf9oPvPZKN+BiMEdn/bqhTC4iQpiGdZinzuEI1I+jMlp
/d3RH+m7IQvA1ObL0+6Nt6ksVJDHJsVV5fsd8no/7sz2Wkd0EaMTEKWY8267RGnT
rQZlFSBteJEzNrtwKRvB1t0Nk0FMqnuOZGYlJiIU+1kxPZeKiIl6vj24KQICu0vg
xluCEhWVFAQjGnv0ukLc6fbHdX8EgUVFIB5etMEaPLNh4iK6/dBO+ApjJNohChs9
KTAya5/286paiH5knSDoQ5qgmE7xpEQ0NggHFQvKZI6DLQC5VAxG36rARdEvuRCI
rkse+4CjRbhof0K7nxrZQoECAwEAAQ==
-----END PUBLIC KEY-----`;

let s = pem.replace(/-----BEGIN[^-]+-----/g, '').replace(/-----END[^-]+-----/g, '').replace(/\s/g, '');
console.log('after strip length:', s.length, 'mod 4:', s.length % 4);
console.log('first 20 chars:', JSON.stringify(s.slice(0, 20)));
console.log('last 20 chars:', JSON.stringify(s.slice(-20)));
while (s.length % 4) s += '=';
console.log('after pad length:', s.length);
try {
  const raw = Buffer.from(s, 'base64');
  console.log('decoded length:', raw.length, 'first byte:', '0x' + raw[0].toString(16));
  if (raw[0] === 0x30) console.log('SPKI header OK');
  else console.log('WRONG first byte - decode issue');
} catch(e) {
  console.log('ERROR:', e.message);
}
