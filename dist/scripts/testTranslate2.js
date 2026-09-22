"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// Provider 1: Google translate via web single endpoint with different user agents
async function translateGoogleWeb(text, from, to) {
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
        const res = await axios_1.default.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 5000
        });
        if (res.data && res.data[0] && res.data[0][0] && res.data[0][0][0]) {
            return res.data[0].map((item) => item[0]).filter(Boolean).join('');
        }
    }
    catch (err) {
        console.log("Google gtx error:", err.message);
    }
    return null;
}
// Provider 2: Lingva Translate (open source privacy proxy for Google Translate)
async function translateLingva(text, from, to) {
    const instances = [
        'https://lingva.ml/api/v1',
        'https://lingva.lunar.icu/api/v1',
        'https://translate.plausibility.cloud/api/v1'
    ];
    for (const base of instances) {
        try {
            const url = `${base}/${from}/${to}/${encodeURIComponent(text)}`;
            const res = await axios_1.default.get(url, { timeout: 4000 });
            if (res.data && res.data.translation) {
                return res.data.translation;
            }
        }
        catch (e) { }
    }
    return null;
}
// Provider 3: LibreTranslate / DuckDuckGo / Memory
async function test() {
    const text = "Bolera moderna en el corazón de Jayuya, todo un hallazgo en esta zona";
    console.log("Original:", text);
    const resGoogle = await translateGoogleWeb(text, 'es', 'en');
    console.log("Google GTX result:", resGoogle);
    const resLingva = await translateLingva(text, 'es', 'en');
    console.log("Lingva result:", resLingva);
}
test();
