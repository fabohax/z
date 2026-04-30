import Link from "next/link";


export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6 py-10 sm:px-10">
      <div className="w-full max-w-[460px]">
        <Link href="/" className="mb-4 inline-flex text-sm text-sky-300 transition hover:text-sky-200">
          ← Back to landing page
        </Link>

      </div>
    </main>
  );
}
