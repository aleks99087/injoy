// api/prerender.ts

export default async function handler(req, res) {
    const userAgent = req.headers['user-agent'] || '';
    const isBot = /bot|crawl|slurp|spider|telegram|facebook|twitter/i.test(userAgent);
  
    if (!isBot) {
      return res.status(404).send('Only bots allowed here');
    }
  
    const prerenderToken = process.env.PRERENDER_TOKEN;
    const prerenderRes = await fetch(`https://service.prerender.io${req.url}`, {
        headers: new Headers({
          'X-Prerender-Token': prerenderToken || '',
          'User-Agent': userAgent,
        }),
      });      
  
    const html = await prerenderRes.text();
    res.setHeader('Content-Type', 'text/html');
    return res.status(prerenderRes.status).send(html);
  }  