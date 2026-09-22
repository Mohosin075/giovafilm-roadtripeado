"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
async function testMyMemory() {
    var _a, _b;
    const tests = [
        { text: "Bolera moderna en el corazón de Jayuya, todo un hallazgo en esta zona", from: 'es', to: 'en' },
        { text: "Kayak Rental Balneario La Monserrate De", from: 'es', to: 'en' },
        { text: "Playa Flamenco es una hermosa playa de arena blanca ubicada en la isla de Culebra, Puerto Rico.", from: 'es', to: 'en' },
        { text: "Beautiful waterfall with clear blue water perfect for swimming and hiking.", from: 'en', to: 'es' }
    ];
    for (const t of tests) {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(t.text)}&langpair=${t.from}|${t.to}&de=dev@giovafilm.com`;
        try {
            const res = await axios_1.default.get(url, { timeout: 5000 });
            console.log(`[${t.from}->${t.to}] "${t.text}" => "${(_b = (_a = res.data) === null || _a === void 0 ? void 0 : _a.responseData) === null || _b === void 0 ? void 0 : _b.translatedText}"`);
        }
        catch (e) {
            console.log(`Error on "${t.text}":`, e.message);
        }
    }
}
testMyMemory();
