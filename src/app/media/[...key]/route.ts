import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { readStoredFile } from "@/server/integrations/storage";

// Imágenes públicas subidas desde el panel. Los archivos clínicos NUNCA se sirven por esta ruta.
export async function GET(_: Request, ctx: RouteContext<"/media/[...key]">) {
  const { key } = await ctx.params;
  const storageKey = `media/${key.join("/")}`;
  if (!/^media\/\d{4}\/\d{2}\/[a-f0-9]{32}\.(jpg|png|webp)$/.test(storageKey)) return new NextResponse(null, { status: 404 });
  const asset = await db.mediaAsset.findUnique({ where: { storageKey } });
  if (!asset) return new NextResponse(null, { status: 404 });
  const content = await readStoredFile(storageKey);
  return new NextResponse(new Uint8Array(content), {
    headers: {
      "Content-Type": asset.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
