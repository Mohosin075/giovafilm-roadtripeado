"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const google_translate_api_1 = require("@vitalets/google-translate-api");
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
async function test() {
    var _a, _b;
    const text = "Bolera moderna en el corazón de Jayuya, todo un hallazgo en esta zona";
    console.log("Original text:", text);
    try {
        const res = await (0, google_translate_api_1.translate)(text, { from: 'es', to: 'en' });
        console.log("Google Translate result:", res === null || res === void 0 ? void 0 : res.text);
    }
    catch (err) {
        console.error("Google Translate error:", (err === null || err === void 0 ? void 0 : err.message) || err);
    }
    try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=es|en`;
        const response = await axios_1.default.get(url, { timeout: 6000 });
        console.log("MyMemory result:", (_b = (_a = response.data) === null || _a === void 0 ? void 0 : _a.responseData) === null || _b === void 0 ? void 0 : _b.translatedText);
    }
    catch (err) {
        console.error("MyMemory error:", (err === null || err === void 0 ? void 0 : err.message) || err);
    }
}
test();
