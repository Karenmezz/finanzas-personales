import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCampaignBenefit, dashboardSummary, brandRanking, previousPendingCampaigns, campaignsByBrand, isBarterComplete, resetBenefit, applyVoucherUsage, benefitSummary } from '../src/lib/finance-insights.ts';
const products = {kind:'products', description:'Kit de maquillaje', quantity:2, received:false};
const voucher = {kind:'voucher', description:'Mercado Rappi', amount:100000, usedAmount:0, received:true};
const campaign = (overrides={})=>({id:'canje',name:'Video',brand:'Rappi',network:'Instagram',collaborationType:'Canje',month:'2026-11',dueDate:'2026-11-01',value:0,status:'Pendiente',payments:[],benefit:products,...overrides});
const data = (campaigns)=>({campaigns,bills:[],expenses:[],monthColors:{}});
test('products have quantity and description, with no price or required publication date',()=>{
 assert.equal(validateCampaignBenefit(campaign()),true);
 for(const extra of [{amount:100},{value:100},{usedAmount:0},{quantity:0},{quantity:1.5},{description:''}]) assert.equal(validateCampaignBenefit(campaign({benefit:{...products,...extra}})),false);
 assert.equal(validateCampaignBenefit(campaign({value:100})),false);
 assert.equal(validateCampaignBenefit(campaign({currency:'USD'})),false);
});
test('barter, including legacy reference values, never increases cash metrics or ranking',()=>{
 const paid=campaign({id:'paid',collaborationType:'Paga',benefit:undefined,value:500000,payments:[{amount:100000}]});
 const legacy=campaign({id:'old',value:999999,benefit:undefined,payments:[{amount:999999}]});
 const all=[campaign(),legacy,paid]; const summary=dashboardSummary(data(all),2026);
 assert.equal(summary.generated,500000);assert.equal(summary.received,100000);assert.equal(summary.pending,400000);assert.equal(summary.balance,100000);
 assert.equal(brandRanking(all)[0].agreed,500000);assert.equal(brandRanking(all)[0].count,1);
 assert.equal(previousPendingCampaigns(all,'2026-12').length,1);
 assert.equal(campaignsByBrand(all)[0].campaigns.length,3);
});
test('mixed collaboration counts only its cash payment',()=>{
 const mixed=campaign({collaborationType:'Paga y canje',value:500000,benefit:voucher,payments:[{amount:200000}]});
 assert.equal(validateCampaignBenefit(mixed),true);const result=dashboardSummary(data([mixed]),2026);
 assert.equal(result.generated,500000);assert.equal(result.pending,300000);assert.equal(result.benefits.voucherBalance,100000);
});
test('voucher usage requires receipt and cannot exceed balance',()=>{
 const row=campaign({benefit:voucher});const updated=applyVoucherUsage(row,30000);assert.equal(updated.usedAmount,30000);assert.equal(voucher.usedAmount,0);
 for(const amount of [0,-1,0.5,100001,NaN]) assert.throws(()=>applyVoucherUsage(row,amount));
 assert.throws(()=>applyVoucherUsage(campaign({benefit:{...voucher,received:false}}),1));
 assert.equal(validateCampaignBenefit(campaign({benefit:{...voucher,usedAmount:100001}})),false);
 assert.equal(validateCampaignBenefit(campaign({benefit:{...voucher,usedAmount:1,received:false}})),false);
 assert.equal(validateCampaignBenefit(campaign({benefit:{...voucher,expiresOn:'2026-02-30'}})),false);
});
test('receipt, publication, and voucher usage remain independent',()=>{
 assert.equal(isBarterComplete(campaign({status:'Realizado'})),false);
 assert.equal(isBarterComplete(campaign({benefit:{...products,received:true}})),false);
 assert.equal(isBarterComplete(campaign({status:'Realizado',benefit:{...products,received:true}})),true);
 assert.equal(isBarterComplete(campaign({status:'Realizado',benefit:voucher})),false);
 assert.equal(isBarterComplete(campaign({status:'Realizado',benefit:{...voucher,usedAmount:100000}})),true);
});
test('duplicate resets receipt and voucher usage; summary counts products without pricing them',()=>{
 assert.deepEqual(resetBenefit({...voucher,usedAmount:30000}),{...voucher,received:false,usedAmount:0});assert.equal(resetBenefit({...products,received:true}).received,false);
 const summary=benefitSummary([campaign({benefit:{...products,received:true}}),campaign({id:'voucher',benefit:{...voucher,usedAmount:30000}})]);
 assert.equal(summary.count,2);assert.equal(summary.products,2);assert.equal(summary.voucherBalance,70000);assert.equal(summary.withoutDate,2);
});
