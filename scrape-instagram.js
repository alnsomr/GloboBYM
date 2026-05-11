const { chromium } = require('playwright-chromium');
const fs = require('fs');
const path = require('path');
const https = require('https');

const HANDLE = 'globobym_peru';
const ASSETS_DIR = path.join(__dirname, 'assets');

if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });

function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        file.close();
        return downloadImage(res.headers.location, dest).then(resolve).catch(reject);
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(dest); });
    }).on('error', reject);
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
  });

  const page = await context.newPage();

  console.log(`Accediendo a instagram.com/${HANDLE}...`);

  const data = {
    handle: HANDLE,
    name: '',
    bio: '',
    followers: '',
    following: '',
    posts: '',
    avatar: '',
    verified: false,
    images: [],
  };

  // Interceptar peticiones para capturar datos JSON de la API
  const captured = [];
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('graphql') || url.includes('api/v1/users') || url.includes('?username=')) {
      try {
        const text = await response.text();
        if (text.includes(HANDLE)) captured.push(text);
      } catch {}
    }
  });

  await page.goto(`https://www.instagram.com/${HANDLE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);

  // Intentar extraer datos del DOM
  try {
    // Nombre de perfil
    data.name = await page.$eval('h2', el => el.textContent.trim()).catch(() => '');
    if (!data.name) data.name = await page.$eval('header h1, header h2, [data-testid="user-name"]', el => el.textContent.trim()).catch(() => HANDLE);

    // Bio
    data.bio = await page.$eval('header section > div > span, .-vDIg span, header section span[dir]', el => el.textContent.trim()).catch(() => '');

    // Stats (seguidores, siguiendo, posts)
    const stats = await page.$$eval('header section ul li, header section li', els => els.map(el => el.textContent.trim())).catch(() => []);
    if (stats.length >= 3) {
      data.posts = stats[0];
      data.followers = stats[1];
      data.following = stats[2];
    }

    // Avatar
    const avatarSrc = await page.$eval('header img[data-testid="user-avatar"], header section img, header img', el => el.src).catch(() => '');
    if (avatarSrc && avatarSrc.startsWith('http')) {
      data.avatar = avatarSrc;
    }

    // Verificado
    data.verified = await page.$('svg[aria-label*="erif"], [title*="erif"]').then(el => !!el).catch(() => false);

    // Fotos del grid
    const imgUrls = await page.$$eval('article img, main img[srcset], div[role="button"] img', imgs =>
      imgs.slice(0, 9).map(img => img.src).filter(src => src && src.startsWith('http'))
    ).catch(() => []);
    data.images = [...new Set(imgUrls)].slice(0, 9);

  } catch (e) {
    console.error('Error extrayendo del DOM:', e.message);
  }

  // Intentar extraer de datos JSON capturados
  for (const raw of captured) {
    try {
      const json = JSON.parse(raw);
      const user = json?.data?.user || json?.graphql?.user || json?.user;
      if (user) {
        if (user.full_name) data.name = user.full_name;
        if (user.biography) data.bio = user.biography;
        if (user.edge_followed_by?.count) data.followers = user.edge_followed_by.count.toLocaleString();
        if (user.edge_follow?.count) data.following = user.edge_follow.count.toLocaleString();
        if (user.edge_owner_to_timeline_media?.count) data.posts = user.edge_owner_to_timeline_media.count.toLocaleString();
        if (user.is_verified) data.verified = user.is_verified;
        if (user.profile_pic_url_hd) data.avatar = user.profile_pic_url_hd;
        else if (user.profile_pic_url) data.avatar = user.profile_pic_url;
        const edges = user.edge_owner_to_timeline_media?.edges || [];
        data.images = edges.slice(0, 9).map(e => e.node?.display_url).filter(Boolean);
        break;
      }
    } catch {}
  }

  await browser.close();

  // Descargar avatar
  if (data.avatar) {
    const avatarPath = path.join(ASSETS_DIR, 'avatar.jpg');
    try {
      await downloadImage(data.avatar, avatarPath);
      data.avatarLocal = 'assets/avatar.jpg';
      console.log('Avatar descargado.');
    } catch (e) {
      console.log('No se pudo descargar el avatar:', e.message);
    }
  }

  // Descargar fotos del grid
  const localImages = [];
  for (let i = 0; i < data.images.length; i++) {
    const imgPath = path.join(ASSETS_DIR, `post_${i + 1}.jpg`);
    try {
      await downloadImage(data.images[i], imgPath);
      localImages.push(`assets/post_${i + 1}.jpg`);
      console.log(`Foto ${i + 1} descargada.`);
    } catch (e) {
      console.log(`No se pudo descargar foto ${i + 1}:`, e.message);
    }
  }
  data.localImages = localImages;

  fs.writeFileSync(path.join(__dirname, 'instagram-data.json'), JSON.stringify(data, null, 2));
  console.log('\n=== DATOS EXTRAIDOS ===');
  console.log(JSON.stringify(data, null, 2));
})();
