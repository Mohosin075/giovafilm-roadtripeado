"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DISCOUNT_TYPE = exports.OFFER_STATUS = void 0;
var OFFER_STATUS;
(function (OFFER_STATUS) {
    OFFER_STATUS["ACTIVE"] = "Active";
    OFFER_STATUS["EXPIRED"] = "Expired";
    OFFER_STATUS["PAUSED"] = "Paused";
})(OFFER_STATUS || (exports.OFFER_STATUS = OFFER_STATUS = {}));
var DISCOUNT_TYPE;
(function (DISCOUNT_TYPE) {
    DISCOUNT_TYPE["PERCENTAGE"] = "Percentage";
    DISCOUNT_TYPE["FLAT"] = "Flat";
    DISCOUNT_TYPE["FREE_ITEM"] = "Free item";
    DISCOUNT_TYPE["BOGO"] = "BOGO";
})(DISCOUNT_TYPE || (exports.DISCOUNT_TYPE = DISCOUNT_TYPE = {}));
