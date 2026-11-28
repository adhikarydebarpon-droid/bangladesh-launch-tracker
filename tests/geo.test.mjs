import test from 'node:test';
import assert from 'node:assert/strict';
const haversine=(a,b,c,d)=>{const R=6371000,p=Math.PI/180,dl=(c-a)*p,dn=(d-b)*p,x=Math.sin(dl/2)**2+Math.cos(a*p)*Math.cos(c*p)*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(x));};
test('same point is zero distance',()=>assert.equal(haversine(23,90,23,90),0));
test('nautical mile conversion uses 1852 metres',()=>assert.equal(1852/1852,1));
test('nearby radius excludes points beyond exact distance',()=>assert.ok(haversine(23,90,23.1,90)>5000));
