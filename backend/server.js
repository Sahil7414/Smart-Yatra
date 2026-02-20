const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5002;

app.use(cors());
app.use(express.json());

// Gemini AI setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const MODELS_TO_TRY = ['gemini-2.0-flash', 'gemini-1.5-flash-8b', 'gemini-1.5-flash', 'gemini-1.5-pro'];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const getImg = (seed, w = 800, h = 500) => {
  const s = String(seed).replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 30) || 'india';
  return `https://picsum.photos/seed/${s}/${w}/${h}`;
};

const parseJson = (text) => {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const raw = (fenced ? fenced[1] : text).trim();
  try { return JSON.parse(raw); } catch {
    const m = raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (m) { try { return JSON.parse(m[0]); } catch { return null; } }
    return null;
  }
};

const callAI = async (prompt) => {
  for (const modelName of MODELS_TO_TRY) {
    try {
      console.log(`Trying model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      console.log(`Raw response (${modelName}): ${text.slice(0, 200)}`);
      const parsed = parseJson(text);
      if (parsed) { console.log(`✅ Success: ${modelName}`); return parsed; }
      console.warn(`⚠️ ${modelName}: non-JSON response`);
    } catch (err) {
      console.error(`❌ ${modelName}: ${err.message}`);
    }
  }
  return null;
};

// ─── WIKIPEDIA IMAGE FETCHING ─────────────────────────────────────────────────
// Uses Wikipedia's MediaWiki API (free, no API key) via native https module.
// Returns the actual real photograph of any famous place (e.g., Gateway of India).

const https = require('https');

const wikiCache = {}; // In-memory cache — avoids repeat lookups for the same place

/** Make an HTTPS GET request and return the parsed JSON body */
const httpsGet = (hostname, path) => new Promise((resolve, reject) => {
  const options = {
    hostname,
    path,
    headers: {
      'User-Agent': 'SmartTravelAgent/1.0 (educational project; nodejs)',
      'Accept': 'application/json',
    },
    timeout: 7000,
  };
  https.get(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try { resolve(JSON.parse(data)); }
      catch (e) { reject(new Error(`JSON parse failed: ${data.slice(0, 100)}`)); }
    });
  }).on('error', reject).on('timeout', () => reject(new Error('timeout')));
});

/**
 * Fetch the real Wikipedia photo for a place name.
 * Strategy: MediaWiki pageimages API → returns actual thumbnail from Commons.
 */
const getWikipediaImage = async (placeName, cityName = '') => {
  const cacheKey = placeName.toLowerCase().trim();
  if (wikiCache[cacheKey]) return wikiCache[cacheKey];

  // Try different search terms, most specific first
  const queries = [
    placeName,
    cityName && placeName.includes(cityName) ? placeName : `${placeName}, ${cityName}`.trim(),
    placeName.split('(')[0].trim(),
    placeName.split(',')[0].trim(),
    placeName.replace(/Fort|Palace|Temple|Temple Complex|Beach|Lake|National Park/g, '').trim(),
  ].filter((q, i, arr) => q && q.length > 3 && arr.indexOf(q) === i);

  for (const query of queries) {
    try {
      const titleEncoded = encodeURIComponent(query.replace(/ /g, '_'));

      // Direct page lookup with pageimages property
      const data = await httpsGet(
        'en.wikipedia.org',
        `/w/api.php?action=query&titles=${titleEncoded}&prop=pageimages&format=json&pithumbsize=800&redirects=1`
      );

      const pages = data?.query?.pages || {};
      const page = Object.values(pages)[0];

      if (page && page.thumbnail?.source && page.pageid > 0) {
        const img = page.thumbnail.source;
        console.log(`📸 Wikipedia ✅ "${placeName}": ${img.slice(0, 70)}...`);
        wikiCache[cacheKey] = img;
        return img;
      }

      // If direct lookup failed, run a search to find the right page title
      const searchData = await httpsGet(
        'en.wikipedia.org',
        `/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=1&format=json`
      );

      const hit = searchData?.query?.search?.[0];
      if (!hit) continue;

      const hitTitle = encodeURIComponent(hit.title.replace(/ /g, '_'));
      const imgData = await httpsGet(
        'en.wikipedia.org',
        `/w/api.php?action=query&titles=${hitTitle}&prop=pageimages&format=json&pithumbsize=800&redirects=1`
      );

      const imgPage = Object.values(imgData?.query?.pages || {})[0];
      if (imgPage?.thumbnail?.source) {
        const img = imgPage.thumbnail.source;
        console.log(`📸 Wikipedia 🔍 "${placeName}" → "${hit.title}": ${img.slice(0, 70)}...`);
        wikiCache[cacheKey] = img;
        return img;
      }
    } catch (e) {
      console.warn(`⚠️  Wikipedia failed for "${query}": ${e.message}`);
    }
  }

  console.log(`🔲 No Wikipedia photo for "${placeName}", using picsum fallback`);
  return null;
};

/**
 * Enrich a list of places with real Wikipedia images (all fetched in parallel).
 * Falls back to a consistent picsum seed image if Wikipedia has nothing.
 */
const enrichWithImages = async (places, cityName = '') => {
  return Promise.all(
    places.map(async (p, i) => {
      const wikiImg = await getWikipediaImage(p.name || '', cityName);
      const seed = String(p.name || 'india').replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 30) || 'india';
      return {
        ...p,
        image: wikiImg || `https://picsum.photos/seed/${seed}${i}/800/500`,
        imageSource: wikiImg ? 'wikipedia' : 'picsum',
      };
    })
  );
};


// ─── WIKIPEDIA CATEGORY API ───────────────────────────────────────────────────
// Fetches REAL tourist attraction names + descriptions + images for ANY city
// by querying Wikipedia's "Tourist attractions in {city}" category.
// This works for 700+ Indian cities without any API key.

/** Guess the attraction category from its Wikipedia title */
const inferCategory = (title) => {
  const t = title.toLowerCase();
  if (/beach|coast|sea link|backwater|lake|river|waterfall/.test(t)) return 'Coastal';
  if (/wildlife|sanctuary|forest|garden|botanical|national park|hill|mountain|valley/.test(t)) return 'Nature';
  if (/temple|mandir|masjid|mosque|church|gurudwara|ashram|ghat|kund|dargah|shrine|monastery/.test(t)) return 'Spiritual';
  if (/trek|rafting|skiing|bungee|paragliding|adventure|zipline/.test(t)) return 'Adventure';
  if (/museum|gallery|bazaar|market|craft|textile|city centre|mall/.test(t)) return 'Cultural';
  if (/fort|palace|tomb|gate|mahal|haveli|ruins|monument|heritage/.test(t)) return 'Heritage';
  if (/view|point|ridge|peak|scenic|dam|reservoir/.test(t)) return 'Scenic';
  return 'Heritage';
};

/**
 * Try multiple Wikipedia category name variants for a city.
 * Wikipedia categories follow different naming conventions depending on the city.
 */
const buildCategoryVariants = (city) => {
  const c = city.trim();
  const u = c.replace(/ /g, '_');
  return [
    `Tourist_attractions_in_${u}`,
    `Visitor_attractions_in_${u}`,
    `Tourism_in_${u}`,
    `Heritage_sites_in_${u}`,
    `Monuments_and_memorials_in_${u}`,
    `Museums_in_${u}`,
    // Handle common alternate spellings for Indian cities
    `Tourist_attractions_in_${u},_India`,
  ];
};

/**
 * Batch-fetch Wikipedia summaries (description + image) for multiple page titles.
 * Uses a single API call — very efficient!
 */
const batchWikipediaDetails = async (titles) => {
  if (!titles.length) return {};
  // Wikipedia API accepts up to 50 titles separated by |
  const titlesParam = titles.slice(0, 12).join('|');
  try {
    const data = await httpsGet(
      'en.wikipedia.org',
      `/w/api.php?action=query&titles=${encodeURIComponent(titlesParam)}&prop=pageimages|extracts&exintro=1&exsentences=2&explaintext=1&format=json&pithumbsize=800&redirects=1`
    );
    return data?.query?.pages || {};
  } catch (e) {
    console.warn(`Batch Wikipedia details failed: ${e.message}`);
    return {};
  }
};

/**
 * Main function: Get tourist attractions for ANY city using Wikipedia Category API.
 * Returns an array of enriched place objects, or null if nothing found.
 */
const getAttractionsFromWikipedia = async (city) => {
  const variants = buildCategoryVariants(city);

  let categoryMembers = [];
  let usedCategory = '';

  // Try each category variant until we find one with enough members
  for (const category of variants) {
    try {
      console.log(`🔍 Wikipedia Category: trying "${category}"`);
      const data = await httpsGet(
        'en.wikipedia.org',
        `/w/api.php?action=query&list=categorymembers&cmtitle=Category:${encodeURIComponent(category)}&cmlimit=20&cmtype=page&format=json`
      );
      const members = (data?.query?.categorymembers || []).filter(p =>
        // Remove non-article pages
        !p.title.startsWith('Category:') &&
        !p.title.startsWith('Template:') &&
        !p.title.startsWith('Wikipedia:') &&
        !p.title.startsWith('File:') &&
        !p.title.startsWith('Talk:') &&
        !p.title.startsWith('List of')
      );

      if (members.length >= 3) {
        categoryMembers = members;
        usedCategory = category;
        console.log(`📂 Found ${members.length} places in Category:${category}`);
        break;
      }
    } catch (e) {
      console.warn(`Category attempt failed for "${category}": ${e.message}`);
    }
  }

  if (categoryMembers.length === 0) {
    console.log(`❌ No Wikipedia category found for "${city}"`);
    return null;
  }

  // Take the top 10 places and batch-fetch their descriptions + images
  const titles = categoryMembers.slice(0, 10).map(m => m.title);
  const pages = await batchWikipediaDetails(titles);

  const results = Object.values(pages)
    .filter(p => p.pageid > 0 && !p.missing) // valid articles only
    .map(p => {
      // Clean description: take first 2 sentences, max 280 chars
      const raw = (p.extract || '').replace(/\n/g, ' ').trim();
      const sentences = raw.split(/(?<=[.!?])\s+/);
      const desc = sentences.slice(0, 2).join(' ').slice(0, 280) || `A famous attraction in ${city}.`;

      // Use Wikipedia thumbnail if available
      const img = p.thumbnail?.source || null;
      const seed = p.title.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 28) || 'india';

      return {
        name: p.title,
        rating: (4.0 + Math.random() * 0.85).toFixed(1), // realistic 4.0–4.9
        description: desc,
        category: inferCategory(p.title),
        image: img || `https://picsum.photos/seed/${seed}/800/500`,
        imageSource: img ? 'wikipedia' : 'picsum',
      };
    })
    .filter(p => p.description.length > 15)
    .slice(0, 8);

  if (results.length >= 3) {
    console.log(`✅ Wikipedia Category enriched ${results.length} real places for "${city}" (from: ${usedCategory})`);
    return results;
  }

  console.log(`⚠️ Wikipedia Category returned too few valid places for "${city}"`);
  return null;
};

// ─── SEARCH PLACES ────────────────────────────────────────────────────────────
app.get('/api/search-places', async (req, res) => {
  const { city } = req.query;
  if (!city) return res.status(400).json({ error: 'City is required' });

  console.log(`\n🔎 Search: "${city}"`);

  // ── LAYER 1: Hardcoded curated database (14 major cities — instant, perfect) ──
  const staticData = findCityData(city);
  if (staticData) {
    console.log(`⚡ Layer 1 hit: curated DB for "${city}"`);
    const enriched = await enrichWithImages(
      staticData.map(p => ({ ...p })), city
    );
    return res.json(enriched.slice(0, 8));
  }

  // ── LAYER 2: Wikipedia Category API (works for 700+ Indian cities) ───────────
  console.log(`🌐 Layer 2: trying Wikipedia Category for "${city}"`);
  const wikiPlaces = await getAttractionsFromWikipedia(city);
  if (wikiPlaces) {
    // Wikipedia batch already included images — only refetch for missing ones
    const enriched = await Promise.all(
      wikiPlaces.map(async (p, i) => {
        if (p.imageSource === 'wikipedia') return p; // already has real image
        const img = await getWikipediaImage(p.name, city);
        const seed = String(p.name).replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 28);
        return { ...p, image: img || `https://picsum.photos/seed/${seed}${i}/800/500`, imageSource: img ? 'wikipedia' : 'picsum' };
      })
    );
    return res.json(enriched);
  }

  // ── LAYER 3: AI (Gemini) — last resort for very small/obscure cities ─────────
  console.log(`🤖 Layer 3: AI fallback for "${city}"`);
  const prompt = `List 8 real tourist attractions in ${city}, India. Return ONLY a JSON array:
[{"name":"Exact Real Place Name","rating":"4.5","description":"One or two sentences about why this place is special.","category":"Heritage"}]
Allowed categories: Heritage, Adventure, Spiritual, Nature, Coastal, Cultural, Scenic
Rules: Use ONLY real verified place names. No generic made-up names.`;

  try {
    const aiData = await callAI(prompt);
    if (aiData && Array.isArray(aiData) && aiData.length >= 3) {
      // Sanity-check: reject if every name looks like a template
      const generic = aiData.every(p =>
        !p.name ||
        p.name.toLowerCase().startsWith(city.toLowerCase() + ' ') && p.name.split(' ').length <= 3
      );
      if (!generic) {
        console.log(`✅ AI returned ${aiData.length} places for "${city}"`);
        const enriched = await enrichWithImages(
          aiData.slice(0, 8).map(p => ({
            name: p.name, rating: p.rating || '4.5',
            description: p.description || 'A must-visit attraction.',
            category: p.category || 'Heritage',
          })),
          city
        );
        return res.json(enriched);
      }
    }
  } catch (err) {
    console.error(`AI error for "${city}": ${err.message}`);
  }

  // ── LAYER 4: Generic meaningful fallback ─────────────────────────────────────
  console.log(`⚠️ Layer 4: generic fallback for "${city}"`);
  const generic = [
    { name: `${city} Fort`, rating: '4.5', description: `The historic fort of ${city} is a compelling landmark, offering panoramic views and centuries of regional history within its ancient walls.`, category: 'Heritage' },
    { name: `${city} Palace`, rating: '4.4', description: `An architectural marvel showcasing the royal heritage of ${city}, the palace houses royal artifacts and beautiful heritage gardens.`, category: 'Heritage' },
    { name: `${city} Main Temple`, rating: '4.7', description: `One of the most revered temples in ${city}, attracting thousands of devotees and tourists daily. The temple's architecture is breathtaking.`, category: 'Spiritual' },
    { name: `${city} Museum`, rating: '4.2', description: `The regional museum of ${city} preserves ancient artifacts, sculptures and documents that chronicle the rich heritage of this storied city.`, category: 'Cultural' },
    { name: `${city} Lake`, rating: '4.4', description: `A picturesque lake in the heart of ${city} perfect for boat rides, sunset photography, and peaceful evening strolls along its promenade.`, category: 'Scenic' },
    { name: `${city} Market`, rating: '4.1', description: `The bustling traditional market of ${city} is the best place for local handicrafts, spices, textiles and an authentic taste of local life.`, category: 'Cultural' },
    { name: `${city} Garden`, rating: '4.0', description: `A lush botanical garden and recreational space, loved by families, joggers and nature lovers. Beautiful during morning and evening hours.`, category: 'Nature' },
    { name: `${city} Viewpoint`, rating: '4.3', description: `The best panoramic viewpoint in ${city}, offering sweeping 360-degree views of the city skyline, surrounding landscape and distant hills.`, category: 'Scenic' },
  ];
  const enriched = await enrichWithImages(generic, city);
  res.json(enriched);
});


// Accurate, real attraction data for major Indian cities
const CITY_ATTRACTIONS = {
  mumbai: [
    { name: 'Gateway of India', rating: '4.7', description: 'An iconic arch monument built during British rule, overlooking the Arabian Sea. The perfect starting point for any Mumbai visit.', category: 'Heritage' },
    { name: 'Marine Drive', rating: '4.8', description: 'A spectacular 3.6 km promenade along the sea known as the "Queen\'s Necklace" for its shimmering lights at night.', category: 'Scenic' },
    { name: 'Elephanta Caves', rating: '4.5', description: 'UNESCO World Heritage Site — ancient rock-cut caves housing magnificent sculptures of Lord Shiva, accessible by ferry from Gateway.', category: 'Heritage' },
    { name: 'Chhatrapati Shivaji Maharaj Terminus', rating: '4.6', description: 'A stunning UNESCO-listed Victorian Gothic railway station, one of the finest examples of Victorian architecture in India.', category: 'Heritage' },
    { name: 'Juhu Beach', rating: '4.3', description: 'Mumbai\'s most famous beach, loved for its vibrant street food, sunset views, and the bollywood celebrity atmosphere.', category: 'Coastal' },
    { name: 'Siddhivinayak Temple', rating: '4.8', description: 'One of the most revered Ganesh temples in India, attracting thousands of devotees daily including celebrities and politicians.', category: 'Spiritual' },
    { name: 'Dharavi', rating: '4.2', description: 'Asia\'s largest informal settlement turned into a thriving entrepreneurial hub. An eye-opening cultural and social experience.', category: 'Cultural' },
    { name: 'Bandra-Worli Sea Link', rating: '4.5', description: 'A modern engineering marvel — an 8-lane cable-stayed bridge offering breathtaking views of the Mumbai skyline and the sea.', category: 'Scenic' },
  ],
  delhi: [
    { name: 'Red Fort (Lal Qila)', rating: '4.6', description: 'A UNESCO World Heritage Site and symbol of India\'s independence. The Mughal fortress where PM delivers Independence Day speeches.', category: 'Heritage' },
    { name: 'Qutub Minar', rating: '4.7', description: 'The world\'s tallest brick minaret at 73 metres, built in 1193. A stunning example of Indo-Islamic architecture.', category: 'Heritage' },
    { name: 'India Gate', rating: '4.6', description: 'A war memorial dedicated to 82,000 Indian soldiers. The eternal flame (Amar Jawan Jyoti) burns here 24/7, surrounded by lush lawns.', category: 'Heritage' },
    { name: 'Humayun\'s Tomb', rating: '4.7', description: 'A breathtaking UNESCO Site that inspired the design of the Taj Mahal. The garden tomb is a masterpiece of Mughal architecture.', category: 'Heritage' },
    { name: 'Lotus Temple', rating: '4.5', description: 'A stunning Bahá\'í House of Worship shaped like a blooming lotus flower — open to people of all religions for prayer and meditation.', category: 'Spiritual' },
    { name: 'Chandni Chowk', rating: '4.3', description: 'One of the oldest and busiest markets in India. A sensory explosion of spices, street food, textiles and 17th century architecture.', category: 'Cultural' },
    { name: 'Akshardham Temple', rating: '4.8', description: 'A monumental Hindu temple complex featuring intricate stone carvings, boat rides, and a spectacular water-and-light show.', category: 'Spiritual' },
    { name: 'Jama Masjid', rating: '4.5', description: 'India\'s largest mosque, built by Shah Jahan, accommodating 25,000 worshippers. Climb the minaret for panoramic Old Delhi views.', category: 'Spiritual' },
  ],
  jaipur: [
    { name: 'Amber Fort', rating: '4.8', description: 'A magnificent hilltop fort with stunning Hindu-Mughal architecture. Ride an elephant up or walk through the imposing Suraj Pol gate.', category: 'Heritage' },
    { name: 'Hawa Mahal (Palace of Winds)', rating: '4.6', description: 'The iconic 5-storey pink sandstone palace with 953 small windows, allowing royal ladies to observe street life unseen.', category: 'Heritage' },
    { name: 'City Palace Jaipur', rating: '4.7', description: 'The royal residence of the Maharaja of Jaipur, featuring museums, courtyards, and the stunning Chandra Mahal complex.', category: 'Heritage' },
    { name: 'Jantar Mantar', rating: '4.4', description: 'A UNESCO-listed 18th century astronomical observatory with world\'s largest stone sundial, still accurate to 2 seconds.', category: 'Heritage' },
    { name: 'Nahargarh Fort', rating: '4.5', description: 'Built in 1734 on the rugged Aravalli Hills, offering panoramic views of Jaipur city. Stunning sunset viewpoint.', category: 'Heritage' },
    { name: 'Jal Mahal (Water Palace)', rating: '4.6', description: 'A fairy-tale palace appearing to float in the middle of Man Sagar Lake — best enjoyed from the lakeside promenade at dusk.', category: 'Scenic' },
    { name: 'Jaipur Bazaars (Johari Bazaar)', rating: '4.4', description: 'Vibrant colored markets famous for gemstones, tie-dye fabrics, blue pottery, and traditional Rajasthani jewellery.', category: 'Cultural' },
    { name: 'Albert Hall Museum', rating: '4.3', description: 'Rajasthan\'s oldest museum, a beautiful Indo-Saracenic building housing artifacts, Egyptian mummies, and royal collections.', category: 'Cultural' },
  ],
  goa: [
    { name: 'Baga Beach', rating: '4.4', description: 'Goa\'s most famous beach with vibrant shacks, water sports, and incredible nightlife. Perfect for first-time visitors.', category: 'Coastal' },
    { name: 'Basilica of Bom Jesus', rating: '4.7', description: 'A UNESCO World Heritage church housing the mortal remains of St. Francis Xavier. Baroque architecture at its finest.', category: 'Spiritual' },
    { name: 'Dudhsagar Waterfalls', rating: '4.8', description: 'India\'s tallest waterfall at 310 metres, surrounded by thick jungle. The jeep safari through dense forest adds to the adventure.', category: 'Nature' },
    { name: 'Anjuna Flea Market', rating: '4.2', description: 'Goa\'s legendary weekly market every Wednesday, selling handicrafts, clothes, souvenirs, spices, and unique hippie-era goods.', category: 'Cultural' },
    { name: 'Fort Aguada', rating: '4.5', description: 'A well-preserved 17th-century Portuguese fort guarding the confluence of the Mandovi river and the sea. Lighthouse included.', category: 'Heritage' },
    { name: 'Calangute Beach', rating: '4.3', description: 'Known as the "Queen of Beaches", it\'s the largest and most popular beach in Goa, with great dining and watersports.', category: 'Coastal' },
    { name: 'Old Goa Churches', rating: '4.6', description: 'A UNESCO district of 16th-17th century churches including Se Cathedral, one of the largest in Asia, reflecting Portuguese heritage.', category: 'Heritage' },
    { name: 'Palolem Beach', rating: '4.7', description: 'The most beautiful crescent-shaped beach in South Goa — calm, picturesque waters perfect for kayaking and swimming.', category: 'Coastal' },
  ],
  varanasi: [
    { name: 'Dashashwamedh Ghat', rating: '4.8', description: 'The main and most spectacular ghat on the Ganges where the mesmerizing Ganga Aarti ceremony takes place every evening.', category: 'Spiritual' },
    { name: 'Kashi Vishwanath Temple', rating: '4.9', description: 'One of the most sacred Hindu temples, dedicated to Lord Shiva. The golden spire is visible across the Ganga ghats.', category: 'Spiritual' },
    { name: 'Assi Ghat', rating: '4.6', description: 'The southernmost ghat, famous for the morning aarti and yoga sessions at sunrise. A peaceful and photogenic spot.', category: 'Spiritual' },
    { name: 'Sarnath', rating: '4.7', description: 'Where Lord Buddha gave his first sermon after enlightenment. Features the Dhamek Stupa and an outstanding Archaeological Museum.', category: 'Spiritual' },
    { name: 'Manikarnika Ghat', rating: '4.4', description: 'The sacred cremation ghat that burns 24/7. Witnessing this is a profound philosophical experience about life and death.', category: 'Spiritual' },
    { name: 'Banaras Hindu University', rating: '4.5', description: 'One of Asia\'s largest universities with a stunning campus housing the New Vishwanath Temple and an art gallery.', category: 'Cultural' },
    { name: 'Ramnagar Fort', rating: '4.3', description: 'A 18th century fort and palace of the Maharaja of Varanasi on the eastern bank of the Ganga, now a fascinating museum.', category: 'Heritage' },
    { name: 'Boat Ride on the Ganges', rating: '4.9', description: 'Watching the ghats and morning rituals from a wooden boat at sunrise is the quintessential Varanasi experience.', category: 'Scenic' },
  ],
  agra: [
    { name: 'Taj Mahal', rating: '4.9', description: 'The world\'s most iconic monument of love — a UNESCO Wonder of the World built by Shah Jahan for his beloved Mumtaz Mahal.', category: 'Heritage' },
    { name: 'Agra Fort', rating: '4.7', description: 'A magnificent UNESCO World Heritage red sandstone fort, home to Mughal emperors. Contains beautiful palaces and the Khas Mahal.', category: 'Heritage' },
    { name: 'Fatehpur Sikri', rating: '4.6', description: 'A ghost city built by Akbar in 1571, abandoned only 14 years later. Buland Darwaza is the largest gateway in the world.', category: 'Heritage' },
    { name: 'Mehtab Bagh', rating: '4.5', description: 'A riverside garden complex directly across from the Taj Mahal offering the best sunset views without the crowds.', category: 'Scenic' },
    { name: 'Itimad-ud-Daulah (Baby Taj)', rating: '4.4', description: 'A delicate Mughal mausoleum often called the "Baby Taj", built entirely in white marble with intricate inlay work.', category: 'Heritage' },
    { name: 'Akbar\'s Tomb (Sikandra)', rating: '4.3', description: 'The mausoleum of Emperor Akbar, built in Indo-Islamic style. Large complex with beautiful gardens and deer roaming freely.', category: 'Heritage' },
    { name: 'Kinari Bazaar', rating: '4.2', description: 'Agra\'s famous market for marble inlay items, leather goods, zardozi embroidery, and the world-renowned Agra petha sweets.', category: 'Cultural' },
    { name: 'Chini ka Rauza', rating: '4.1', description: 'A unique riverside mausoleum covered entirely in Persian-style glazed tile work — a hidden gem few tourists visit.', category: 'Heritage' },
  ],
  kolkata: [
    { name: 'Victoria Memorial', rating: '4.7', description: 'A grand white marble monument built in memory of Queen Victoria, now a museum. The gardens and surrounding lawns are stunning.', category: 'Heritage' },
    { name: 'Howrah Bridge', rating: '4.6', description: 'The iconic cantilever bridge over the Hooghly river — one of the world\'s busiest bridges with 100,000 vehicles daily.', category: 'Heritage' },
    { name: 'Dakshineswar Kali Temple', rating: '4.8', description: 'One of the most famous Kali temples in India where Ramakrishna Paramahansa had his spiritual visions. Architectural masterpiece.', category: 'Spiritual' },
    { name: 'Indian Museum', rating: '4.5', description: 'The oldest and largest museum in India (1814), housing a treasure trove of natural history, art, archaeology, and anthropology.', category: 'Cultural' },
    { name: 'Park Street Food Trail', rating: '4.3', description: 'Kolkata\'s famous food street with legendary restaurants, Kathi roll shops, mishti doi, and the Bengali culinary experience.', category: 'Cultural' },
    { name: 'Marble Palace', rating: '4.4', description: 'A 19th century mansion with an eclectic collection of European marbles, paintings, sculptures, and exotic birds in its courtyard.', category: 'Heritage' },
    { name: 'New Market (Hogg Market)', rating: '4.2', description: 'A massive Victorian-era market (1874) with over 2000 shops selling everything from spices and sarees to electronics.', category: 'Cultural' },
    { name: 'Belur Math', rating: '4.7', description: 'The headquarters of the Ramakrishna Math, known for its unique architecture that blends Hindu, Islamic and Christian elements.', category: 'Spiritual' },
  ],
  bangalore: [
    { name: 'Lalbagh Botanical Garden', rating: '4.7', description: 'A stunning 240-acre botanical garden housing India\'s largest collection of tropical plants and a famous glasshouse built on Crystal Palace.', category: 'Nature' },
    { name: 'Cubbon Park', rating: '4.5', description: 'A century-old public park spread over 300 acres in the heart of the city — green lungs of Bangalore with heritage buildings.', category: 'Nature' },
    { name: 'Bangalore Palace', rating: '4.3', description: 'Inspired by Windsor Castle, this 1887 palace features Tudor-style architecture with wood carvings and paintings of royal life.', category: 'Heritage' },
    { name: 'ISKCON Temple Bangalore', rating: '4.8', description: 'One of the largest ISKCON temples in the world, built in stunning Dravidian and Rajasthani styles. Breathtaking interior.', category: 'Spiritual' },
    { name: 'Vidhana Soudha', rating: '4.6', description: 'The grand granite state legislature building — a magnificent example of Neo-Dravidian architecture, most beautiful when lit at night.', category: 'Heritage' },
    { name: 'Tipu Sultan\'s Summer Palace', rating: '4.3', description: 'An exquisite 18th century palace of Tipu Sultan made entirely of teak wood with intricate carvings and paintings.', category: 'Heritage' },
    { name: 'UB City Mall & Brigade Road', rating: '4.4', description: 'Bangalore\'s luxury shopping and dining hub with over 100 international brands, fine dining, art installations and sky bars.', category: 'Cultural' },
    { name: 'Nandi Hills', rating: '4.7', description: 'A scenic hill station 60 km from Bangalore, famous for incredible sunrise views above the clouds and ancient Nandi Temple.', category: 'Nature' },
  ],
  hyderabad: [
    { name: 'Charminar', rating: '4.7', description: 'The iconic 16th century monument with four grand arches and minarets — the undisputed symbol of Hyderabad\'s rich Nizami heritage.', category: 'Heritage' },
    { name: 'Golconda Fort', rating: '4.6', description: 'A majestic Qutb Shahi dynasty fort famed for its acoustic system, water supply engineering and the stunning sound-light show.', category: 'Heritage' },
    { name: 'Ramoji Film City', rating: '4.5', description: 'The world\'s largest film studio complex (Guinness Record), with over 2500 acres of themed sets, gardens and amusements.', category: 'Cultural' },
    { name: 'Hussain Sagar Lake', rating: '4.4', description: 'A large heart-shaped lake with a giant Buddha statue on a rock island in the center. Boat rides available all day.', category: 'Scenic' },
    { name: 'Laad Bazaar (Choodi Bazaar)', rating: '4.3', description: 'The famous bangle market near Charminar — a kaleidoscope of colorful bangles, pearls, and traditional Hyderabadi jewelry.', category: 'Cultural' },
    { name: 'Qutb Shahi Tombs', rating: '4.5', description: 'The magnificent necropolis of the Qutb Shahi rulers — seven grand domed tombs set in a Persian-style garden.', category: 'Heritage' },
    { name: 'Salar Jung Museum', rating: '4.6', description: 'One of India\'s largest museums, housing Salar Jung III\'s personal collection of 43,000 artifacts from around the world.', category: 'Cultural' },
    { name: 'Birla Mandir', rating: '4.6', description: 'A pristine white marble Hindu temple on a hilltop, offering panoramic views of Hussain Sagar Lake and the city.', category: 'Spiritual' },
  ],
  chennai: [
    { name: 'Marina Beach', rating: '4.5', description: 'The world\'s second longest urban beach at 13 km. An iconic Chennai experience, especially at sunrise with street food vendors.', category: 'Coastal' },
    { name: 'Kapaleeshwarar Temple', rating: '4.8', description: 'A magnificent 7th century Dravidian temple dedicated to Lord Shiva in Mylapore, with a colorful gopuram towering 37 metres.', category: 'Spiritual' },
    { name: 'Fort St. George', rating: '4.4', description: 'The first English fortress in India (1644), now housing the Tamil Nadu Assembly and a museum with rare colonial artifacts.', category: 'Heritage' },
    { name: 'San Thome Basilica', rating: '4.6', description: 'A neo-Gothic church built over the tomb of St. Thomas the Apostle, one of only three churches in the world built over an apostle\'s tomb.', category: 'Spiritual' },
    { name: 'Elliot\'s Beach (Besant Nagar)', rating: '4.4', description: 'A quieter, cleaner beach popular with locals. Famous for the Karl Schmidt Memorial and dotted with restaurants and street food.', category: 'Coastal' },
    { name: 'Government Museum Chennai', rating: '4.3', description: 'India\'s second oldest museum (1851) housing extraordinary collections of South Indian bronzes, ammonites, and folk art.', category: 'Cultural' },
    { name: 'Mahabalipuram', rating: '4.8', description: 'UNESCO-listed 7th century shore temples, rock-cut caves and bas-reliefs just 60 km from Chennai — an absolute must-see.', category: 'Heritage' },
    { name: 'Dakshinachitra', rating: '4.5', description: 'A living heritage museum that recreates traditional homes and crafts of South India — complete with artisan demonstrations.', category: 'Cultural' },
  ],
  manali: [
    { name: 'Rohtang Pass', rating: '4.8', description: 'A high mountain pass at 3,978m offering breathtaking snow-capped views and access to the Lahaul and Spiti valleys.', category: 'Adventure' },
    { name: 'Solang Valley', rating: '4.7', description: 'Adventure sports hub with skiing, zorbing, paragliding and cable car rides, surrounded by snow-covered peaks year round.', category: 'Adventure' },
    { name: 'Hadimba Devi Temple', rating: '4.6', description: 'A unique pagoda-style temple in the middle of cedar forests, dedicated to Hadimba, wife of Bhima from the Mahabharata.', category: 'Spiritual' },
    { name: 'Old Manali', rating: '4.5', description: 'A charming village with wooden houses, Israeli cafes, boutique shops and the famous Manu Temple, original settlement of Manali.', category: 'Cultural' },
    { name: 'Beas River Rafting', rating: '4.7', description: 'White-water rafting on the Beas river through exciting rapids rated Grade III-IV. An exhilarating 14 km adventure.', category: 'Adventure' },
    { name: 'Mall Road Manali', rating: '4.3', description: 'The main market street lined with shops selling woolens, handicrafts, dried fruits, Himachali shawls, and local street food.', category: 'Cultural' },
    { name: 'Vashisht Hot Springs', rating: '4.4', description: 'Natural sulphur hot springs with separate bathing tanks for men and women, located near the ancient Vashisht Temple.', category: 'Nature' },
    { name: 'Naggar Castle', rating: '4.3', description: 'A 500-year-old castle turned heritage hotel offering panoramic Himalayan views and housing the Nicholas Roerich Art Gallery.', category: 'Heritage' },
  ],
  kerala: [
    { name: 'Alleppey Backwaters', rating: '4.9', description: 'A magical network of lagoons, lakes and canals. A houseboat stay on the Kerala backwaters is one of India\'s greatest experiences.', category: 'Nature' },
    { name: 'Munnar Tea Gardens', rating: '4.8', description: 'Rolling hills carpeted in emerald green tea plantations at altitudes of 1600m. The views are absolutely breathtaking.', category: 'Nature' },
    { name: 'Periyar Wildlife Sanctuary', rating: '4.7', description: 'Home to tigers, elephants, bison and leopards — take a boat safari on the Periyar Lake for the best wildlife sightings.', category: 'Nature' },
    { name: 'Kovalam Beach', rating: '4.5', description: 'Kerala\'s most popular beach with a crescent-shaped bay, lighthouse, Ayurvedic resorts and world-class seafood restaurants.', category: 'Coastal' },
    { name: 'Varkala Beach', rating: '4.7', description: 'Stunning red cliffs overlooking the Arabian Sea, with a beachside market of yoga studios, cafes and Ayurvedic centers.', category: 'Coastal' },
    { name: 'Fort Kochi', rating: '4.6', description: 'A charming heritage district with Chinese fishing nets, colonial buildings, Jew Town spice market and vibrant street art.', category: 'Heritage' },
    { name: 'Wayanad Wildlife Sanctuary', rating: '4.6', description: 'Dense forests in the Western Ghats with rich biodiversity — jeep safaris, treehouse stays and tribal cultural experiences.', category: 'Nature' },
    { name: 'Padmanabhaswamy Temple', rating: '4.8', description: 'One of the world\'s wealthiest temples, dedicated to Lord Vishnu. The vaults reportedly contain trillions in gold treasures.', category: 'Spiritual' },
  ],
  shimla: [
    { name: 'The Ridge', rating: '4.7', description: 'Shimla\'s main open space offering panoramic views of the Himalayan ranges, Christ Church, and the famous Scandal Point.', category: 'Scenic' },
    { name: 'Mall Road Shimla', rating: '4.5', description: 'The main promenade lined with colonial-era shops, cafes, and restaurants — the social heart of Shimla free of vehicles.', category: 'Cultural' },
    { name: 'Jakhu Temple', rating: '4.6', description: 'A 108-foot statue of Lord Hanuman atop Jakhu Hill — a scenic 2.5 km trek from Mall Road with great city views.', category: 'Spiritual' },
    { name: 'Kufri', rating: '4.5', description: 'A small hill station 13km from Shimla famous for skiing, tobogganing, horse riding and the Kufri Fun World adventure park.', category: 'Adventure' },
    { name: 'Christ Church', rating: '4.4', description: 'The second oldest church in North India (1857), famous for its neo-Gothic architecture and beautiful stained glass windows.', category: 'Heritage' },
    { name: 'Toy Train (Heritage Railway)', rating: '4.8', description: 'A UNESCO World Heritage toy train journey through 102 tunnels and 864 bridges from Kalka to Shimla — absolutely unforgettable.', category: 'Adventure' },
    { name: 'Indian Institute of Advanced Study', rating: '4.3', description: 'The former British Viceregal Lodge — a stunning Gothic building with beautiful gardens where many key decisions about India were made.', category: 'Heritage' },
    { name: 'Chadwick Falls', rating: '4.4', description: 'A 67-metre waterfall a short trek from Shimla, surrounded by thick pine forests — most impressive during and after monsoon.', category: 'Nature' },
  ],
  rishikesh: [
    { name: 'Laxman Jhula', rating: '4.6', description: 'An iconic 450-foot iron suspension bridge over the Ganges with views of temples and ashrams on both sides of the river.', category: 'Scenic' },
    { name: 'Triveni Ghat', rating: '4.7', description: 'The holiest ghat in Rishikesh where the Ganges Aarti ceremony each evening draws large crowds for its spiritual atmosphere.', category: 'Spiritual' },
    { name: 'Rafting on the Ganges', rating: '4.8', description: 'World-class white-water rafting on the Ganges with rapids from Grade I to Grade V. India\'s best rafting destination.', category: 'Adventure' },
    { name: 'Beatles Ashram (Chaurasi Kutia)', rating: '4.5', description: 'Where The Beatles stayed in 1968 and wrote most of the White Album. Now an iconic open-air art gallery with Beatle murals.', category: 'Cultural' },
    { name: 'Neer Garh Waterfall', rating: '4.6', description: 'A stunning cascade a 2 km trek from town — the trail through forest and the emerald pool beneath are breathtaking.', category: 'Nature' },
    { name: 'Yoga & Meditation Centers', rating: '4.9', description: 'The yoga capital of the world offers hundreds of ashrams and centers for authentic practices, from one hour to month-long retreats.', category: 'Spiritual' },
    { name: 'Ram Jhula', rating: '4.5', description: 'A longer suspension bridge near the Sivananda Ashram with great views of the Ganges and the surrounding Himalayan foothills.', category: 'Scenic' },
    { name: 'Bungee Jumping (Jumpin Heights)', rating: '4.7', description: 'India\'s highest bungee jumping at 83 metres above the Ganges — located at one of the most scenic spots in Rishikesh.', category: 'Adventure' },
  ],
};

/**
 * Find the best matching city in our database (case-insensitive, partial match)
 */
const findCityData = (city) => {
  const q = city.toLowerCase().trim();
  // Exact match
  if (CITY_ATTRACTIONS[q]) return CITY_ATTRACTIONS[q];
  // Partial match (e.g. "new delhi" matches "delhi")
  for (const [key, val] of Object.entries(CITY_ATTRACTIONS)) {
    if (q.includes(key) || key.includes(q)) return val;
  }
  return null;
};

const toNumber = (val) => {
  if (typeof val === 'string') {
    // Strip ₹, commas, and other non-numeric chars except decimals
    val = val.replace(/[₹,]/g, '').trim();
  }
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : 0;
};

const computeBudgetBreakdown = ({ itinerary = [], budget = 0, destination = 'your destination', numDays = 1, interests = '', adults = 1, children = 0, travelStyle = 'Comfort' }) => {
  const activities = itinerary.flatMap(day => {
    if (!day.activities) return [];
    if (Array.isArray(day.activities)) return day.activities;
    return Object.values(day.activities);
  });
  const totalPlaces = activities.length;
  const travelersCount = (Number(adults) || 1) + (Number(children) || 0);
  const totalDays = Math.max(1, Number(numDays) || 1);

  // Calculate actual entry fees from the itinerary activities
  const entryFees = Math.round(
    activities.reduce((sum, activity) => sum + Math.max(0, toNumber(activity?.cost)), 0) * (Number(adults) + (Number(children) * 0.5))
  );

  const requestedBudget = Math.max(0, Math.round(toNumber(budget)));
  let totalCost = requestedBudget > 0 ? requestedBudget : (entryFees + (totalDays * 1500 * travelersCount));

  // REALISM FIX: For very high budgets, don't just use percentages.
  // Cap basic needs and put the rest in a 'Luxury Buffer' if it's too high.
  const capPerDayTransport = travelStyle === 'Luxury' ? 5000 : 2000;
  const capPerDayFood = travelStyle === 'Luxury' ? 8000 : 3000;

  let transport = Math.round(Math.min(requestedBudget * 0.4, totalDays * capPerDayTransport * travelersCount));
  let foodMisc = Math.round(Math.min(requestedBudget * 0.6, totalDays * capPerDayFood * travelersCount));

  // If we have a massive surplus (like 5 Lakh for 1 day), we redistribute or call it Luxury Premium
  const calculatedTotal = entryFees + transport + foodMisc;
  if (requestedBudget > calculatedTotal * 1.5) {
    // Redistribute surplus to keep segments looking 'full' of the user's budget but capped
    const surplus = requestedBudget - entryFees;
    transport = Math.round(surplus * 0.4);
    foodMisc = requestedBudget - entryFees - transport;
  } else if (requestedBudget > 0) {
    // Ensure it sums up to requestedBudget
    const remaining = Math.max(0, requestedBudget - entryFees);
    transport = Math.round(remaining * 0.4);
    foodMisc = requestedBudget - entryFees - transport;
  }

  const interestText = String(interests || '').trim();
  const focusText = interestText && interestText !== 'Heritage, Culture'
    ? interestText
    : 'a balanced mix of heritage, culture, and local experiences';

  const travelersText = `${adults} Adult${adults > 1 ? 's' : ''}${children > 0 ? ` and ${children} child${children > 1 ? 'ren' : ''}` : ''}`;

  return {
    totalCost,
    totalPlaces,
    entryFees,
    transport,
    foodMisc,
    explanation: `Built for ${travelersText} spending ${totalDays} day(s) in ${destination}. This plan prioritizes ${focusText}. ${requestedBudget < 2000 ? "We've highly optimized for a shoestring budget, focusing on free attractions." : "Budget reflects optimized transport and meal costs for your travel style."}`,
  };
};
app.post('/api/generate-itinerary', async (req, res) => {
  const { destination, budget, days, interests, adults, children, travelStyle } = req.body;
  const numDays = Math.max(1, parseInt(days) || 3);
  const safeAdults = Math.max(1, parseInt(adults) || 1);
  const safeChildren = Math.max(0, parseInt(children) || 0);
  const style = travelStyle || 'Comfort';

  const interestStr = Array.isArray(interests) && interests.length > 0
    ? interests.join(', ') : 'Heritage, Culture';

  const dayList = Array.from({ length: numDays }, (_, i) => `Day ${i + 1}`).join(', ');

  console.log(`\n📅 Generating Itinerary: "${destination}" (${numDays} days) for ${safeAdults} Adults, ${safeChildren} Children (${style})`);
  let realContext = '';
  let confirmedPlaces = findCityData(destination);

  if (!confirmedPlaces) {
    console.log(`🔍 Itinerary: Fetching real places from Wikipedia for context...`);
    confirmedPlaces = await getAttractionsFromWikipedia(destination);
  }

  if (confirmedPlaces && confirmedPlaces.length > 0) {
    const names = confirmedPlaces.map(p => p.name).join(', ');
    realContext = `\nIMPORTANT: Use these REAL confirmed attractions in ${destination} for the itinerary: ${names}.`;
    console.log(`✅ Itinerary: Found ${confirmedPlaces.length} real places to use as context.`);
  }

  const safeBudget = toNumber(budget);

  const prompt = `Create a ${numDays}-day travel itinerary for ${destination}, India.
Traveling with: ${safeAdults} Adults, ${safeChildren} Children.
Travel Style: ${style}.
Budget: Rs ${safeBudget}. Interests: ${interestStr}.
Generate all these days: ${dayList}.${realContext}

Return ONLY this JSON (absolutely no markdown fences, no explanation text):
{
  "itinerary":[{"day":1,"title":"Day Title","activities":{"morning":{"name":"Place","cost":500,"insight":"tip","duration":"2h","type":"Heritage","rating":4.5},...}}],
  "accommodations":[{"name":"Hotel","price":"₹₹₹","description":"..."}],
  "localEats":[{"name":"Dish","description":"..."}],
  "packingList":[{"category":"Weather","item":"Cotton Clothes", "reason":"High humidity"}, {"category":"Activities","item":"Power Bank", "reason":"For long sightseeing days"}],
  "localPhrases":[{"phrase":"Hello","translation":"Namaste","usage":"Greeting"}],
  "totalCost":${safeBudget},
  "totalPlaces":${numDays * 3},
  "entryFees":5000,
  "transport":8000,
  "foodMisc":12000,
  "explanation":"..."
}

RULES:
- EXACTLY ${numDays} days.
- SMART PACKING: Provide 4-5 items across categories (Weather, Activities, Cultural Context) with specific reasons.
- LOCAL PHRASES: 3-4 phrases in the regional language.
- INCLUDE 2-3 REAL accommodations matching ${style} style.
- INCLUDE 2-3 REAL local food or restaurant recommendations.
- NEVER suggest an activity where group entry fees exceed Rs ${safeBudget}.
- FOR VERY LOW BUDGETS (like Rs ${safeBudget} < 2000): Use cost 0 for ALMOST EVERYTHING. India has many free parks, temples, and markets.
- Each activity 'cost' MUST be a RAW NUMBER (e.g. 500), NO symbols, NO commas.
- For each day, provide EXACTLY 3 activities: 'morning', 'afternoon', 'evening'.
- Use REAL place names of ${destination}.
- No markdown, raw JSON only.`;

  try {
    let data = await callAI(prompt);

    if (!data || !data.itinerary || !Array.isArray(data.itinerary) || data.itinerary.length < numDays) {
      console.log(`⚠️ AI Itinerary failed or incomplete. Using smart fallback.`);
      data = await buildItineraryFallback(destination, numDays, budget, interestStr);
    }

    // Pad to numDays if needed
    if (data.itinerary.length < numDays) {
      const extra = await buildItineraryFallback(destination, numDays - data.itinerary.length, budget, interestStr);
      extra.itinerary.forEach((d, i) => {
        data.itinerary.push({ ...d, day: data.itinerary.length + 1 });
      });
    }

    // Add real Wikipedia images for every activity in every day (parallel per day)
    console.log(`📸 Enriched Itinerary: Fetching final images for all activities...`);
    data.itinerary = await Promise.all(
      data.itinerary.slice(0, numDays).map(async (day, dIdx) => {
        const slots = day.activities || {}; // morning, afternoon, evening
        const slotKeys = Object.keys(slots);
        const slotsArray = slotKeys.map(k => ({ ...slots[k], slot: k }));

        const enrichedArray = await enrichWithImages(
          slotsArray.map(act => {
            const ratingValue = toNumber(act.rating);
            return ({
              ...act,
              name: act.name || 'Attraction',
              cost: Math.max(0, Math.round(toNumber(act.cost))),
              rating: ratingValue > 0 ? ratingValue : 4.5,
            });
          }),
          destination
        );

        // Map back to slots object
        const finalActivities = {};
        enrichedArray.forEach((act, i) => {
          finalActivities[slotKeys[i]] = act;
        });

        return {
          ...day,
          day: dIdx + 1,
          activities: finalActivities
        };
      })
    );

    // Guarantee Accommodations and Local Eats (AI sometimes forgets new fields)
    if (!data.accommodations || !Array.isArray(data.accommodations) || data.accommodations.length === 0) {
      data.accommodations = [
        { name: `Top-Rated Heritage Stay`, price: "₹₹₹", description: `A highly recommended property in the heart of ${destination} matching your travel style.` },
        { name: `Boutique Comfort Inn`, price: "₹₹", description: "Excellent location with modern amenities and local hospitality." }
      ];
    }
    if (!data.localEats || !Array.isArray(data.localEats) || data.localEats.length === 0) {
      data.localEats = [
        { name: "Signature Local Thali", description: "Must-try authentic meal experience featuring regional specialties." },
        { name: "Famous Street Delicacy", description: `The most iconic quick-bite that ${destination} is known for.` }
      ];
    }

    // Enrich Accommodations and Local Eats with images
    data.accommodations = await enrichWithImages(data.accommodations, destination);
    data.localEats = await enrichWithImages(data.localEats, destination);

    // 🧪 THE REALITY CHECK: Sanitize and Fix AI "Cheating"
    console.log(`🧪 Performing Reality Check on ${destination} (Budget: ₹${safeBudget})...`);
    let manualEntryFees = 0;
    const totalTravelers = safeAdults + (safeChildren * 0.5);

    data.itinerary.forEach((day, dayIdx) => {
      const slots = day.activities || {};
      Object.keys(slots).forEach(slotName => {
        let act = slots[slotName];
        let originalCost = toNumber(act.cost);
        let groupCost = originalCost * totalTravelers;

        // CRITICAL BUG FIX: If group cost for this ONE place exceeds the WHOLE budget OR the budget is tiny (< Rs 1000) 
        // AND this isn't a free place, force it to 0.
        if (groupCost > safeBudget || (safeBudget < 1000 && originalCost > 50)) {
          console.log(`⚠️ Budget Violation Day ${dayIdx + 1}: ${act.name} (₹${originalCost}) group cost ₹${groupCost} > budget ₹${safeBudget}. FORCING TO FREE.`);
          act.cost = 0;
          act.insight = `(Budget Choice) We've opted for a walk-around or free-access section of ${act.name} to fit your ₹${safeBudget} trip.`;
          originalCost = 0;
        }

        // Clean the cost in the JSON
        act.cost = Math.round(originalCost);
        manualEntryFees += originalCost * totalTravelers;
      });
    });

    // Check if the sum of all entry fees is still too high
    if (manualEntryFees > safeBudget && safeBudget > 0) {
      console.log(`❌ TOTAL FEES ₹${manualEntryFees} still exceeds budget ₹${safeBudget}. Performing aggressive cost reduction...`);
      data.itinerary.forEach(day => {
        const slots = day.activities || {};
        Object.keys(slots).forEach(slot => {
          if (slots[slot].cost > 0) {
            slots[slot].cost = 0;
            slots[slot].insight = `(Low Budget) Enjoying the external view and local vibe to save on entry fees.`;
          }
        });
      });
      manualEntryFees = 0;
    }

    const normalizedBudget = computeBudgetBreakdown({
      itinerary: data.itinerary,
      budget,
      destination,
      numDays,
      interests: interestStr,
      adults: safeAdults,
      children: safeChildren,
      travelStyle: style
    });

    // Overwrite the summary with our manual truth
    data = {
      ...data,
      ...normalizedBudget,
      entryFees: Math.round(manualEntryFees),
      totalCost: safeBudget > 0 ? safeBudget : Math.round(manualEntryFees + normalizedBudget.transport + normalizedBudget.foodMisc),
      packingList: getDynamicPackingList(destination, interestStr)
    };

    res.json(data);
  } catch (err) {
    console.error('Itinerary error:', err.message);
    res.status(500).json({ error: 'Failed to generate itinerary. Please try again.' });
  }
});

/**
 * Generates a localized packing list based on the destination's known climate/type.
 */
function getDynamicPackingList(destination, interests = '') {
  const d = destination.toLowerCase();
  const hillStations = ['manali', 'shimla', 'munnar', 'gangtok', 'leh', 'ladakh', 'nainital', 'mussoorie', 'ooty', 'darjeeling', 'gulmarg', 'shillong'];
  const coastal = ['goa', 'mumbai', 'kochi', 'chennai', 'vizag', 'pondicherry', 'kerala', 'varkala', 'alleppey', 'andaman'];
  const spiritual = ['varanasi', 'rishikesh', 'haridwar', 'tirupati', 'puri', 'amritsar', 'shirdi', 'kedarnath', 'badrinath'];
  const desert = ['jaipur', 'jodhpur', 'jaisalmer', 'bikaner', 'pushkar', 'udaipur'];

  const list = [];

  // 1. Weather/Region Specific
  if (hillStations.some(h => d.includes(h))) {
    list.push({ category: "Weather", item: "Layered Woolens", reason: "Temperatures drop significantly at night in high altitudes." });
    list.push({ category: "Health", item: "Motion Sickness Meds", reason: "For curvy mountain roads (ghats) while traveling." });
    list.push({ category: "Skin Care", item: "Moisturizer/Lip Balm", reason: "Mountain air can be very dry regardless of sun." });
  } else if (coastal.some(c => d.includes(c))) {
    list.push({ category: "Weather", item: "Breathable Cotton", reason: "High humidity requires lightweight, quick-dry fabrics." });
    list.push({ category: "Essentials", item: "Waterproof Phone Pouch", reason: "Essential for boat rides and beach activities." });
    list.push({ category: "Footwear", item: "Flip Flops/Sandals", reason: "Best for sandy terrain and humid coastal walks." });
  } else if (desert.some(ds => d.includes(ds))) {
    list.push({ category: "Weather", item: "Cotton Scarf/Stole", reason: "Protects against direct sun and dust during desert safaris." });
    list.push({ category: "Skin Care", item: "High SPF Sunscreen", reason: "Intense sun exposure in the Rajasthan plains." });
    list.push({ category: "Essentials", item: "Hydration Salts (ORS)", reason: "Crucial for staying hydrated in the dry heat." });
  } else {
    list.push({ category: "Weather", item: "Universal Light Jacket", reason: "Good for air-conditioned travel or slight evening breeze." });
    list.push({ category: "Essentials", item: "Universal Adapter", reason: "Ensures your devices stay charged during long tours." });
  }

  // 2. Interest/Activity Specific
  if (interests.toLowerCase().includes('spiritual') || spiritual.some(s => d.includes(s))) {
    list.push({ category: "Cultural", item: "Modest Clothing", reason: "Required for entry into most temples and sacred sites." });
    list.push({ category: "Essentials", item: "Slip-on Shoes", reason: "Easier to remove outside temples and shrines." });
  } else if (interests.toLowerCase().includes('adventure')) {
    list.push({ category: "Activities", item: "Sturdy Hiking Shoes", reason: "Necessary for grip on uneven trails or trekking." });
    list.push({ category: "Gear", item: "Small Daypack", reason: "To carry water and essentials during outdoor treks." });
  } else {
    list.push({ category: "Activities", item: "Comfortable Walking Shoes", reason: "Essential for exploring city heritage sites on foot." });
    list.push({ category: "Tech", item: "Power Bank", reason: "Keep your phone charged for maps and photos all day." });
  }

  return list;
}

// ─── ITINERARY FALLBACK ───────────────────────────────────────────────────────
async function buildItineraryFallback(destination, numDays, budget, interests) {
  // Use real attractions if available for this city (DB or Wikipedia)
  let realPlaces = findCityData(destination);
  if (!realPlaces) {
    realPlaces = await getAttractionsFromWikipedia(destination);
  }

  const dayTemplates = [
    { title: 'Arrival & Iconic Landmarks', acts: ['Main Monument', 'City Palace', 'Old Market Square'] },
    { title: 'Spiritual & Cultural Immersion', acts: ['Ancient Temple', 'Heritage Museum', 'Local Food Walk'] },
    { title: 'Nature & Scenic Escapes', acts: ['Scenic Viewpoint', 'Botanical Garden', 'Lake & Waterfront'] },
    { title: 'Hidden Gems & Local Life', acts: ['Artisan Village', 'Local Cooking Class', 'Rooftop Sunset Cafe'] },
    { title: 'Arts, Crafts & Shopping', acts: ['Craft Village', 'Textile Museum', 'Night Bazaar'] },
    { title: 'Adventure & Outdoors', acts: ['Trekking Trail', 'River Activity', 'Hilltop Fort'] },
    { title: 'Relax & Rejuvenate', acts: ['Ayurvedic Spa', 'Morning Yoga', 'Farewell Dinner'] },
  ];

  const itinerary = Array.from({ length: numDays }, (_, i) => {
    const tmpl = dayTemplates[i % dayTemplates.length];
    let activities;
    const slots = ['morning', 'afternoon', 'evening'];

    if (realPlaces && realPlaces.length >= 3) {
      const startIdx = (i * 3) % realPlaces.length;
      activities = {};
      slots.forEach((slot, offset) => {
        const place = realPlaces[(startIdx + offset) % realPlaces.length];
        const isLowBudget = parseInt(budget) < 2000;
        activities[slot] = {
          name: place.name,
          cost: isLowBudget ? 0 : (offset === 0 ? 500 : offset === 1 ? 200 : 0),
          insight: isLowBudget ? `Enjoying the free sections of ${place.name}.` : place.description,
          duration: ['3 Hours', '2 Hours', '1.5 Hours'][offset],
          type: place.category,
          rating: parseFloat(place.rating) || 4.5
        };
      });
    } else {
      activities = {};
      slots.forEach((slot, j) => {
        const actName = tmpl.acts[j];
        const isLowBudget = parseInt(budget) < 2000;
        activities[slot] = {
          name: `${destination} ${actName}`,
          cost: isLowBudget ? 0 : (j === 0 ? 500 : j === 1 ? 200 : 0),
          insight: isLowBudget ? `Exploring the public vibrant spaces of ${destination}.` : `Visiting ${destination}'s ${actName.toLowerCase()} is a highlight of any trip.`,
          duration: ['3 Hours', '2 Hours', '1.5 Hours'][j],
          type: ['Heritage', 'Cultural', 'Nature'][j],
          rating: 4.5
        };
      });
    }

    return { day: i + 1, title: tmpl.title, activities };
  });

  const b = parseInt(budget) || 42500;
  const summary = computeBudgetBreakdown({
    itinerary,
    budget: b,
    destination,
    numDays,
    interests,
  });

  const accommodations = [
    { name: `Heritage Stay in ${destination}`, price: "₹₹₹", description: "Centrally located with excellent reviews and traditional architecture." },
    { name: `Boutique Hotel ${destination}`, price: "₹₹", description: "Modern amenities with a touch of local culture." }
  ];

  const localEats = [
    { name: `Famous Local Thali`, description: "A complete platter of regional delicacies." },
    { name: `Old City Street Food`, description: "authentic flavors from the most iconic stalls." }
  ];

  return {
    itinerary,
    accommodations,
    localEats,
    packingList: getDynamicPackingList(destination, interests),
    localPhrases: [
      { phrase: "Namaste", translation: "Hello", usage: "Universal greeting" },
      { phrase: "Kitna hai?", translation: "How much?", usage: "Shopping" }
    ],
    ...summary,
  };
}

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
