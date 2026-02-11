import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateInvoicePDF } from "@/lib/invoice-pdf";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      invoiceNumber,
      purchaseDate,
      customerName,
      customerEmail,
      paymentMethod,
      transactionId,
      items,
      totalAmount,
      currency,
    } = body;

    // Validate required fields
    if (!invoiceNumber || !purchaseDate || !customerName || !customerEmail || !items || !totalAmount || !currency) {
      return NextResponse.json({ error: "Missing required invoice data" }, { status: 400 });
    }

    // Generate PDF
    const pdfUrl = await generateInvoicePDF({
      invoiceNumber,
      purchaseDate: new Date(purchaseDate),
      customerName,
      customerEmail,
      paymentMethod,
      transactionId,
      items,
      totalAmount,
      currency,
    });

    return NextResponse.json({ pdfUrl });
  } catch (error) {
    console.error("Invoice PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate invoice PDF" },
      { status: 500 }
    );
  }
}