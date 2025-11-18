const express = require('express');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'retool-proxy-fetcher' });
});

app.get('/fetch', async (req, res) => {
  try {
    const { url, ip, port, protocol = 'http' } = req.query;
    
    if (!url || !ip || !port) {
      return res.status(400).send('Missing required parameters: url, ip, port');
    }

    const proxyUrl = `${protocol}://${ip}:${port}`;
    const agent = new HttpsProxyAgent(proxyUrl);

    const response = await axios.get(url, {
      httpAgent: agent,
      httpsAgent: agent,
      timeout: 15000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      validateStatus: () => true
    });

    let content = response.data;
    if (typeof content === 'string') {
      content = content.replace(/<script[\s\S]*?<\/script>/gi, '');
      content = content.replace(/href="\/([^"]*)"/g, `href="${url.replace(/\/$/, '')}/$1"`);
      content = content.replace(/src="\/([^"]*)"/g, `src="${url.replace(/\/$/, '')}/$1"`);
    }

    res.set('Content-Type', response.headers['content-type'] || 'text/html; charset=utf-8');
    res.status(response.status).send(content);

  } catch (error) {
    console.error('Proxy fetch error:', error.message);
    res.status(500).send(`Proxy error: ${error.message}`);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy service running on port ${PORT}`);
});
