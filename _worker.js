// Dayframe build: Investing research upgrade 2026-08-20
const SUPABASE_URL='https://xvquxwvapgzxyuntylci.supabase.co';
const SUPABASE_ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2cXV4d3ZhcGd6eHl1bnR5bGNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMjQ4MzQsImV4cCI6MjA4OTYwMDgzNH0.ovxzwMPaoyqdM4tJnjh28ovzj9mpsl87ToDiA2mXADw';
const STATE_COOKIE='dayframe_tl_v1_state';


const BIBLE_API_USFM=Object.freeze({'Genesis':'GEN','Exodus':'EXO','Leviticus':'LEV','Numbers':'NUM','Deuteronomy':'DEU','Joshua':'JOS','Judges':'JDG','Ruth':'RUT','1 Samuel':'1SA','2 Samuel':'2SA','1 Kings':'1KI','2 Kings':'2KI','1 Chronicles':'1CH','2 Chronicles':'2CH','Ezra':'EZR','Nehemiah':'NEH','Esther':'EST','Job':'JOB','Psalms':'PSA','Proverbs':'PRO','Ecclesiastes':'ECC','Song of Solomon':'SNG','Isaiah':'ISA','Jeremiah':'JER','Lamentations':'LAM','Ezekiel':'EZK','Daniel':'DAN','Hosea':'HOS','Joel':'JOL','Amos':'AMO','Obadiah':'OBA','Jonah':'JON','Micah':'MIC','Nahum':'NAM','Habakkuk':'HAB','Zephaniah':'ZEP','Haggai':'HAG','Zechariah':'ZEC','Malachi':'MAL','Matthew':'MAT','Mark':'MRK','Luke':'LUK','John':'JHN','Acts':'ACT','Romans':'ROM','1 Corinthians':'1CO','2 Corinthians':'2CO','Galatians':'GAL','Ephesians':'EPH','Philippians':'PHP','Colossians':'COL','1 Thessalonians':'1TH','2 Thessalonians':'2TH','1 Timothy':'1TI','2 Timothy':'2TI','Titus':'TIT','Philemon':'PHM','Hebrews':'HEB','James':'JAS','1 Peter':'1PE','2 Peter':'2PE','1 John':'1JN','2 John':'2JN','3 John':'3JN','Jude':'JUD','Revelation':'REV'});
async function getLicensedBibleChapter(url,env){
 const key=String(env.API_BIBLE_KEY||'').trim(),translation=String(url.searchParams.get('translation')||'').trim().toUpperCase(),book=canonicalBibleBook(url.searchParams.get('book')),chapter=Number(url.searchParams.get('chapter'));
 if(!['NIV','MSG','NLT'].includes(translation))return json({error:'Choose NIV, The Message or NLT.'},400);
 if(!book)return json({error:'Choose a valid Bible book.'},400);
 if(!Number.isInteger(chapter)||chapter<1||chapter>BIBLE_KJV_BOOKS[book])return json({error:'Choose a valid chapter for '+book+'.'},400);
 const translationName=translation==='MSG'?'The Message':translation==='NLT'?'NLT':'NIV';
 if(!key)return json({error:'The licensed '+translationName+' reader needs one owner-only API.Bible connection before it can appear inside Dayframe.',code:'BIBLE_LICENSE_NOT_CONFIGURED'},503);
 const base='https://rest.api.bible/v1',headers={accept:'application/json','api-key':key};
 let versions;
 try{versions=await fetch(base+'/bibles?language=eng&abbreviation='+encodeURIComponent(translation),{headers})}catch(e){return json({error:'The licensed Bible service is temporarily unavailable.'},502)}
 if(versions.status===401)return json({error:'Dayframe’s licensed Bible key needs to be checked.',code:'BIBLE_LICENSE_NOT_CONFIGURED'},503);
 if(!versions.ok)return json({error:'The licensed Bible service could not check this translation.'},502);
 const versionLength=Number(versions.headers.get('content-length')||0);if(versionLength>250000)return json({error:'The licensed Bible response was unexpectedly large.'},502);
 let versionData;try{versionData=await versions.json()}catch(e){return json({error:'The licensed Bible service returned an invalid response.'},502)}
 const candidates=Array.isArray(versionData.data)?versionData.data:[],version=candidates.find(x=>String(x.abbreviation||x.abbreviationLocal||'').toUpperCase()===translation)||candidates[0];
 if(!version?.id)return json({error:translationName+' is not included in Dayframe’s API.Bible licence yet.',code:'BIBLE_TRANSLATION_NOT_LICENSED'},503);
 const chapterId=BIBLE_API_USFM[book]+'.'+chapter,chapterUrl=base+'/bibles/'+encodeURIComponent(version.id)+'/chapters/'+encodeURIComponent(chapterId)+'?content-type=text&include-notes=false&include-titles=true&include-chapter-numbers=false&include-verse-numbers=true';
 let response;try{response=await fetch(chapterUrl,{headers})}catch(e){return json({error:'The licensed Bible service is temporarily unavailable.'},502)}
 if(response.status===403)return json({error:translationName+' is not included in Dayframe’s API.Bible licence yet.',code:'BIBLE_TRANSLATION_NOT_LICENSED'},503);
 if(!response.ok)return json({error:'The licensed Bible reader could not open that chapter.'},502);
 const length=Number(response.headers.get('content-length')||0);if(length>500000)return json({error:'The licensed Bible response was unexpectedly large.'},502);
 let payload;try{payload=await response.json()}catch(e){return json({error:'The licensed Bible service returned an invalid response.'},502)}
 const content=String(payload?.data?.content||'').slice(0,350000);if(!content)return json({error:'No Scripture text was returned for that chapter.'},502);
 return json({reference:String(payload.data.reference||book+' '+chapter),translation,content,copyright:String(payload.data.copyright||version.copyright||''),fumsToken:String(payload?.meta?.fumsToken||payload?.meta?.fums||'')},200,{'cache-control':'no-store'});
}

const BIBLE_KJV_BOOKS=Object.freeze({'Genesis':50,'Exodus':40,'Leviticus':27,'Numbers':36,'Deuteronomy':34,'Joshua':24,'Judges':21,'Ruth':4,'1 Samuel':31,'2 Samuel':24,'1 Kings':22,'2 Kings':25,'1 Chronicles':29,'2 Chronicles':36,'Ezra':10,'Nehemiah':13,'Esther':10,'Job':42,'Psalms':150,'Proverbs':31,'Ecclesiastes':12,'Song of Solomon':8,'Isaiah':66,'Jeremiah':52,'Lamentations':5,'Ezekiel':48,'Daniel':12,'Hosea':14,'Joel':3,'Amos':9,'Obadiah':1,'Jonah':4,'Micah':7,'Nahum':3,'Habakkuk':3,'Zephaniah':3,'Haggai':2,'Zechariah':14,'Malachi':4,'Matthew':28,'Mark':16,'Luke':24,'John':21,'Acts':28,'Romans':16,'1 Corinthians':16,'2 Corinthians':13,'Galatians':6,'Ephesians':6,'Philippians':4,'Colossians':4,'1 Thessalonians':5,'2 Thessalonians':3,'1 Timothy':6,'2 Timothy':4,'Titus':3,'Philemon':1,'Hebrews':13,'James':5,'1 Peter':5,'2 Peter':3,'1 John':5,'2 John':1,'3 John':1,'Jude':1,'Revelation':22});
function canonicalBibleBook(value){const clean=String(value||'').trim().replace(/\s+/g,' ').toLowerCase();return Object.keys(BIBLE_KJV_BOOKS).find(x=>x.toLowerCase()===clean)||''}
async function getKJVChapter(url){
 const book=canonicalBibleBook(url.searchParams.get('book')),chapter=Number(url.searchParams.get('chapter'));
 if(!book)return json({error:'Choose a valid Bible book.'},400);
 if(!Number.isInteger(chapter)||chapter<1||chapter>BIBLE_KJV_BOOKS[book])return json({error:'Choose a valid chapter for '+book+'.'},400);
 const upstreamUrl='https://bible-api.com/'+encodeURIComponent(book+' '+chapter)+'?translation=kjv';
 let response;
 try{response=await fetch(upstreamUrl,{headers:{accept:'application/json'},cf:{cacheEverything:true,cacheTtl:86400}})}catch(e){return json({error:'The Bible reader is temporarily unavailable.'},502)}
 if(!response.ok)return json({error:'The Bible reader could not open that chapter.'},502);
 const length=Number(response.headers.get('content-length')||0);
 if(length>300000)return json({error:'The Bible response was unexpectedly large.'},502);
 let data;try{data=await response.json()}catch(e){return json({error:'The Bible reader returned an invalid response.'},502)}
 const verses=Array.isArray(data.verses)?data.verses.slice(0,200).map(v=>({verse:Number(v.verse)||0,text:String(v.text||'').slice(0,1200)})).filter(v=>v.verse&&v.text):[];
 if(!verses.length)return json({error:'No verses were returned for that chapter.'},502);
 return json({reference:String(data.reference||book+' '+chapter),translation:'King James Version',verses,attribution:'King James Version · public domain'},200,{'cache-control':'public, max-age=3600, s-maxage=86400'});
}


const MARKET_RANGES=new Set(['1mo','3mo','6mo','1y','2y','5y']);
const MARKET_INTERVALS=new Set(['1d','1wk','1mo']);
function marketTickerFromPath(path,prefix){
  let value='';try{value=decodeURIComponent(path.slice(prefix.length))}catch(e){return ''}
  value=String(value||'').trim().toUpperCase();
  return /^[A-Z0-9.^=-]{1,20}$/.test(value)?value:'';
}
async function fetchYahooChartData(symbol,range='6mo',interval='1wk'){
  const query='?range='+encodeURIComponent(range)+'&interval='+encodeURIComponent(interval)+'&includePrePost=false&events=div%2Csplits';
  let lastStatus=502;
  for(const host of ['query1.finance.yahoo.com','query2.finance.yahoo.com']){
    let response;
    try{
      response=await fetch('https://'+host+'/v8/finance/chart/'+encodeURIComponent(symbol)+query,{
        headers:{accept:'application/json','user-agent':'Mozilla/5.0 Dayframe/1.0'},
        cf:{cacheEverything:true,cacheTtl:300}
      });
    }catch(e){continue}
    lastStatus=response.status;
    if(!response.ok)continue;
    const body=await response.text();
    if(body.length>2000000)throw new Error('Market response was unexpectedly large.');
    let data;try{data=JSON.parse(body)}catch(e){continue}
    if(data?.chart?.result?.[0]&&!data?.chart?.error)return data;
  }
  const err=new Error('Market data provider unavailable.');err.status=lastStatus;throw err;
}
async function resolveYahooSymbol(query){
  const clean=String(query||'').trim().slice(0,120);if(clean.length<2)return '';
  let response;
  try{
    response=await fetch('https://query1.finance.yahoo.com/v1/finance/search?q='+encodeURIComponent(clean)+'&quotesCount=8&newsCount=0',{
      headers:{accept:'application/json','user-agent':'Mozilla/5.0 Dayframe/1.0'},
      cf:{cacheEverything:true,cacheTtl:3600}
    });
  }catch(e){return ''}
  if(!response.ok)return '';
  const body=await response.text();if(body.length>500000)return '';
  let data;try{data=JSON.parse(body)}catch(e){return ''}
  const quotes=Array.isArray(data?.quotes)?data.quotes.filter(item=>['EQUITY','ETF','MUTUALFUND'].includes(String(item?.quoteType||''))):[];
  const preferred=quotes.find(item=>!['PNK','OQB','OEM','OTC'].includes(String(item?.exchange||'').toUpperCase()))||quotes[0];
  const symbol=String(preferred?.symbol||'').trim().toUpperCase();
  return /^[A-Z0-9.^=-]{1,20}$/.test(symbol)?symbol:'';
}
async function getMarketChart(url){
  const prefix=url.pathname.startsWith('/api/investing/prices/')?'/api/investing/prices/':'/api/market/chart/';
  const symbol=marketTickerFromPath(url.pathname,prefix);
  if(!symbol)return json({error:'Enter a valid market ticker.'},400);
  const requestedRange=String(url.searchParams.get('range')||'6mo');
  const requestedInterval=String(url.searchParams.get('interval')||'1wk');
  const range=MARKET_RANGES.has(requestedRange)?requestedRange:'6mo';
  const interval=MARKET_INTERVALS.has(requestedInterval)?requestedInterval:'1wk';
  let data,resolvedSymbol=symbol,lastError;
  try{data=await fetchYahooChartData(symbol,range,interval)}catch(error){lastError=error}
  if(!data){
    const search=String(url.searchParams.get('search')||'').trim().slice(0,120);
    if(search){
      const resolved=await resolveYahooSymbol(search);
      if(resolved&&resolved!==symbol){
        try{data=await fetchYahooChartData(resolved,range,interval);resolvedSymbol=resolved}catch(error){lastError=error}
      }
    }
  }
  if(!data)return json({error:'Verified market data is unavailable for this listing.'},lastError?.status===404?404:502);
  data.dayframe={requested_symbol:symbol,resolved_symbol:resolvedSymbol,used_search:resolvedSymbol!==symbol};
  return json(data,200,{'cache-control':'public, max-age=60, s-maxage=300'});
}

const STOCK_RESEARCH_FORMS=new Set(['10-K','10-Q','8-K','20-F','40-F','6-K','S-1','S-3','424B2','424B3','424B5','DEF 14A']);
const STOCK_RESEARCH_SEC_HEADERS={accept:'application/json,text/html;q=0.9,*/*;q=0.5','user-agent':'Dayframe/1.0 (+https://github.com/celinexal/dayframe)'};
async function readResearchBody(response,maxBytes){
  const declared=Number(response.headers.get('content-length')||0);
  if(declared&&declared>maxBytes)throw new Error('Research source exceeded its size limit.');
  if(!response.body){
    const text=await response.text();
    if(new TextEncoder().encode(text).byteLength>maxBytes)throw new Error('Research source exceeded its size limit.');
    return text;
  }
  const reader=response.body.getReader(),decoder=new TextDecoder();
  let total=0,text='';
  while(true){
    const part=await reader.read();
    if(part.done)break;
    total+=part.value.byteLength;
    if(total>maxBytes){await reader.cancel();throw new Error('Research source exceeded its size limit.')}
    text+=decoder.decode(part.value,{stream:true});
  }
  return text+decoder.decode();
}
function researchHttpsUrl(value){
  try{const url=new URL(String(value||''));return url.protocol==='https:'?url.toString():''}catch(e){return ''}
}
function researchPlainText(value){
  return String(value||'')
    .replace(/<script[\s\S]*?<\/script>/gi,' ')
    .replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/&#(\d+);/g,(all,num)=>String.fromCharCode(Number(num)||32))
    .replace(/&nbsp;|&#160;/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/&quot;/gi,'"')
    .replace(/&#39;|&apos;/gi,"'")
    .replace(/&lt;/gi,'<')
    .replace(/&gt;/gi,'>')
    .replace(/\s+/g,' ')
    .trim();
}
function researchEvidenceWindows(value){
  const text=researchPlainText(value).slice(0,700000);
  if(!text)return '';
  const lower=text.toLowerCase(),terms=['at-the-market','dilution','equity offering','share offering','capital expenditure','liquidity','cash and cash equivalents','working capital','customer concentration','revenue','gross margin','guidance','material agreement','risk factors'];
  const windows=[];
  for(const term of terms){
    let from=0;
    while(windows.length<8){
      const index=lower.indexOf(term,from);if(index<0)break;
      const start=Math.max(0,index-350),end=Math.min(text.length,index+1150);
      const excerpt=text.slice(start,end).trim();
      if(excerpt&&!windows.some(existing=>existing.includes(excerpt.slice(0,120))))windows.push(excerpt);
      from=index+term.length;
    }
    if(windows.length>=8)break;
  }
  return (windows.length?windows.join('\n…\n'):text.slice(0,4200)).slice(0,9000);
}
function researchPercentChange(values,periods){
  if(values.length<2)return null;
  const end=values[values.length-1],start=values[Math.max(0,values.length-1-periods)];
  return Number.isFinite(start)&&start!==0?+(((end-start)/start)*100).toFixed(2):null;
}
function researchQuantile(values,q){
  if(!values.length)return null;
  const sorted=[...values].sort((a,b)=>a-b),position=(sorted.length-1)*q,base=Math.floor(position),rest=position-base;
  return +(sorted[base]+((sorted[base+1]-sorted[base])*rest||0)).toFixed(4);
}
function researchRsi(values,period=14){
  if(values.length<period+1)return null;
  const slice=values.slice(-(period+1));let gain=0,loss=0;
  for(let i=1;i<slice.length;i++){const change=slice[i]-slice[i-1];if(change>=0)gain+=change;else loss-=change}
  if(loss===0)return 100;
  const rs=(gain/period)/(loss/period);
  return +(100-(100/(1+rs))).toFixed(1);
}
function researchMarketSnapshot(data,resolvedSymbol){
  const result=data?.chart?.result?.[0],meta=result?.meta||{},quotes=result?.indicators?.quote?.[0]?.close||[],timestamps=result?.timestamp||[];
  const points=[];
  for(let i=0;i<quotes.length;i++){const value=Number(quotes[i]);if(Number.isFinite(value))points.push({value,date:timestamps[i]?new Date(timestamps[i]*1000).toISOString():''})}
  const values=points.map(point=>point.value),recent=values.slice(-26),latest=values[values.length-1];
  return {
    symbol:resolvedSymbol,
    currency:String(meta.currency||''),
    exchange:String(meta.fullExchangeName||meta.exchangeName||''),
    price:Number.isFinite(Number(latest))?+Number(latest).toFixed(4):null,
    previous_close:Number.isFinite(Number(meta.chartPreviousClose))?+Number(meta.chartPreviousClose).toFixed(4):null,
    market_cap:Number.isFinite(Number(meta.marketCap))?Number(meta.marketCap):null,
    fifty_two_week_high:Number.isFinite(Number(meta.fiftyTwoWeekHigh))?Number(meta.fiftyTwoWeekHigh):null,
    fifty_two_week_low:Number.isFinite(Number(meta.fiftyTwoWeekLow))?Number(meta.fiftyTwoWeekLow):null,
    four_week_change_pct:researchPercentChange(values,4),
    thirteen_week_change_pct:researchPercentChange(values,13),
    twenty_six_week_change_pct:researchPercentChange(values,26),
    one_year_change_pct:researchPercentChange(values,52),
    recent_support:researchQuantile(recent,.2),
    recent_resistance:researchQuantile(recent,.8),
    rsi_14_week:researchRsi(values,14),
    price_as_of:points[points.length-1]?.date||''
  };
}
async function fetchYahooResearchNews(symbol){
  const response=await fetch('https://query1.finance.yahoo.com/v1/finance/search?q='+encodeURIComponent(symbol)+'&quotesCount=1&newsCount=10',{
    headers:{accept:'application/json','user-agent':'Mozilla/5.0 Dayframe/1.0'},
    cf:{cacheEverything:true,cacheTtl:300}
  });
  if(!response.ok)return [];
  const text=await readResearchBody(response,900000);
  let data;try{data=JSON.parse(text)}catch(e){return []}
  const rows=Array.isArray(data?.news)?data.news:[];
  return rows.slice(0,10).map(item=>({
    id:'N'+String(item.uuid||crypto.randomUUID()).slice(0,24),
    type:'news',
    title:String(item.title||'').slice(0,260),
    publisher:String(item.publisher||'Yahoo Finance').slice(0,100),
    published_at:Number(item.providerPublishTime)?new Date(Number(item.providerPublishTime)*1000).toISOString():'',
    url:researchHttpsUrl(item.link),
    related_tickers:Array.isArray(item.relatedTickers)?item.relatedTickers.slice(0,8):[]
  })).filter(item=>item.title&&item.url);
}
async function fetchSecTickerRecord(symbol){
  const ticker=String(symbol||'').toUpperCase().replace(/^\^/,'').split(/[.\-]/)[0];
  if(!/^[A-Z0-9]{1,10}$/.test(ticker))return null;
  const response=await fetch('https://www.sec.gov/files/company_tickers.json',{headers:STOCK_RESEARCH_SEC_HEADERS,cf:{cacheEverything:true,cacheTtl:86400}});
  if(!response.ok)return null;
  const text=await readResearchBody(response,1500000);
  let data;try{data=JSON.parse(text)}catch(e){return null}
  const row=Object.values(data||{}).find(item=>String(item?.ticker||'').toUpperCase()===ticker);
  return row?{ticker,company_name:String(row.title||ticker),cik:Number(row.cik_str)||0}:null;
}
function secFilingUrl(cik,accession,primaryDocument){
  const compact=String(accession||'').replace(/-/g,''),document=String(primaryDocument||'').replace(/^\/+/,'');
  return cik&&compact&&document?'https://www.sec.gov/Archives/edgar/data/'+Number(cik)+'/'+compact+'/'+document:'';
}
async function fetchSecSubmissions(record){
  if(!record?.cik)return {filings:[],company_name:record?.company_name||''};
  const cik=String(record.cik).padStart(10,'0');
  const response=await fetch('https://data.sec.gov/submissions/CIK'+cik+'.json',{headers:STOCK_RESEARCH_SEC_HEADERS,cf:{cacheEverything:true,cacheTtl:300}});
  if(!response.ok)return {filings:[],company_name:record.company_name};
  const text=await readResearchBody(response,3000000);
  let data;try{data=JSON.parse(text)}catch(e){return {filings:[],company_name:record.company_name}}
  const recent=data?.filings?.recent||{},forms=recent.form||[],filings=[];
  for(let i=0;i<forms.length&&filings.length<12;i++){
    const form=String(forms[i]||'').toUpperCase();if(!STOCK_RESEARCH_FORMS.has(form))continue;
    const accession=String(recent.accessionNumber?.[i]||''),primary=String(recent.primaryDocument?.[i]||''),url=secFilingUrl(record.cik,accession,primary);
    if(!url)continue;
    filings.push({
      id:'F'+accession.replace(/-/g,''),
      type:'filing',
      form,
      title:form+' filing',
      publisher:'SEC EDGAR',
      published_at:String(recent.filingDate?.[i]||''),
      report_date:String(recent.reportDate?.[i]||''),
      accession,
      url
    });
  }
  return {filings,company_name:String(data?.name||record.company_name||record.ticker)};
}
async function fetchFilingEvidence(filings){
  const priority=[
    filings[0],
    filings.find(item=>/^(10-K|10-Q|20-F|40-F)$/.test(String(item.form||''))),
    filings.find(item=>/^(S-1|S-3|424B2|424B3|424B5)$/.test(String(item.form||''))),
    filings.find(item=>/^(8-K|6-K)$/.test(String(item.form||'')))
  ].filter(Boolean);
  const selected=[...priority,...filings].filter((item,index,array)=>array.findIndex(other=>other.url===item.url)===index).slice(0,4);
  const settled=await Promise.allSettled(selected.map(async filing=>{
    let filingHeaders={...STOCK_RESEARCH_SEC_HEADERS,accept:'text/html,*/*;q=0.5'};
    try{if(!new URL(filing.url).hostname.endsWith('sec.gov'))filingHeaders={...STOCK_RESEARCH_NASDAQ_HEADERS,accept:'text/html,*/*;q=0.5'}}catch(e){}
    const response=await fetch(filing.url,{headers:filingHeaders,cf:{cacheEverything:true,cacheTtl:3600}});
    if(!response.ok)return {...filing,evidence:''};
    const body=await readResearchBody(response,900000);
    return {...filing,evidence:researchEvidenceWindows(body)};
  }));
  return settled.map((result,index)=>result.status==='fulfilled'?result.value:{...selected[index],evidence:''});
}
async function fetchSecConcept(cik,definition){
  const cikText=String(cik).padStart(10,'0'),choices=definition.tags||[];
  for(const choice of choices){
    const namespace=choice.namespace||'us-gaap',tag=choice.tag;
    let response;
    try{response=await fetch('https://data.sec.gov/api/xbrl/companyconcept/CIK'+cikText+'/'+namespace+'/'+tag+'.json',{headers:STOCK_RESEARCH_SEC_HEADERS,cf:{cacheEverything:true,cacheTtl:900}})}catch(e){continue}
    if(!response.ok)continue;
    let data;try{data=JSON.parse(await readResearchBody(response,750000))}catch(e){continue}
    const rows=[];
    for(const [unit,entries] of Object.entries(data?.units||{})){
      for(const entry of (Array.isArray(entries)?entries:[])){
        if(!['10-K','10-Q','20-F','40-F','6-K'].includes(String(entry?.form||'')))continue;
        const value=Number(entry?.val);if(!Number.isFinite(value))continue;
        rows.push({...entry,unit,value});
      }
    }
    rows.sort((a,b)=>String(b.filed||'').localeCompare(String(a.filed||''))||String(b.end||'').localeCompare(String(a.end||'')));
    const latest=rows.find(row=>row.frame)||rows[0];
    if(latest)return {
      label:definition.label,
      value:latest.value,
      unit:String(latest.unit||''),
      period_start:String(latest.start||''),
      period_end:String(latest.end||''),
      filed:String(latest.filed||''),
      form:String(latest.form||''),
      accession:String(latest.accn||''),
      taxonomy:namespace,
      tag
    };
  }
  return null;
}
async function fetchSecFinancialFacts(cik){
  if(!cik)return [];
  const definitions=[
    {label:'Revenue',tags:[{tag:'RevenueFromContractWithCustomerExcludingAssessedTax'},{tag:'Revenues'},{tag:'SalesRevenueNet'}]},
    {label:'Gross profit',tags:[{tag:'GrossProfit'}]},
    {label:'Operating income',tags:[{tag:'OperatingIncomeLoss'}]},
    {label:'Net income',tags:[{tag:'NetIncomeLoss'}]},
    {label:'Cash and equivalents',tags:[{tag:'CashAndCashEquivalentsAtCarryingValue'}]},
    {label:'Stockholders equity',tags:[{tag:'StockholdersEquity'}]},
    {label:'Total liabilities',tags:[{tag:'Liabilities'}]},
    {label:'Shares outstanding',tags:[{namespace:'dei',tag:'EntityCommonStockSharesOutstanding'}]}
  ];
  const settled=await Promise.allSettled(definitions.map(definition=>fetchSecConcept(cik,definition)));
  return settled.filter(result=>result.status==='fulfilled'&&result.value).map(result=>result.value);
}
const STOCK_RESEARCH_NASDAQ_HEADERS={
  'user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Dayframe/1.0',
  accept:'application/json, text/plain, */*',
  origin:'https://www.nasdaq.com',
  referer:'https://www.nasdaq.com/'
};
function researchIsoDate(value){
  const text=String(value||'').trim();if(!text)return '';
  const match=text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(match)return match[3]+'-'+match[1].padStart(2,'0')+'-'+match[2].padStart(2,'0');
  const date=new Date(text);return Number.isNaN(date.getTime())?'':date.toISOString().slice(0,10);
}
function nasdaqFinancialRows(data,symbol){
  const wanted=new Set(['Total Revenue','Gross Profit','Operating Income','Net Income','Cash and Cash Equivalents','Long-Term Debt','Total Liabilities','Stock Holders Equity','Capital Expenditures','Net Cash Flow-Operating','Sale and Purchase of Stock']);
  const tables=['incomeStatementTable','balanceSheetTable','cashFlowTable'],rows=[];
  for(const tableName of tables){
    const table=data?.[tableName]||{},period=researchIsoDate(table?.headers?.value2);
    for(const row of (Array.isArray(table.rows)?table.rows:[])){
      const label=String(row?.value1||'').trim(),reported=String(row?.value2||'').trim();
      if(!wanted.has(label)||!reported||reported==='--')continue;
      rows.push({
        label,
        reported_value:reported,
        unit:'USD thousands as displayed by Nasdaq',
        period_start:'',
        period_end:period,
        filed:'',
        form:'Annual financial table',
        accession:'',
        taxonomy:'Nasdaq',
        tag:tableName,
        source_url:'https://www.nasdaq.com/market-activity/stocks/'+encodeURIComponent(String(symbol||'').toLowerCase())+'/financials'
      });
    }
  }
  return rows;
}
function nasdaqFilingRows(data){
  const rows=Array.isArray(data?.rows)?data.rows:[],filings=[];
  for(let i=0;i<rows.length&&filings.length<14;i++){
    const row=rows[i]||{},form=String(row.formType||'').toUpperCase();
    if(!STOCK_RESEARCH_FORMS.has(form))continue;
    const url=researchHttpsUrl(row?.view?.htmlLink||row?.view?.pdfLink);
    if(!url)continue;
    filings.push({
      id:'F-NASDAQ-'+i+'-'+form.replace(/\s+/g,''),
      type:'filing',
      form,
      title:form+' filing',
      publisher:'SEC filing via Nasdaq',
      published_at:researchIsoDate(row.filed),
      report_date:researchIsoDate(row.period),
      accession:'',
      url
    });
  }
  return filings;
}
async function fetchNasdaqResearch(symbol){
  const ticker=String(symbol||'').toUpperCase().replace(/^\^/,'').split(/[.]/)[0];
  if(!/^[A-Z0-9-]{1,12}$/.test(ticker))return {company_name:'',filings:[],financials:[],sources:[]};
  const base='https://api.nasdaq.com/api/company/'+encodeURIComponent(ticker);
  const [filingResult,financialResult]=await Promise.allSettled([
    fetch(base+'/sec-filings?limit=50',{headers:STOCK_RESEARCH_NASDAQ_HEADERS,cf:{cacheEverything:true,cacheTtl:300}}),
    fetch(base+'/financials?frequency=1',{headers:STOCK_RESEARCH_NASDAQ_HEADERS,cf:{cacheEverything:true,cacheTtl:900}})
  ]);
  let filingData=null,financialData=null;
  if(filingResult.status==='fulfilled'&&filingResult.value.ok){
    try{filingData=JSON.parse(await readResearchBody(filingResult.value,1200000))?.data||null}catch(e){}
  }
  if(financialResult.status==='fulfilled'&&financialResult.value.ok){
    try{financialData=JSON.parse(await readResearchBody(financialResult.value,1200000))?.data||null}catch(e){}
  }
  const rawFilings=nasdaqFilingRows(filingData),filings=rawFilings.length?await fetchFilingEvidence(rawFilings):[];
  const financials=nasdaqFinancialRows(financialData,ticker);
  const companyName=String(rawFilings[0]?.company_name||filingData?.rows?.[0]?.companyName||'').trim();
  const financialUrl='https://www.nasdaq.com/market-activity/stocks/'+encodeURIComponent(ticker.toLowerCase())+'/financials';
  return {
    company_name:companyName,
    filings,
    financials,
    sources:financials.length?[{id:'S-NASDAQ-FIN',type:'financials',title:ticker+' annual financials',publisher:'Nasdaq',published_at:financials[0]?.period_end||'',url:financialUrl}]:[]
  };
}

async function getStockResearch(url){
  const prefix='/api/investing/research/',requested=marketTickerFromPath(url.pathname,prefix);
  if(!requested)return json({error:'Enter a valid market ticker.'},400);
  const search=String(url.searchParams.get('search')||'').trim().slice(0,120);
  let marketData,resolvedSymbol=requested,lastError;
  try{marketData=await fetchYahooChartData(requested,'1y','1wk')}catch(error){lastError=error}
  if(!marketData&&search){
    const resolved=await resolveYahooSymbol(search);
    if(resolved){try{marketData=await fetchYahooChartData(resolved,'1y','1wk');resolvedSymbol=resolved}catch(error){lastError=error}}
  }
  const [secRecordResult,newsResult,nasdaqResult]=await Promise.allSettled([
    fetchSecTickerRecord(resolvedSymbol),
    fetchYahooResearchNews(resolvedSymbol),
    fetchNasdaqResearch(resolvedSymbol)
  ]);
  const secRecord=secRecordResult.status==='fulfilled'?secRecordResult.value:null;
  const news=newsResult.status==='fulfilled'?newsResult.value:[];
  const nasdaq=nasdaqResult.status==='fulfilled'?nasdaqResult.value:{company_name:'',filings:[],financials:[],sources:[]};
  let companyName=secRecord?.company_name||nasdaq.company_name||search||requested,filings=nasdaq.filings||[],financials=nasdaq.financials||[];
  if(secRecord){
    const submissions=await fetchSecSubmissions(secRecord);
    companyName=submissions.company_name||companyName;
    const [filingResult,factsResult]=await Promise.allSettled([
      fetchFilingEvidence(submissions.filings),
      fetchSecFinancialFacts(secRecord.cik)
    ]);
    const secFilings=filingResult.status==='fulfilled'?filingResult.value:submissions.filings.slice(0,3);
    const secFacts=factsResult.status==='fulfilled'?factsResult.value:[];
    if(secFilings.length)filings=secFilings;
    if(secFacts.length)financials=secFacts;
  }
  const market=marketData?researchMarketSnapshot(marketData,resolvedSymbol):null;
  const secCompanyUrl=secRecord?.cik?'https://www.sec.gov/edgar/browse/?CIK='+String(secRecord.cik).padStart(10,'0')+'&owner=exclude&action=getcompany':'';
  if(secCompanyUrl)financials=financials.map(item=>item.source_url?item:{...item,source_url:secCompanyUrl});
  const sources=[
    ...(secCompanyUrl?[{id:'S-SEC',type:'regulator',title:companyName+' filings',publisher:'SEC EDGAR',published_at:'',url:secCompanyUrl}]:[]),
    ...(nasdaq.sources||[]),
    ...filings.map(({evidence,...filing})=>filing),
    ...news,
    ...(market?[{id:'S-MARKET',type:'market',title:resolvedSymbol+' market data',publisher:'Yahoo Finance',published_at:market.price_as_of,url:'https://finance.yahoo.com/quote/'+encodeURIComponent(resolvedSymbol)}]:[])
  ].filter(source=>source.url);
  if(!market&&!filings.length&&!news.length){
    console.warn(JSON.stringify({event:'stock_research_unavailable',symbol:requested,status:lastError?.status||0}));
    return json({error:'Current research sources are unavailable for this listing.'},lastError?.status===404?404:502);
  }
  return json({
    requested_symbol:requested,
    resolved_symbol:resolvedSymbol,
    company_name:companyName,
    captured_at:new Date(Math.floor(Date.now()/300000)*300000).toISOString(),
    market,
    financials,
    filings,
    news,
    sources:sources.slice(0,24),
    source_note:'Market data and news are provided by Yahoo Finance. US filing links and annual financial tables are provided by SEC EDGAR when available, with Nasdaq and QuoteMedia as a fallback.'
  },200,{'cache-control':'public, max-age=60, s-maxage=300'});
}

async function getMarketVix(){
  try{
    const data=await fetchYahooChartData('^VIX','1mo','1d');
    const result=data.chart.result[0],closes=result?.indicators?.quote?.[0]?.close||[];
    const latest=[...closes].reverse().find(v=>Number.isFinite(Number(v)));
    if(!Number.isFinite(Number(latest)))throw new Error('No VIX price.');
    return json({vix:+Number(latest).toFixed(2),source:'Yahoo Finance'},200,{'cache-control':'public, max-age=60, s-maxage=300'});
  }catch(e){return json({error:'Market mood data is unavailable.'},502)}
}


export default {
  async fetch(request, env) {
    const url=new URL(request.url);
    try{
      if(url.pathname==='/api/money/status')return json({configured:isConfigured(env),environment:bankMode(env),credentials_match_environment:credentialsMatchEnvironment(env),api_version:'v1',build:'bank-cards-v6-20260820',return_origin:bankReturnOrigin(env)});
      if(url.pathname==='/api/money/connect'&&request.method==='POST')return startConnect(request,env);
      if(url.pathname==='/api/money/callback'&&request.method==='GET')return handleCallback(request,env);
      if(url.pathname==='/api/money/data'&&request.method==='GET')return getMoneyData(request,env);
      if(url.pathname.startsWith('/api/money/connections/')&&request.method==='DELETE')return disconnectBank(request,env,url.pathname.split('/').pop());
      if(url.pathname==='/api/investing/t212/status'&&request.method==='GET')return getT212Status(request,env);
      if(url.pathname==='/api/investing/t212/connect'&&request.method==='POST')return connectT212(request,env);
      if(url.pathname==='/api/investing/t212/data'&&request.method==='GET')return getT212Data(request,env);
      if(url.pathname==='/api/investing/t212/pies'&&request.method==='GET')return getT212Pies(request,env);
      if(url.pathname==='/api/investing/t212/connection'&&request.method==='DELETE')return disconnectT212(request,env);
      if(url.pathname==='/api/ai/groq'&&request.method==='POST')return proxySharedGroq(request);
      if(url.pathname.startsWith('/api/investing/research/')&&request.method==='GET')return getStockResearch(url);
      if((url.pathname.startsWith('/api/investing/prices/')||url.pathname.startsWith('/api/market/chart/'))&&request.method==='GET')return getMarketChart(url);
      if(url.pathname==='/api/vix'&&request.method==='GET')return getMarketVix();
      if(url.pathname==='/api/bible/kjv')return request.method==='GET'?getKJVChapter(url):json({error:'Method not allowed'},405,{allow:'GET'});
      if(url.pathname==='/api/bible/licensed')return request.method==='GET'?getLicensedBibleChapter(url,env):json({error:'Method not allowed'},405,{allow:'GET'});
      if(url.pathname==='/api/driving/theory-data'&&(request.method==='GET'||request.method==='POST'))return theoryData(request);
      if(url.pathname==='/api/driving/theory'&&request.method==='GET')return proxyTheoryTracker(request,env);
      if(url.pathname.startsWith('/api/'))return json({error:'Not found'},404);
      return env.ASSETS.fetch(request);
    }catch(err){console.error('Dayframe API error',err);return json({error:'Something went wrong on the secure Dayframe service.'},500)}
  }
};
function isConfigured(env){return !!(String(env.TRUELAYER_CLIENT_ID||'').trim()&&String(env.TRUELAYER_CLIENT_SECRET||'').trim()&&String(env.TRUELAYER_RETURN_URI||'').trim())}
function bankMode(env){const mode=String(env.TRUELAYER_ENV||'sandbox').trim().toLowerCase();return mode==='live'||mode==='production'?'live':'sandbox'}
function isSandbox(env){return bankMode(env)==='sandbox'}
function credentialsMatchEnvironment(env){const id=String(env.TRUELAYER_CLIENT_ID||'').trim().toLowerCase();return !!id&&(isSandbox(env)?id.startsWith('sandbox-'):!id.startsWith('sandbox-'))}
function authBase(env){return isSandbox(env)?'https://auth.truelayer-sandbox.com':'https://auth.truelayer.com'}
function apiBase(env){return isSandbox(env)?'https://api.truelayer-sandbox.com':'https://api.truelayer.com'}
function bankReturnOrigin(env){try{return new URL(String(env.TRUELAYER_RETURN_URI||'').trim()).origin}catch(e){return ''}}
function bankRequestOrigin(request){
  const supplied=String(request.headers.get('origin')||'').trim();
  if(supplied){try{return new URL(supplied).origin}catch(e){}}
  try{return new URL(request.url).origin}catch(e){return ''}
}
function bankContinueUrl(env){
  const origin=bankReturnOrigin(env);if(!origin)return '';
  const target=new URL('/',origin);target.searchParams.set('bank_start','1');return target.toString();
}
function json(data,status=200,headers={}){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}})}
function cookieValue(request,name){const raw=request.headers.get('cookie')||'';const hit=raw.split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='));return hit?decodeURIComponent(hit.slice(name.length+1)):''}
function clearCookie(name){return `${name}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`}
function bankStateCookie(value){return `${STATE_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=1800; HttpOnly; Secure; SameSite=Lax`}
function bankErrorReason(value,status=0){
  const code=String(value||'').trim().toLowerCase();
  if(['access_denied','consent_denied','user_cancelled','cancelled'].includes(code))return 'bank_declined';
  if(['invalid_grant','expired_code','code_expired'].includes(code))return 'login_expired';
  if(['invalid_client','unauthorized_client','invalid_redirect_uri','redirect_uri_mismatch'].includes(code))return 'setup_problem';
  if(status>=500||['temporarily_unavailable','server_error','provider_error','connector_error','connector_overload'].includes(code))return 'bank_unavailable';
  return code?'bank_error':'unknown_error';
}
function bankCallbackRedirect(url,status,reason=''){
  const target=new URL('/',url.origin);
  target.searchParams.set('bank',status);
  if(reason)target.searchParams.set('bank_reason',reason);
  const headers=new Headers({location:target.toString(),'cache-control':'no-store'});
  headers.append('set-cookie',clearCookie(STATE_COOKIE));
  return new Response(null,{status:302,headers});
}
function b64u(bytes){let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function unb64u(s){s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';const raw=atob(s);return Uint8Array.from(raw,c=>c.charCodeAt(0))}
async function aesKey(env){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(env.TRUELAYER_CLIENT_SECRET));return crypto.subtle.importKey('raw',digest,{name:'AES-GCM'},false,['encrypt','decrypt'])}
async function encryptBlob(env,obj){const iv=crypto.getRandomValues(new Uint8Array(12));const cipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await aesKey(env),new TextEncoder().encode(JSON.stringify(obj))));const out=new Uint8Array(iv.length+cipher.length);out.set(iv);out.set(cipher,iv.length);return b64u(out)}
async function decryptBlob(env,s){try{const all=unb64u(s),iv=all.slice(0,12),cipher=all.slice(12);const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv},await aesKey(env),cipher);return JSON.parse(new TextDecoder().decode(plain))}catch(e){return null}}
function bearer(request){const h=request.headers.get('authorization')||'';return h.toLowerCase().startsWith('bearer ')?h.slice(7).trim():''}
async function verifyUser(request){const token=bearer(request);if(!token)return null;const r=await fetch(SUPABASE_URL+'/auth/v1/user',{headers:{apikey:SUPABASE_ANON,authorization:'Bearer '+token}});if(!r.ok)return null;const user=await r.json().catch(()=>null);return user?.id?{user,token}:null}
async function sbRest(path,jwt,opts={}){const headers={apikey:SUPABASE_ANON,authorization:'Bearer '+jwt,'content-type':'application/json',...(opts.headers||{})};return fetch(SUPABASE_URL+'/rest/v1/'+path,{...opts,headers})}
function validateProfile(name,email){name=String(name||'').trim();email=String(email||'').trim();if(name.length<2||name.length>100)return 'Enter your name.';if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return 'Enter a valid email address.';return ''}

async function proxySharedGroq(request){
  const auth=await verifyUser(request);
  if(!auth)return json({error:'Sign in to use Dayframe AI.'},401);
  const contentType=String(request.headers.get('content-type')||'').toLowerCase();
  if(!contentType.includes('application/json'))return json({error:'Invalid AI request.'},415);
  const suppliedLength=Number(request.headers.get('content-length')||0);
  if(suppliedLength>60000)return json({error:'AI request is too large.'},413);
  let upstream;
  try{
    upstream=await fetch(SUPABASE_URL+'/functions/v1/dayframe-groq',{
      method:'POST',
      headers:{
        apikey:SUPABASE_ANON,
        authorization:'Bearer '+auth.token,
        'content-type':'application/json',
        accept:'application/json'
      },
      body:request.body
    });
  }catch(e){
    return json({error:'Dayframe AI could not be reached.'},502);
  }
  const headers=new Headers({
    'content-type':upstream.headers.get('content-type')||'application/json; charset=utf-8',
    'cache-control':'no-store'
  });
  for(const name of ['retry-after','x-ratelimit-limit-requests','x-ratelimit-limit-tokens','x-ratelimit-remaining-requests','x-ratelimit-remaining-tokens','x-ratelimit-reset-requests','x-ratelimit-reset-tokens']){
    const value=upstream.headers.get(name);if(value)headers.set(name,value);
  }
  return new Response(upstream.body,{status:upstream.status,headers});
}

async function theoryData(request){
  const auth=await verifyUser(request);
  if(!auth)return json({error:'Sign in to use your theory tracker.'},401);
  const rowPath='dayframe_theory_data?user_id=eq.'+encodeURIComponent(auth.user.id);
  if(request.method==='GET'){
    const result=await sbRest(rowPath+'&select=tracker_data&limit=1',auth.token,{method:'GET'});
    if(!result.ok)return json({error:'Your theory progress could not be loaded.'},502);
    const rows=await result.json().catch(()=>[]);
    return json(rows?.[0]?.tracker_data||{});
  }

  const suppliedLength=Number(request.headers.get('content-length')||0);
  if(suppliedLength>550000)return json({error:'Theory progress is too large.'},413);
  const trackerData=await request.json().catch(()=>null);
  if(!trackerData||typeof trackerData!=='object'||Array.isArray(trackerData))return json({error:'Invalid theory progress.'},400);
  const serialized=JSON.stringify(trackerData);
  if(serialized.length>500000)return json({error:'Theory progress is too large.'},413);
  const result=await sbRest('dayframe_theory_data?on_conflict=user_id&select=user_id',auth.token,{
    method:'POST',
    headers:{Prefer:'resolution=merge-duplicates,return=representation'},
    body:JSON.stringify({user_id:auth.user.id,tracker_data:trackerData,updated_at:new Date().toISOString()})
  });
  const rows=await result.json().catch(()=>[]);
  if(!result.ok||!Array.isArray(rows)||!rows[0]?.user_id)return json({error:'Your theory progress could not be saved.'},502);
  return json({ok:true});
}

function t212Environment(value){return String(value||'live').trim().toLowerCase()==='demo'?'demo':'live'}
function t212ApiBase(environment){return t212Environment(environment)==='demo'?'https://demo.trading212.com/api/v0':'https://live.trading212.com/api/v0'}
function validT212Part(value){const text=String(value||'').trim();return text.length>=8&&text.length<=600&&!/[\u0000-\u001f\u007f]/.test(text)}
async function t212CredentialKey(env){
  const root=String(env.DAYFRAME_CREDENTIAL_KEY||env.TRUELAYER_CLIENT_SECRET||'').trim();
  if(!root)return null;
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('dayframe:t212:credentials:v1:'+root));
  return crypto.subtle.importKey('raw',digest,{name:'AES-GCM'},false,['encrypt','decrypt']);
}
const T212_CREDENTIAL_PREFIX='t212v1.';
async function encryptT212Credentials(env,value){
  const key=await t212CredentialKey(env);if(!key)return '';
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const plain=new TextEncoder().encode(JSON.stringify(value));
  const cipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,plain));
  const out=new Uint8Array(iv.length+cipher.length);out.set(iv);out.set(cipher,iv.length);
  return T212_CREDENTIAL_PREFIX+b64u(out);
}
async function decryptT212Credentials(env,value){
  try{
    const text=String(value||'');if(!text.startsWith(T212_CREDENTIAL_PREFIX))return null;
    const key=await t212CredentialKey(env);if(!key)return null;
    const all=unb64u(text.slice(T212_CREDENTIAL_PREFIX.length)),iv=all.slice(0,12),cipher=all.slice(12);
    const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,cipher);
    const parsed=JSON.parse(new TextDecoder().decode(plain));
    return validT212Part(parsed?.api_key)&&validT212Part(parsed?.api_secret)?{api_key:String(parsed.api_key),api_secret:String(parsed.api_secret),environment:t212Environment(parsed.environment)}:null;
  }catch(e){return null}
}
function t212BasicAuth(credentials){return 'Basic '+btoa(credentials.api_key+':'+credentials.api_secret)}
async function t212Request(credentials,path){
  const response=await fetch(t212ApiBase(credentials.environment)+path,{method:'GET',headers:{accept:'application/json',authorization:t212BasicAuth(credentials)}});
  const data=await response.json().catch(()=>null);
  return {response,data};
}
function t212Failure(result){
  const status=result?.response?.status||0;
  if(status===401)return json({code:'T212_AUTH_REJECTED',error:'Trading 212 did not accept that API Key and API Secret pair.'},422);
  if(status===403)return json({code:'T212_PERMISSIONS',error:'Enable the Account data and Portfolio read permissions for this Trading 212 key.'},422);
  if(status===429)return json({code:'T212_RATE_LIMIT',error:'Trading 212 is rate-limiting this account. Wait a moment and try again.'},429);
  return json({code:'T212_UNAVAILABLE',error:'Trading 212 could not be reached just now.'},502);
}
async function loadT212Credentials(auth,env){
  const rr=await sbRest('user_settings?select=t212_key&id=eq.'+encodeURIComponent(auth.user.id),auth.token,{method:'GET'});
  if(!rr.ok)return {error:'Dayframe could not load the saved Trading 212 connection.'};
  const rows=await rr.json().catch(()=>[]),stored=rows?.[0]?.t212_key||'';
  if(!stored)return {connected:false,migration_required:false};
  const credentials=await decryptT212Credentials(env,stored);
  if(!credentials)return {connected:false,migration_required:true};
  return {connected:true,credentials};
}
async function saveT212Credentials(auth,env,credentials){
  const encrypted=await encryptT212Credentials(env,credentials);
  if(!encrypted)return {ok:false,error:'Secure credential storage is not configured.'};
  const rr=await sbRest('user_settings?on_conflict=id&select=id',auth.token,{
    method:'POST',
    headers:{Prefer:'resolution=merge-duplicates,return=representation'},
    body:JSON.stringify({id:auth.user.id,t212_key:encrypted,updated_at:new Date().toISOString()})
  });
  const rows=await rr.json().catch(()=>[]);
  return rr.ok&&Array.isArray(rows)&&!!rows[0]?.id?{ok:true}:{ok:false,error:'Dayframe could not save the Trading 212 connection.'};
}
function canonicalT212Ticker(value,name='',isin=''){
  const raw=String(value||'').trim();
  const base=raw
    .replace(/\.(?:DE|US|GB|L|ST)$/i,'')
    .replace(/_(?:US|CA|GB|SGD|HKD|EUR|AUD|SG|DE)?_?EQ$/i,'')
    .replace(/_(?:US|CA|GB|SGD|HKD|EUR|AUD|SG|DE)$/i,'');
  if(String(isin||'').trim().toUpperCase()==='SE0003917798'||/sivers\s+semiconductors/i.test(String(name||''))||/^2DG[A-Z]*$/i.test(base))return 'SIVE';
  return base.toUpperCase();
}
function normaliseT212Position(position){
  const instrument=position?.instrument||{},wallet=position?.walletImpact||{};
  const quantity=Number(position?.quantity)||0;
  const averagePrice=Number(position?.averagePricePaid??position?.averagePrice)||0;
  const currentPrice=Number(position?.currentPrice)||0;
  const totalCost=Number(wallet?.totalCost);
  const currentValue=Number(wallet?.currentValue);
  const fallbackCost=averagePrice*quantity;
  const fallbackValue=currentPrice*quantity;
  const safeCost=Number.isFinite(totalCost)?totalCost:fallbackCost;
  const safeValue=Number.isFinite(currentValue)?currentValue:fallbackValue;
  const providerPpl=Number(wallet?.unrealizedProfitLoss??position?.ppl);
  const rawTicker=String(instrument?.ticker||position?.ticker||'');
  const providerName=String(instrument?.name||instrument?.shortName||instrument?.ticker||position?.ticker||'Holding');
  const isin=String(instrument?.isin||position?.isin||'');
  const ticker=canonicalT212Ticker(rawTicker,providerName,isin);
  return {
    ticker,
    name:ticker==='SIVE'?'Sivers Semiconductors AB':providerName,
    isin,
    quantity,
    averagePrice,
    currentPrice,
    totalCost:safeCost,
    currentValue:safeValue,
    ppl:Number.isFinite(providerPpl)?providerPpl:safeValue-safeCost,
    currency:String(wallet?.currency||'')
  };
}
function normaliseT212Summary(summary){
  const cash=summary?.cash||{},investments=summary?.investments||{};
  return {
    currency:String(summary?.currency||'GBP'),
    total:Number(summary?.totalValue??summary?.total)||0,
    free:Number(cash?.availableToTrade??cash?.free)||0,
    inPies:Number(cash?.inPies)||0,
    reservedForOrders:Number(cash?.reservedForOrders)||0,
    investmentValue:Number(investments?.currentValue)||0,
    totalCost:Number(investments?.totalCost)||0,
    ppl:Number(investments?.unrealizedProfitLoss)||0
  };
}
async function fetchT212Snapshot(credentials){
  const [summaryResult,positionsResult]=await Promise.all([
    t212Request(credentials,'/equity/account/summary'),
    t212Request(credentials,'/equity/positions')
  ]);
  if(!summaryResult.response.ok)return {failure:t212Failure(summaryResult)};
  if(!positionsResult.response.ok)return {failure:t212Failure(positionsResult)};
  if(!Array.isArray(positionsResult.data)||!summaryResult.data||typeof summaryResult.data!=='object')return {failure:json({code:'T212_RESPONSE_CHANGED',error:'Trading 212 returned an unexpected response.'},502)};
  return {data:{summary:normaliseT212Summary(summaryResult.data),positions:positionsResult.data.map(normaliseT212Position),environment:credentials.environment,refreshed_at:new Date().toISOString()}};
}
async function getT212Status(request,env){
  const auth=await verifyUser(request);if(!auth)return json({error:'Log in to view this connection.'},401);
  const stored=await loadT212Credentials(auth,env);
  if(stored.error)return json({error:stored.error},502);
  return json({connected:stored.connected,environment:stored.credentials?.environment||null,migration_required:stored.migration_required||false});
}
async function connectT212(request,env){
  const auth=await verifyUser(request);if(!auth)return json({error:'Log in to connect Trading 212.'},401);
  const body=await request.json().catch(()=>({}));
  const api_key=String(body.api_key||'').trim(),api_secret=String(body.api_secret||'').trim(),environment=t212Environment(body.environment);
  if(!validT212Part(api_key))return json({error:'Enter the complete Trading 212 API Key.'},400);
  if(!validT212Part(api_secret))return json({error:'Enter the complete Trading 212 API Secret Key.'},400);
  const credentials={api_key,api_secret,environment};
  const snapshot=await fetchT212Snapshot(credentials);
  if(snapshot.failure)return snapshot.failure;
  const saved=await saveT212Credentials(auth,env,credentials);
  if(!saved.ok)return json({error:saved.error},502);
  const verified=await loadT212Credentials(auth,env);
  if(verified.error||!verified.connected)return json({error:'The connection was verified but could not be restored from your account.',code:'T212_SAVE_VERIFY_FAILED'},502);
  return json({connected:true,...snapshot.data});
}
async function getT212Data(request,env){
  const auth=await verifyUser(request);if(!auth)return json({error:'Log in to refresh Trading 212.'},401);
  const stored=await loadT212Credentials(auth,env);
  if(stored.error)return json({error:stored.error},502);
  if(!stored.connected)return json({code:'T212_NOT_CONNECTED',error:'Connect Trading 212 with both credentials first.'},404);
  const snapshot=await fetchT212Snapshot(stored.credentials);
  return snapshot.failure||json(snapshot.data);
}
async function getT212Pies(request,env){
  const auth=await verifyUser(request);if(!auth)return json({error:'Log in to load Trading 212 pies.'},401);
  const stored=await loadT212Credentials(auth,env);
  if(stored.error)return json({error:stored.error},502);
  if(!stored.connected)return json({code:'T212_NOT_CONNECTED',error:'Connect Trading 212 first.'},404);
  const result=await t212Request(stored.credentials,'/equity/pies');
  if(!result.response.ok)return t212Failure(result);
  return json(Array.isArray(result.data)?result.data:[]);
}
async function disconnectT212(request,env){
  const auth=await verifyUser(request);if(!auth)return json({error:'Log in to disconnect Trading 212.'},401);
  const rr=await sbRest('user_settings?id=eq.'+encodeURIComponent(auth.user.id),auth.token,{
    method:'PATCH',
    headers:{Prefer:'return=minimal'},
    body:JSON.stringify({t212_key:null,updated_at:new Date().toISOString()})
  });
  if(!rr.ok)return json({error:'Dayframe could not remove the Trading 212 connection.'},502);
  return json({ok:true});
}


async function proxyTheoryTracker(request,env){
  const source=new URL('/driving/theory.html',request.url).toString();
  let upstream=null,used=source;
  try{
    const r=await env.ASSETS.fetch(new Request(source,{
      method:'GET',
      headers:{
        'accept':'text/html,application/xhtml+xml',
        'user-agent':request.headers.get('user-agent')||'Mozilla/5.0'
      }
    }));
    if(r.ok)upstream=r;
  }catch(e){}
  if(!upstream){
    return new Response(`<!doctype html><html><head><meta charset="utf-8"><style>
      body{font-family:Inter,Arial,sans-serif;background:#f7f8fc;color:#344054;padding:40px}
      .box{max-width:620px;margin:80px auto;background:white;border:1px solid #e7eaf1;border-radius:18px;padding:28px;box-shadow:0 10px 30px rgba(20,30,50,.06)}
      a{display:inline-block;margin-top:14px;padding:10px 14px;border-radius:10px;background:#ef7464;color:white;text-decoration:none;font-weight:700}
    </style></head><body><div class="box"><h2>Learning to Drive</h2><p>The theory tracker could not load inside Dayframe just now.</p><a href="/driving/theory.html" target="_blank">Open Theory Tracker</a></div></body></html>`,
      {status:502,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}}
    );
  }

  let body=await upstream.text();

  // Strip obvious legacy profile labels from initial HTML markup before render.
  body=body
    .replace(/>\s*Celine\s*</gi,'><')
    .replace(/>\s*Valentina\s*</gi,'><')
    .replace(/<option([^>]*)>\s*Celine\s*<\/option>/gi,'')
    .replace(/<option([^>]*)>\s*Valentina\s*<\/option>/gi,'');

  // Never render Dayframe inside Dayframe. If the upstream is the wrong app,
  // show a clear error instead of a recursive nested dashboard.
  if(/<title>\s*Dayframe\s*<\/title>/i.test(body) || /class=["'][^"']*dayframe-public/i.test(body)){
    return new Response(`<!doctype html><html><head><meta charset="utf-8"><style>
      body{font-family:Inter,Arial,sans-serif;background:#f7f8fc;color:#344054;padding:40px}
      .box{max-width:640px;margin:90px auto;background:white;border:1px solid #e7eaf1;border-radius:18px;padding:28px;box-shadow:0 10px 30px rgba(20,30,50,.06)}
      a{display:inline-block;margin-top:14px;padding:10px 14px;border-radius:10px;background:#ef7464;color:white;text-decoration:none;font-weight:700}
    </style></head><body><div class="box"><h2>Theory Tracker source is pointing to Dayframe</h2><p>The tracker deployment needs to be corrected before it can be shown here.</p><a href="/driving/theory.html" target="_blank">Open the tracker deployment</a></div></body></html>`,
      {status:502,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}}
    );
  }

  // Remove frame-blocking CSP meta tags from the proxied HTML.
  body=body.replace(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*>/gi,'');

  // Make all relative resources resolve back to the tracker project.
  if(!/<base\s/i.test(body)){
    const base=`<base href="${used}">`;
    if(/<head[^>]*>/i.test(body)) body=body.replace(/<head([^>]*)>/i,`<head$1>${base}`);
    else body=base+body;
  }

  // Dayframe SSO bridge. This proxied document runs on investly.pages.dev,
  // so it shares the Dayframe browser session. It also passes the same
  // Supabase bearer token to tracker API calls automatically.
  const bridge=`<script>
  (() => {
    function getDayframeSession(){
      try{return JSON.parse(localStorage.getItem('dayframe_session')||'{}')}catch(e){return {}}
    }
    let df=getDayframeSession();

    // Expose one authenticated identity to the embedded app.
    window.__DAYFRAME_EMBED__=true;
    window.__DAYFRAME_SESSION__=df;
    window.__DAYFRAME_USER__=df.user||null;

    // Useful aliases for an older standalone tracker that expected its own
    // browser identity. These contain no password.
    if(df?.user?.id){
      try{
        sessionStorage.setItem('dayframe_theory_user_id',df.user.id);
        sessionStorage.setItem('dayframe_theory_email',df.user.email||df.email||'');
        localStorage.setItem('theory_user_id',df.user.id);
        localStorage.setItem('theory_user_email',df.user.email||df.email||'');
      }catch(e){}
    }

    // Add the existing Dayframe identity to tracker API requests and replace
    // any old Celine/Valentina profile parameter with this user's Supabase ID.
    const nativeFetch=window.fetch.bind(window);
    window.fetch=async function(input,init={}){
      try{
        let reqUrl=typeof input==='string'?input:(input?.url||'');
        const isTrackerApi=/theory-tracker-api|workers\.dev|\/api\//i.test(reqUrl);
        if(isTrackerApi && df?.access_token && df?.user?.id){
          const profileId='dayframe:'+df.user.id;
          const headers=new Headers(init.headers||(typeof input!=='string'&&input?.headers)||{});
          if(!headers.has('Authorization'))headers.set('Authorization','Bearer '+df.access_token);
          headers.set('X-Dayframe-User-Id',df.user.id);
          if(df?.user?.email)headers.set('X-Dayframe-Email',df.user.email);

          // Namespace common query-string profile fields.
          try{
            const u=new URL(reqUrl,location.href);
            ['user','userId','user_id','profile','profileId','profile_id','learner','learnerId','learner_id'].forEach(k=>{
              if(u.searchParams.has(k))u.searchParams.set(k,profileId);
            });
            reqUrl=u.toString();
            if(typeof input==='string')input=reqUrl;
            else if(input instanceof Request)input=new Request(reqUrl,input);
          }catch(_){}

          // Namespace common JSON body profile fields.
          if(typeof init.body==='string' && /application\/json/i.test(headers.get('content-type')||'')){
            try{
              const body=JSON.parse(init.body);
              const keys=['user','userId','user_id','profile','profileId','profile_id','learner','learnerId','learner_id'];
              keys.forEach(k=>{if(Object.prototype.hasOwnProperty.call(body,k))body[k]=profileId});
              init={...init,body:JSON.stringify(body),headers};
            }catch(_){init={...init,headers}}
          }else{
            init={...init,headers};
          }
        }
      }catch(e){}
      return nativeFetch(input,init);
    };

    // Force any web-component shadow roots open so the legacy profile
    // selector can be removed even if the tracker renders it there.
    try{
      const nativeAttachShadow=Element.prototype.attachShadow;
      Element.prototype.attachShadow=function(init){
        return nativeAttachShadow.call(this,{...init,mode:'open'});
      };
    }catch(e){}

    function removeLegacyTheoryAccountUI(){
      function scrubRoot(root){
        if(!root)return;
        try{
          const candidates=[...root.querySelectorAll?.('button,[role="button"],[onclick],a,div,section')||[]];
          const profileCards=candidates.filter(el=>{
            const txt=(el.innerText||el.textContent||'').trim().toLowerCase().replace(/\s+/g,' ');
            if(!/^(ci|vi)\b/.test(txt)||!txt.includes('streak'))return false;
            const r=el.getBoundingClientRect();
            return r.width>=60&&r.width<=560&&r.height>=20&&r.height<=150;
          });
          profileCards.forEach(el=>el.remove());

          [...root.querySelectorAll?.('div,section,main')||[]].forEach(el=>{
            const txt=(el.innerText||el.textContent||'').trim().toLowerCase().replace(/\s+/g,' ');
            const streaks=(txt.match(/streak/g)||[]).length;
            if(txt.length<600&&streaks>=2&&/\bci\b/.test(txt)&&/\bvi\b/.test(txt))el.remove();
          });

          [...root.querySelectorAll?.('div,p,span,h1,h2,h3,h4,label')||[]].forEach(el=>{
            const txt=(el.innerText||el.textContent||'').trim().toLowerCase().replace(/\s+/g,' ');
            if(txt.length<240&&(
              txt.includes('select your name')||txt.includes('choose your name')||
              txt.includes('select a name')||txt.includes('choose a profile')
            ))el.remove();
          });

          [...root.querySelectorAll?.('*')||[]].forEach(el=>{if(el.shadowRoot)scrubRoot(el.shadowRoot)});
        }catch(e){}
      }
      scrubRoot(document);
      document.documentElement.setAttribute('data-dayframe-user-id',df?.user?.id||'');
    }

    function applySingleSignOn(){
      df=getDayframeSession();
      window.__DAYFRAME_SESSION__=df;
      window.__DAYFRAME_USER__=df.user||null;
      if(!df?.access_token||!df?.user?.id)return;

      // Give the old tracker one stable profile identifier derived from
      // the logged-in Dayframe/Supabase account.
      const profileId='dayframe:'+df.user.id;
      try{
        [
          'theory_user_id','theory_profile_id','currentUser','current_user',
          'activeUser','active_user','selectedUser','selected_user',
          'selectedProfile','selected_profile','selectedName','selected_name',
          'currentProfile','current_profile','student','learner'
        ].forEach(k=>localStorage.setItem(k,profileId));
      }catch(e){}

      // Remove only standalone authentication overlays. The actual tracker
      // content remains untouched.
      const selectors=[
        '#login-screen','#loginScreen','.login-screen','.loginScreen',
        '#auth-screen','#authScreen','.auth-screen','.authScreen',
        '.signin-screen','.sign-in-screen','.login-overlay','.auth-overlay',
        '[data-page="login"]','[data-view="login"]'
      ];
      selectors.forEach(sel=>document.querySelectorAll(sel).forEach(el=>{
        el.style.setProperty('display','none','important');
      }));
      removeLegacyTheoryAccountUI();

      document.documentElement.setAttribute('data-dayframe-authenticated','true');
      window.dispatchEvent(new CustomEvent('dayframe-authenticated',{detail:{
        user:df.user,access_token:df.access_token
      }}));
    }

    window.addEventListener('message',e=>{
      if(e.origin!==location.origin||e.data?.type!=='DAYFRAME_AUTH')return;
      const cur=getDayframeSession();
      if(e.data.access_token&&e.data.user_id){
        cur.access_token=e.data.access_token;
        cur.user={...(cur.user||{}),id:e.data.user_id,email:e.data.email||cur.user?.email};
        cur.email=e.data.email||cur.email;
        cur.name=e.data.name||cur.name;
        try{localStorage.setItem('dayframe_session',JSON.stringify(cur))}catch(_){}
      }
      applySingleSignOn();
    });

    const observer=new MutationObserver(()=>{
      applySingleSignOn();
      removeLegacyTheoryAccountUI();
    });
    window.addEventListener('DOMContentLoaded',()=>{
      applySingleSignOn();
      removeLegacyTheoryAccountUI();
      observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
      try{parent.postMessage({type:'DAYFRAME_THEORY_READY'},location.origin)}catch(e){}
    });
    setTimeout(applySingleSignOn,50);
    setTimeout(()=>{applySingleSignOn();removeLegacyTheoryAccountUI()},500);
    setTimeout(()=>{applySingleSignOn();removeLegacyTheoryAccountUI()},1500);
    setInterval(removeLegacyTheoryAccountUI,900);
  })();
  <\/script>`;

  if(/<head[^>]*>/i.test(body)){
    body=body.replace(/<head([^>]*)>/i,`<head$1>${bridge}`);
  }else{
    body=bridge+body;
  }

  const headers=new Headers();
  headers.set('content-type','text/html; charset=utf-8');
  headers.set('cache-control','no-store, max-age=0');
  headers.set('x-content-type-options','nosniff');
  return new Response(body,{status:200,headers});
}

async function startConnect(request,env){
  if(!isConfigured(env))return json({code:'OPEN_BANKING_NOT_CONFIGURED',error:'Bank connection setup is not complete yet.'},503);
  const auth=await verifyUser(request);if(!auth)return json({error:'Log in to connect a bank.'},401);
  if(!credentialsMatchEnvironment(env))return json({code:'OPEN_BANKING_ENVIRONMENT_MISMATCH',error:'The bank connection is using credentials for a different TrueLayer environment.'},503);
  const returnOrigin=bankReturnOrigin(env),requestOrigin=bankRequestOrigin(request);
  if(returnOrigin&&requestOrigin&&returnOrigin!==requestOrigin){
    console.error(JSON.stringify({event:'bank_connect_origin_mismatch',request_origin:requestOrigin,return_origin:returnOrigin}));
    return json({code:'OPEN_BANKING_ORIGIN_MISMATCH',error:'Continue in the secure Dayframe website to connect your bank.',continue_url:bankContinueUrl(env)},409);
  }

  const state=crypto.randomUUID();
  const authUrl=new URL(authBase(env)+'/');
  authUrl.searchParams.set('response_type','code');
  authUrl.searchParams.set('client_id',String(env.TRUELAYER_CLIENT_ID).trim());
  authUrl.searchParams.set('redirect_uri',String(env.TRUELAYER_RETURN_URI).trim());
  authUrl.searchParams.set('scope','info accounts cards balance transactions offline_access');
  authUrl.searchParams.set('state',state);
  if(isSandbox(env))authUrl.searchParams.set('providers','uk-cs-mock');

  const statePayload=await encryptBlob(env,{state,user_id:auth.user.id,sb_token:auth.token,created_at:Date.now()});
  return json({auth_url:authUrl.toString()},200,{'set-cookie':bankStateCookie(statePayload)});
}

async function handleCallback(request,env){
  const url=new URL(request.url),code=url.searchParams.get('code'),state=url.searchParams.get('state'),error=url.searchParams.get('error');
  if(error||!code){
    const reason=error?bankErrorReason(error):'missing_code';
    console.error(JSON.stringify({event:'bank_callback_failed',reason}));
    return bankCallbackRedirect(url,'error',reason);
  }

  const stateCookie=cookieValue(request,STATE_COOKIE);
  if(!stateCookie){
    console.error(JSON.stringify({event:'bank_callback_failed',reason:'return_session_expired'}));
    return bankCallbackRedirect(url,'error','return_session_expired');
  }
  const pending=await decryptBlob(env,stateCookie);
  if(!pending){
    console.error(JSON.stringify({event:'bank_callback_failed',reason:'return_session_invalid'}));
    return bankCallbackRedirect(url,'error','return_session_expired');
  }
  if(!state||pending.state!==state){
    console.error(JSON.stringify({event:'bank_callback_failed',reason:'state_mismatch'}));
    return bankCallbackRedirect(url,'error','return_session_expired');
  }
  if(Date.now()-Number(pending.created_at||0)>1800000){
    console.error(JSON.stringify({event:'bank_callback_failed',reason:'state_expired'}));
    return bankCallbackRedirect(url,'error','return_session_expired');
  }

  const form=new URLSearchParams({grant_type:'authorization_code',client_id:env.TRUELAYER_CLIENT_ID,client_secret:env.TRUELAYER_CLIENT_SECRET,redirect_uri:env.TRUELAYER_RETURN_URI,code});
  let tokenResponse;
  try{
    tokenResponse=await fetch(authBase(env)+'/connect/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded','accept':'application/json'},body:form});
  }catch(e){
    console.error(JSON.stringify({event:'bank_callback_failed',reason:'token_network_error'}));
    return bankCallbackRedirect(url,'error','bank_unavailable');
  }
  const tokenText=await tokenResponse.text();let tokenData={};try{tokenData=tokenText?JSON.parse(tokenText):{}}catch(e){}
  if(!tokenResponse.ok||!tokenData.access_token){
    const upstreamCode=String(tokenData.error||tokenData.error_code||tokenData.code||'');
    const reason=bankErrorReason(upstreamCode,tokenResponse.status);
    console.error(JSON.stringify({event:'bank_callback_failed',reason,upstream_status:tokenResponse.status,upstream_code:upstreamCode.slice(0,80)}));
    return bankCallbackRedirect(url,'error',reason);
  }

  const tokens={access_token:tokenData.access_token,refresh_token:tokenData.refresh_token||'',expires_at:Date.now()+(Number(tokenData.expires_in)||3600)*1000,scope:tokenData.scope||''};
  const encrypted_tokens=await encryptBlob(env,tokens);
  const insert=await sbRest('dayframe_bank_connections_v1',pending.sb_token,{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({user_id:pending.user_id,encrypted_tokens,status:'active'})});
  if(!insert.ok){
    console.error(JSON.stringify({event:'bank_callback_failed',reason:'save_failed',upstream_status:insert.status}));
    return bankCallbackRedirect(url,'error','save_failed');
  }
  return bankCallbackRedirect(url,'connected');
}

async function refreshTokens(env,t){if(!t?.refresh_token)return null;const form=new URLSearchParams({grant_type:'refresh_token',client_id:env.TRUELAYER_CLIENT_ID,client_secret:env.TRUELAYER_CLIENT_SECRET,refresh_token:t.refresh_token});const r=await fetch(authBase(env)+'/connect/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded','accept':'application/json'},body:form});const d=await r.json().catch(()=>({}));if(!r.ok||!d.access_token)return null;return {access_token:d.access_token,refresh_token:d.refresh_token||t.refresh_token,expires_at:Date.now()+(Number(d.expires_in)||3600)*1000,scope:d.scope||t.scope||''}}
async function apiGet(env,token,path,request){const ip=request.headers.get('CF-Connecting-IP')||'';return fetch(apiBase(env)+path,{headers:{authorization:'Bearer '+token,'accept':'application/json',...(ip?{'X-PSU-IP':ip}:{})}})}
function category(t){const s=String((t.transaction_category||''))+' '+String(t.transaction_classification||[])+' '+String(t.merchant_name||'')+' '+String(t.description||'');const x=s.toLowerCase();if(/save the change|savings?|investment|wealth|broker|trading 212|vanguard|fidelity/.test(x))return 'Savings & Investments';if(/transfer|bank transfer|faster payment|standing order|^\s*(mr|mrs|ms|miss)\s+[a-z]/.test(x))return 'Transfers';if(/petrol|fuel|shell|esso|bp\b|uber|train|rail|transport|travel|bus|tram|parking/.test(x))return 'Transport';if(/tesco|sainsbury|morrisons(?! petrol)|aldi|lidl|asda|waitrose|grocery|supermarket/.test(x))return 'Groceries';if(/insurance|utility|bill|phone|mobile|broadband|internet|council tax|energy|water/.test(x))return 'Bills & Utilities';if(/netflix|spotify|cinema|entertain|disney|prime video/.test(x))return 'Entertainment';if(/restaurant|cafe|coffee|deliveroo|just eat|uber eats|takeaway|food/.test(x))return 'Eating Out';if(/boots|pharmacy|dentist|medical|health/.test(x))return 'Health';if(/beauty|salon|hair|nails|sephora|space nk/.test(x))return 'Beauty';if(/amazon|shopping|retail|tails\.com|argos|ikea|zara|asos/.test(x))return 'Shopping';return 'Other'}
function direction(t){const type=String(t.transaction_type||'').toUpperCase();if(type==='CREDIT'||Number(t.amount)>0)return 'income';return 'expense'}
function cardDirection(t){return Number(t.amount)<0?'income':'expense'}
function optionalNumber(value){const n=Number(value);return value==null||!Number.isFinite(n)?null:n}
function tokenHasScope(tokens,scope){
  const raw=Array.isArray(tokens?.scope)?tokens.scope.join(' '):String(tokens?.scope||'').trim();
  return !raw||raw.split(/\s+/).includes(scope);
}
async function collectAccount(env,token,a,request,connectionId){
  const id=a.account_id;let balance=0,available=null,tx=[];
  const [br,tr]=await Promise.all([
    apiGet(env,token,'/data/v1/accounts/'+encodeURIComponent(id)+'/balance',request),
    apiGet(env,token,'/data/v1/accounts/'+encodeURIComponent(id)+'/transactions',request)
  ]);
  if(br.ok){const b=await br.json().catch(()=>({})),x=b.results?.[0]||{};balance=Number(x.current)||0;available=optionalNumber(x.available)}
  if(tr.ok){const d=await tr.json().catch(()=>({}));tx=(d.results||[]).map(t=>({id:t.transaction_id||crypto.randomUUID(),connection_id:connectionId,account_id:id,account_name:a.display_name||'Bank account',timestamp:t.timestamp||'',description:t.description||'',merchant:t.merchant_name||'',amount:Math.abs(Number(t.amount)||0),direction:direction(t),category:category(t),currency:t.currency||a.currency||'GBP'}))}
  return {account:{connection_id:connectionId,id,type:String(a.account_type||'').includes('SAVINGS')?'savings':'bank',name:a.display_name||'Bank account',provider_id:a.provider?.provider_id||'',provider_name:a.provider?.display_name||'Connected bank',currency:a.currency||'GBP',balance,available,last4:a.account_number?.number?String(a.account_number.number).slice(-4):''},transactions:tx}
}
async function collectCard(env,token,card,request,connectionId){
  const id=card.account_id;let balance=0,available=null,creditLimit=null,paymentDue=null,paymentDueDate='',lastStatementBalance=null,lastStatementDate='',tx=[];
  const [br,tr]=await Promise.all([
    apiGet(env,token,'/data/v1/cards/'+encodeURIComponent(id)+'/balance',request),
    apiGet(env,token,'/data/v1/cards/'+encodeURIComponent(id)+'/transactions',request)
  ]);
  if(br.ok){
    const b=await br.json().catch(()=>({})),x=b.results?.[0]||{};
    balance=Number(x.current)||0;
    available=optionalNumber(x.available);
    creditLimit=optionalNumber(x.credit_limit);
    paymentDue=optionalNumber(x.payment_due);
    paymentDueDate=String(x.payment_due_date||'');
    lastStatementBalance=optionalNumber(x.last_statement_balance);
    lastStatementDate=String(x.last_statement_date||'');
  }
  if(tr.ok){
    const d=await tr.json().catch(()=>({}));
    tx=(d.results||[]).map(t=>({id:t.transaction_id||crypto.randomUUID(),connection_id:connectionId,account_id:id,account_name:card.display_name||'Credit card',timestamp:t.timestamp||'',description:t.description||'',merchant:t.merchant_name||'',amount:Math.abs(Number(t.amount)||0),direction:cardDirection(t),category:category(t),currency:t.currency||card.currency||'GBP'}));
  }
  return {account:{connection_id:connectionId,id,type:'credit-card',name:card.display_name||'Credit card',provider_id:card.provider?.provider_id||'',provider_name:card.provider?.display_name||'Connected card',currency:card.currency||'GBP',balance,available,credit_limit:creditLimit,payment_due:paymentDue,payment_due_date:paymentDueDate,last_statement_balance:lastStatementBalance,last_statement_date:lastStatementDate,last4:String(card.partial_card_number||''),card_network:String(card.card_network||''),name_on_card:String(card.name_on_card||'')},transactions:tx}
}

async function getMoneyData(request,env){
  if(!isConfigured(env))return json({configured:false,accounts:[],transactions:[],connections:[]});
  const auth=await verifyUser(request);if(!auth)return json({error:'Log in again to view connected accounts.'},401);
  const rr=await sbRest('dayframe_bank_connections_v1?user_id=eq.'+encodeURIComponent(auth.user.id)+'&select=id,encrypted_tokens,status,created_at&order=created_at.desc',auth.token,{method:'GET'});
  if(!rr.ok)return json({error:'Could not load your bank connections.'},502);
  const rows=await rr.json().catch(()=>[]),accounts=[],transactions=[],connections=[],seenAccounts=new Set(),seenCards=new Set();
  for(const row of rows){
    let t=await decryptBlob(env,row.encrypted_tokens);if(!t){connections.push({id:row.id,status:'error'});continue}
    let changed=false;
    if(!t.access_token||Date.now()>Number(t.expires_at||0)-120000){const n=await refreshTokens(env,t);if(!n){connections.push({id:row.id,status:'reauth_required'});continue}t=n;changed=true}
    const loadFeeds=()=>Promise.all([
      apiGet(env,t.access_token,'/data/v1/accounts',request),
      tokenHasScope(t,'cards')?apiGet(env,t.access_token,'/data/v1/cards',request):Promise.resolve(null)
    ]);
    let [ar,cr]=await loadFeeds();
    if((ar.status===401||cr?.status===401)&&t.refresh_token){
      const n=await refreshTokens(env,t);
      if(n){t=n;changed=true;[ar,cr]=await loadFeeds()}
    }
    if(changed){
      const enc=await encryptBlob(env,t);
      await sbRest('dayframe_bank_connections_v1?id=eq.'+encodeURIComponent(row.id),auth.token,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({encrypted_tokens:enc,status:'active',updated_at:new Date().toISOString()})});
    }
    let usable=false;
    if(ar.ok){
      usable=true;
      const ad=await ar.json().catch(()=>({}));
      for(const a of (ad.results||[])){
        const key=String(a.account_id||'');if(!key||seenAccounts.has(key))continue;seenAccounts.add(key);
        const x=await collectAccount(env,t.access_token,a,request,row.id);accounts.push(x.account);transactions.push(...x.transactions);
      }
    }
    if(cr?.ok){
      usable=true;
      const cd=await cr.json().catch(()=>({}));
      for(const card of (cd.results||[])){
        const key=String(card.account_id||'');if(!key||seenCards.has(key))continue;seenCards.add(key);
        const x=await collectCard(env,t.access_token,card,request,row.id);accounts.push(x.account);transactions.push(...x.transactions);
      }
    }
    if(!usable){
      const statuses=[ar.status,cr?.status].filter(Boolean),needsAuth=statuses.some(x=>x===401||x===403);
      connections.push({id:row.id,status:needsAuth?'reauth_required':'error',created_at:row.created_at});
      continue;
    }
    const cardAccess=!tokenHasScope(t,'cards')?'reconnect_required':cr?.ok?'active':(cr?.status===401||cr?.status===403?'reauth_required':'error');
    connections.push({id:row.id,status:'active',card_access:cardAccess,created_at:row.created_at});
  }
  const accountMap=new Map();for(const a of accounts)accountMap.set(a.type+'|'+a.id,a);
  const txMap=new Map();for(const t of transactions)txMap.set(t.account_id+'|'+t.id,t);
  const finalAccounts=[...accountMap.values()],finalTx=[...txMap.values()].sort((a,b)=>String(b.timestamp).localeCompare(String(a.timestamp)));
  return json({configured:true,api_version:'v1',accounts:finalAccounts,transactions:finalTx,connections,refreshed_at:new Date().toISOString()});
}

async function disconnectBank(request,env,id){const auth=await verifyUser(request);if(!auth)return json({error:'Log in again.'},401);const r=await sbRest('dayframe_bank_connections_v1?id=eq.'+encodeURIComponent(id)+'&user_id=eq.'+encodeURIComponent(auth.user.id),auth.token,{method:'DELETE'});if(!r.ok)return json({error:'Could not remove bank connection.'},502);return json({ok:true})}
