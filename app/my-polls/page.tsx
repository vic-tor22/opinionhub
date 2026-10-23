
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../polls/[id]/lib/supabase";

type Poll = {
  id: string;
  question: string;
  description: string | null;
  category: string;
  created_at: string;
  closing_date: string | null;
};

export default function MyPollsPage() {
  const router = useRouter();

  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadMyPolls = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      // Check which user is currently logged in.
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        router.replace("/login");
        return;
      }

      // Retrieve only polls created by this user.
      const { data, error } = await supabase
        .from("polls")
        .select(
          "id, question, description, category, created_at, closing_date"
        )
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setPolls((data ?? []) as Poll[]);
    } catch (error) {
      console.error("Error loading My Polls:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load your polls. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadMyPolls();
  }, [loadMyPolls]);

  function isPollClosed(poll: Poll) {
    if (!poll.closing_date) return false;

    // Treat the closing date as open through the end of that day.
    const closingTime = new Date(
      `${poll.closing_date.slice(0, 10)}T23:59:59.999`
    );

    return closingTime.getTime() < Date.now();
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            OpinionHub
          </Link>

          <nav className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Explore
            </Link>

            <Link
              href="/create"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Create Poll
            </Link>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
              Your dashboard
            </p>

            <h1 className="mt-2 text-4xl font-bold text-slate-950">
              My Polls
            </h1>

            <p className="mt-3 text-slate-600">
              Manage your polls and see what people think.
            </p>
          </div>

          <Link
            href="/create"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700"
          >
            + Create a Poll
          </Link>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <p className="text-slate-600">Loading your polls...</p>
          </div>
        )}

        {/* Error state */}
        {!loading && errorMessage && (
          <div
            role="alert"
            className="rounded-xl border border-red-300 bg-red-50 p-5 text-red-800"
          >
            <p className="font-semibold">
              We couldn't load your polls.
            </p>

            <p className="mt-2 break-words text-sm">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() => void loadMyPolls()}
              className="mt-4 rounded-lg bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !errorMessage && polls.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-3xl">
              📊
            </div>

            <h2 className="mt-5 text-2xl font-bold text-slate-900">
              You haven't created any polls yet
            </h2>

            <p className="mx-auto mt-3 max-w-lg text-slate-600">
              Create your first poll and start collecting opinions
              from people on OpinionHub.
            </p>

            <Link
              href="/create"
              className="mt-6 inline-flex rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700"
            >
              Create Your First Poll
            </Link>
          </div>
        )}

        {/* Poll list */}
        {!loading && !errorMessage && polls.length > 0 && (
          <>
            <div className="mb-5 flex items-center justify-between">
              <p className="font-semibold text-slate-700">
                {polls.length}{" "}
                {polls.length === 1 ? "poll" : "polls"} created
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {polls.map((poll) => {
                const closed = isPollClosed(poll);

                return (
                  <article
                    key={poll.id}
                    className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold capitalize text-blue-700">
                        {poll.category}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          closed
                            ? "bg-slate-100 text-slate-600"
                            : "bg-green-50 text-green-700"
                        }`}
                      >
                        {closed ? "Closed" : "Open"}
                      </span>
                    </div>

                    <h2 className="mt-5 text-xl font-bold leading-7 text-slate-950">
                      {poll.question}
                    </h2>

                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                      {poll.description || "No description provided."}
                    </p>

                    <div className="mt-5 space-y-2 text-sm text-slate-500">
                      <p>
                        Created:{" "}
                        {new Date(poll.created_at).toLocaleDateString()}
                      </p>

                      {poll.closing_date && (
                        <p>
                          Closes:{" "}
                          {new Date(
                            `${poll.closing_date.slice(0, 10)}T12:00:00`
                          ).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    <div className="mt-auto pt-6">
                      <Link
                        href={`/polls/${poll.id}`}
                        className="block rounded-xl bg-blue-600 px-4 py-3 text-center font-bold text-white hover:bg-blue-700"
                      >
                        View Poll and Results
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-slate-600">
          © 2026 OpinionHub. Ask. Vote. Be heard.
        </div>
      </footer>
    </main>
  );
}
