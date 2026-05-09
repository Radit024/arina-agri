"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AGRI_KEYWORDS = void 0;
exports.isAgriRelevant = isAgriRelevant;
exports.extractSnippet = extractSnippet;
exports.extractImageUrl = extractImageUrl;
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
