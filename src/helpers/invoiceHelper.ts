export const generatePDFInvoice = async (payment: any): Promise<Buffer> => {
  // Dummy implementation for PDF invoice generation
  return Buffer.from(`Invoice for payment: ${payment._id}`)
}
