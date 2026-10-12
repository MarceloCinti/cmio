import { NextResponse } from "next/server";
import { getCurrentActor } from "@/server/auth/current";
import { getDocumentForDownload } from "@/server/services/documents";
import { AppError } from "@/server/errors";

// Descarga protegida de documentos clínicos: requiere sesión y permiso; nunca se cachea.
export async function GET(request: Request, ctx: RouteContext<"/api/documentos/[id]">) {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ error: "Debes ingresar para descargar documentos." }, { status: 401 });
  const { id } = await ctx.params;
  try {
    const { doc, content } = await getDocumentForDownload(actor, id);
    const inline = new URL(request.url).searchParams.get("ver") === "1";
    const ext = doc.mimeType === "application/pdf" ? "pdf" : doc.mimeType === "image/png" ? "png" : "jpg";
    const safeName = `${doc.title.replace(/[^\p{L}\p{N} _-]/gu, "").trim().slice(0, 80) || "documento"}.${ext}`;
    return new NextResponse(new Uint8Array(content), {
      headers: {
        "Content-Type": doc.mimeType,
        "Content-Length": String(content.length),
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="documento.${ext}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
      },
    });
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: "No encontramos el documento o no tienes acceso." }, { status: 404 });
    throw error;
  }
}
