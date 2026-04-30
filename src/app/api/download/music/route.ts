import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { statSync } from "node:fs";
import { resolve } from "node:path";

const MUSIC_COOKIES_PATH = resolve(process.cwd(), "music-yt-cookies.txt");
const YT_DLP_BINARY = process.env.YT_DLP_BINARY_PATH || "yt-dlp";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url || !url.startsWith("https://music.youtube.com/")) {
    return NextResponse.json({ error: "Only music.youtube.com links are supported." }, { status: 400 });
  }

  // Check if cookies file exists
  try {
    statSync(MUSIC_COOKIES_PATH);
  } catch {
    return NextResponse.json({ error: "music-yt-cookies.txt not found on server." }, { status: 500 });
  }

  // Prepare yt-dlp args for best audio
  const args = [
    "--ignore-config",
    "--no-playlist",
    "--no-warnings",
    "--extractor-retries", "2",
    "--cookies", MUSIC_COOKIES_PATH,
    "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
    "-f", "bestaudio[ext=m4a]/bestaudio",
    "-o", "-",
    url,
  ];

  const child = spawn(YT_DLP_BINARY, args, { stdio: ["ignore", "pipe", "pipe"] });
  let stderrOutput = "";
  child.stderr?.on("data", (chunk) => { stderrOutput += chunk.toString(); });
  child.on("error", (error) => { child.stdout?.destroy(error); });
  child.on("close", (code) => {
    if (code && code !== 0) {
      child.stdout?.destroy(new Error(stderrOutput.trim() || "yt-dlp failed to start the download."));
    }
  });

  // Set a generic filename
  const fileName = "music-audio.m4a";
  const contentType = "audio/mp4";

  return new NextResponse(Readable.toWeb(child.stdout) as ReadableStream, {
    headers: {
      "Content-Disposition": `attachment; filename=\"${fileName}\"`,
      "Content-Type": contentType,
      "Cache-Control": "no-store",
      "X-File-Name": encodeURIComponent(fileName),
    },
  });
}
