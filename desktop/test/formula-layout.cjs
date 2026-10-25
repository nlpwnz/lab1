const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const root=path.resolve(__dirname,'..');
(async()=>{
  const server=http.createServer(async(req,res)=>{try{const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!file.startsWith(root+path.sep))throw Error();res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.statusCode=404;res.end();}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true});
  try{
    const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/content/tau/index.html`);
    await fs.mkdir(path.join(root,'test-results'),{recursive:true});
    const result=[];
    for(const width of [1100,700,550]){
      await page.setViewportSize({width,height:950});
      for(const kind of ['units','graph']){
        await page.evaluate(kind=>showBasics(kind),kind);await page.evaluate(()=>document.fonts.ready);
        const card=page.locator('.b-card').filter({has:page.getByRole('heading',{name:'От картинки к формуле'})});
        await card.screenshot({path:path.join(root,`test-results/formula-${kind}-${width}.png`)});
        const measure=await card.evaluate(el=>{const math=el.querySelector('.katex-html')||el.querySelector('math'),box=math.getBoundingClientRect();return {height:box.height,width:box.width,cardWidth:el.clientWidth,katex:!!el.querySelector('.katex-html')};});
        result.push({kind,viewport:width,...measure});
        if(!process.env.RECORD_BASELINE){assert.ok(measure.katex,'Formula must use the bundled KaTeX renderer');assert.ok(measure.height>10&&measure.height<120,`Collapsed or stacked formula: ${JSON.stringify(measure)}`);assert.ok(measure.width<measure.cardWidth,'Formula spills outside its card');}
      }
    }
    if(!process.env.RECORD_BASELINE){
      let chapterFormulas=0,slideFormulas=0;
      for(let i=0;i<26;i++){
        await page.evaluate(i=>lesson(i),i);
        const info=await page.locator('#article').evaluate(el=>({errors:el.querySelectorAll('.katex-error').length,count:el.querySelectorAll('.katex-html').length,bad:[...el.querySelectorAll('.katex-html')].filter(m=>m.getBoundingClientRect().height>180).length,overflow:document.documentElement.scrollWidth>innerWidth+1}));
        assert.equal(info.errors+info.bad,0,`Chapter ${i+1}`);assert.equal(info.overflow,false,`Chapter ${i+1}: page overflow`);chapterFormulas+=info.count;
      }
      await page.evaluate(()=>{lesson(0);toggleSlides();});
      for(let i=0;i<78;i++){
        await page.evaluate(i=>{current=Math.floor(i/3);slideIndex=i%3;renderSlide();},i);
        assert.equal(await page.locator('.katex-error').count(),0);assert.equal(await page.locator('.katex-html').evaluateAll(nodes=>nodes.filter(n=>n.getBoundingClientRect().height>180).length),0,`Slide ${i+1}: stacked formula`);slideFormulas+=await page.locator('.katex-html').count();
      }
      await page.evaluate(()=>{slideMode=false;});
      for(const id of ['derivative','integral','poles','process']){await page.evaluate(id=>showVisual(id),id);assert.equal(await page.locator('.katex-error').count(),0);}
      assert.deepEqual(errors,[]);console.log('PASS:',chapterFormulas,'chapter formulas;',slideFormulas,'slide formulas; 4 visual modules; new formula geometry at 3 widths.');
    }
    console.log(JSON.stringify(result,null,2));
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
