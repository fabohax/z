import { notFound } from "next/navigation";
import { nip19 } from "nostr-tools";

export default async function ProfilePage(props: Promise<{ params: { npub: string } }>) {
  const { params } = await props;
  const { npub } = params;
  let pubkeyHex = "";
  try {
    pubkeyHex = nip19.decode(npub).data as string;
  } catch {
    notFound();
  }
  // You can fetch more profile info here if you have a backend or relay
  return (
    <main className="mx-auto max-w-xl py-12 px-4">
      <h1 className="text-2xl font-bold mb-4">Nostr Profile</h1>
      <div className="mb-2 font-mono text-emerald-300 break-all">npub: {npub}</div>
      <div className="mb-2 font-mono text-slate-400 break-all">pubkey: {pubkeyHex}</div>
      <div className="mt-6 text-xs text-slate-500">(This is a placeholder profile page. Add more info here!)</div>
    </main>
  );
}

export const dynamic = "force-static";