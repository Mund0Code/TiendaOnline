// src/pages/api/generate-invoice.ts
import type { APIRoute } from "astro";
import PDFDocument from "pdfkit";
import fs from "fs";
import { supabaseAdmin } from "../../lib/supabaseAdminClient";

export const POST: APIRoute = async ({ request }) => {
  try {
    const { orderId } = await request.json();
    if (!orderId) {
      return new Response(JSON.stringify({ error: "orderId es requerido" }), {
        status: 400,
      });
    }

    // 1) Carga el pedido
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("id, amount_total, created_at, customer_email, name")
      .eq("id", orderId)
      .single();
    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Pedido no encontrado" }), {
        status: 404,
      });
    }

    // 2) Prepara el PDF
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const buffers: Buffer[] = [];
    doc.on("data", (chunk) => buffers.push(chunk));

    // Layout
    let y = 50;
    const left = 50;
    const width = doc.page.width - left * 2;

    // Fecha
    const invoiceDate = new Date(order.created_at).toLocaleDateString("es-ES");

    // — Encabezado —
    if (fs.existsSync("./public/Mundonline.png")) {
      doc.image("./public/Mundonline.png", left, y, { width: 40 });
    }
    doc.fontSize(20).text("Mundonline", left + 100, y, {
      width: width - 100,
      align: "right",
    });
    y += 25;
    doc
      .fontSize(10)
      .text("C/ Udonentraße 28", left + 100, y, {
        width: width - 100,
        align: "right",
      })
      .text("Stade, Alemania", { align: "right" });
    y += 20;

    // Línea
    doc
      .strokeColor("#CCCCCC")
      .lineWidth(1)
      .moveTo(left, y)
      .lineTo(left + width, y)
      .stroke();
    y += 15;

    // — Título —
    doc.fontSize(18).fillColor("#333333").text("FACTURA", left, y);
    y += 25;

    // Metadatos
    const shortInv = `INV-${order.id.slice(0, 6).toUpperCase()}`;
    doc
      .fontSize(10)
      .fillColor("#000000")
      .text(`Factura nº: ${shortInv}`, left, y)
      .text(`Fecha: ${invoiceDate}`, left + 200, y);
    y += 20;

    // — Cliente —
    doc.fontSize(12).text("Facturar a:", left, y);
    y += 15;
    doc.fontSize(10).text(order.customer_email, left, y);
    y += 25;

    // — Tabla de items simplificada —
    const rowH = 20;
    const cols = {
      desc: left,
      qty: left + 350,
      unit: left + 420,
    };

    // Cabecera columna con fondo
    doc.rect(left, y, width, rowH).fill("#333333");
    doc
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("DESCRIPCIÓN", cols.desc + 5, y + 5, {
        width: cols.qty - cols.desc - 10,
      })
      .text("CANT.", cols.qty + 5, y + 5)
      .text("PRECIO U.", cols.unit + 5, y + 5);
    y += rowH;

    // Reset estilos
    doc.fillColor("#000000").font("Helvetica");

    // Una fila
    doc
      .text(order.name, cols.desc + 5, y + 5, {
        width: cols.qty - cols.desc - 10,
      })
      .text("1", cols.qty + 5, y + 5)
      .text(`€${order.amount_total.toFixed(2)}`, cols.unit + 5, y + 5);
    // Líneas verticales
    doc.strokeColor("#DDDDDD").lineWidth(0.5);
    [left, cols.qty, cols.unit, left + width].forEach((x) =>
      doc
        .moveTo(x, y)
        .lineTo(x, y + rowH)
        .stroke()
    );
    y += rowH;

    // Línea base
    doc
      .strokeColor("#333333")
      .lineWidth(1)
      .moveTo(left, y)
      .lineTo(left + width, y)
      .stroke();
    y += 15;

    // — Subtotal y Total con borde —
    const labelX = cols.qty;
    const valueX = cols.unit;
    const total = order.amount_total;

    // SUBTOTAL
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("SUBTOTAL", labelX, y, {
        width: valueX - labelX - 5,
        align: "right",
      })
      .text(`€${total.toFixed(2)}`, valueX + 5, y, { align: "right" });
    y += rowH;

    // TOTAL (fila con fondo claro)
    doc.rect(labelX, y, width - (labelX - left), rowH).fill("#F5F5F5");
    doc
      .fillColor("#000000")
      .fontSize(12)
      .text("TOTAL", labelX + 5, y + 5, { continued: false })
      .text(`€${total.toFixed(2)}`, valueX + 5, y + 5, { align: "right" });
    y += rowH + 20;

    // — Pie profesional —
    doc
      .fontSize(10)
      .fillColor("#666666")
      .font("Helvetica-Oblique")
      .text(
        "Gracias por su confianza. El pago se ha realizado con Éxito.",
        left,
        y,
        { width: width, align: "center" }
      );

    // Termina y sube
    doc.end();
    await new Promise<void>((res) => doc.on("end", res));

    const pdfBuffer = Buffer.concat(buffers);
    const fileName = `invoices/${order.id}.pdf`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("invoices")
      .upload(fileName, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });
    if (upErr) throw upErr;

    const { data: urlData, error: urlErr } = await supabaseAdmin.storage
      .from("invoices")
      .createSignedUrl(fileName, 60 * 60 * 24 * 7);
    if (urlErr || !urlData) throw urlErr ?? new Error("No signedUrl");

    await supabaseAdmin
      .from("orders")
      .update({ invoice_url: urlData.signedUrl })
      .eq("id", order.id);

    return new Response(JSON.stringify({ url: urlData.signedUrl }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("Error en generate-invoice:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
