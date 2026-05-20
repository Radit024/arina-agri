"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AGRI_KEYWORDS = void 0;
exports.isAgriRelevant = isAgriRelevant;
exports.extractSnippet = extractSnippet;
exports.extractImageUrl = extractImageUrl;
exports.scrapeOgImage = scrapeOgImage;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
exports.AGRI_KEYWORDS = [
    'cabai', 'pupuk', 'hama', 'cuaca', 'panen', 'pertanian', 'harga',
    'komoditas', 'agri', 'petani', 'sawah', 'irigasi', 'holtikultura',
    'tanaman', 'kebun', 'lahan', 'beras', 'jagung', 'kedelai', 'tomat', 'padi'
];
function isAgriRelevant(title, content) {
    const textToCheck = `${title} ${content || ''}`.toLowerCase();
    return exports.AGRI_KEYWORDS.some((kw) => textToCheck.includes(kw));
}
function extractSnippet(content, summary) {
    const raw = content || summary || '';
    const stripped = raw.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    if (!stripped)
        return null;
    return stripped.length > 200 ? stripped.substring(0, 200) + '...' : stripped;
}
function extractImageUrl(item) {
    const mediaContent = item['media:content'];
    if (mediaContent?.['$']?.url)
        return mediaContent['$'].url;
    if (item.enclosure?.url)
        return item.enclosure.url;
    const contentHtml = item['content:encoded'];
    if (contentHtml) {
        const match = contentHtml.match(/<img[^>]+src=["']([^"']+)["']/i);
        if (match?.[1])
            return match[1];
    }
    return null;
}
/**
 * Decodes a Google News RSS article URL to its original source URL.
 */
async function decodeGoogleNewsUrl(sourceUrl) {
    try {
        const response = await axios_1.default.get(sourceUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
            }
        });
        const $ = cheerio.load(response.data);
        const dataP = $('c-wiz[data-p]').attr('data-p');
        if (!dataP) {
            return null;
        }
        const obj = JSON.parse(dataP.replace('%.@.', '["garturlreq",'));
        const payload = {
            'f.req': JSON.stringify([
                [
                    ['Fbv4je', JSON.stringify([...obj.slice(0, -6), ...obj.slice(-2)]), null, 'generic']
                ]
            ])
        };
        const postResponse = await axios_1.default.post('https://news.google.com/_/DotsSplashUi/data/batchexecute', new URLSearchParams(payload).toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
            }
        });
        const cleanData = postResponse.data.replace(")]}'\n\n", "");
        const outerArray = JSON.parse(cleanData);
        const innerArrayString = outerArray[0][2];
        const finalUrl = JSON.parse(innerArrayString)[1];
        return finalUrl;
    }
    catch (error) {
        console.error('[newsHelpers] Decoding Google News URL failed:', error instanceof Error ? error.message : error);
        return null;
    }
}
/**
 * Extracts Open Graph image from a URL.
 * Supports Google News URLs by first decoding them.
 */
async function scrapeOgImage(url) {
    try {
        let targetUrl = url;
        if (url.includes('news.google.com/rss/articles/')) {
            const decodedUrl = await decodeGoogleNewsUrl(url);
            if (decodedUrl) {
                targetUrl = decodedUrl;
            }
            else {
                return null;
            }
        }
        const response = await axios_1.default.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
            },
            timeout: 8000
        });
        const $ = cheerio.load(response.data);
        const ogImage = $('meta[property="og:image"]').attr('content') || $('meta[name="og:image"]').attr('content');
        return ogImage || null;
    }
    catch (err) {
        console.error(`[newsHelpers] scrapeOgImage failed for ${url}:`, err instanceof Error ? err.message : err);
        return null;
    }
}
