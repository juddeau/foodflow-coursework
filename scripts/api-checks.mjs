import assert from 'node:assert/strict';
const URL=process.env.GATEWAY_URL ?? 'http://localhost:4000/';let count=0;
async function q(query,variables={},token,headers={}) {return (await (await fetch(URL,{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`} : {}),...headers},body:JSON.stringify({query,variables})})).json());}
const login=async email=>(await q('mutation($e:String!){login(email:$e,password:"demo123"){token}}',{e:email})).data.login.token;
const c=await login('client@demo.ru'),r=await login('pizza@demo.ru'),k=await login('courier@demo.ru');
function check(v,name){assert.ok(v,name);console.log('OK '+name);count++;}
let res=await q('{myOrders{id}}');check(res.errors?.[0].extensions?.code==='UNAUTHENTICATED','анонимный запрос защищён');
res=await q('{myOrders{id}}',{},null,{'x-user-id':'fake','x-user-role':'CUSTOMER'});check(res.errors?.[0].extensions?.code==='UNAUTHENTICATED','внешние служебные заголовки не дают авторизацию');
res=await q('{user(id:"x"){id} deliveryOrder(id:"x"){id}}');check(res.errors?.length>=1,'внутренние операции не опубликованы шлюзом');
res=await q('query {a:restaurants{...R} b:restaurants(cuisine:"Итальянская"){id}} fragment R on Restaurant{id name menu(onlyAvailable:true){id available restaurant{id name}} owner{id name}}');check(!res.errors && res.data.a.every(x=>x.menu.every(m=>m.available)),'алиасы, фрагменты, аргументы и вложенные связи меню');
res=await q('{myOrders{id customer{id name} restaurant{id name} delivery{id status courier{name}} courier{name}}}',{},c);check(!res.errors,'связанные данные заказа клиента');
res=await q('{restaurantOrders{id customer{name} items{name quantity} status}}',{},r);check(!res.errors,'запрос экрана ресторана');
res=await q('query {availableDeliveries{id order{...Card}} myDeliveries{id order{...Card}}} fragment Card on Order{id total items{name quantity}}',{},k);check(!res.errors,'карточки курьера с GraphQL-фрагментами');
res=await q('{myOrders{id}}',{},'invalid-token');check(res.errors?.[0].extensions?.code==='UNAUTHENTICATED','поддельный JWT отклонён');
console.log('Дополнительных проверок: '+count);
