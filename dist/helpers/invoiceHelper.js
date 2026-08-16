"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePDFInvoice = void 0;
const generatePDFInvoice = async (payment) => {
    // Dummy implementation for PDF invoice generation
    return Buffer.from(`Invoice for payment: ${payment._id}`);
};
exports.generatePDFInvoice = generatePDFInvoice;
