"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../polls/[id]/lib/supabase";

export default function ProfilePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      const { data, error } = await supabase.auth.getUser();

      if (!mounted) return;

      if (error || !data.user) {
        router.replace("/login");
        return;
      }

      setEmail(data.user.email ?? "");
      setCreatedAt(data.user.created_at ?? "");
      setLoading(false);
    }

    loadProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.replace("/login");
      } else if (mounted) {
        setEmail(session.user.email ?? "");
        setCreatedAt(session.user.created_at ?? "");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  async function handleLogout() {
    setLoggingOut(true);
    setErrorMessage("");

    const { error } = await supabase.auth.signOut();

    setLoggingOut(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <p className="text-slate-600">Loading your account...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="text-sm font-semibold text-indigo-600 hover:underline"
        >
          ← Back to OpinionHub
        </Link>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-600 text-2xl font-bold text-white">
            O
          </div>

          <h1 className="mt-5 text-3xl font-bold text-slate-900">
            My Account
          </h1>
          <p className="mt-2 text-slate-600">
            View your OpinionHub account details.
          </p>

          <div className="mt-8 space-y-5">
            <div className="rounded-xl border border-slate-200 p-5">
              <p className="text-sm font-medium text-slate-500">
                Email address
              </p>
              <p className="mt-1 break-words font-semibold text-slate-900">
                {email}
              </p>
              <p className="mt-2 text-xs text-green-700">Signed in</p>
            </div>

            {createdAt && (
              <div className="rounded-xl border border-slate-200 p-5">
                <p className="text-sm font-medium text-slate-500">
                  Account created
                </p>
                <p className="mt-1 font-semibold text-slate-900">
                  {new Date(createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            )}
          </div>

          {errorMessage && (
            <p
              role="alert"
              className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {errorMessage}
            </p>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/create"
              className="rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Create a Poll
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {loggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
