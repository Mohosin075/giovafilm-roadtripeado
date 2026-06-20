"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const stripe_1 = __importDefault(require("stripe"));
const index_1 = __importDefault(require("./index"));
const stripe = new stripe_1.default(index_1.default.stripe.stripeSecretKey, {
    apiVersion: '2025-05-28.basil',
});
exports.default = stripe;
