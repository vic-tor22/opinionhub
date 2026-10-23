
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "./polls/[id]/lib/supabase";

type Poll = {
  id: string;
  question: string;
  description: string | null;
  category: string;
  created_at: string;
  closing_date: string | null;
  multiple_answers: boolean;
};

type PollOption = {
  id: string;
  poll_id: string;
  option_text: string;
};

const categories = [
  "Technology",
  "Education",
  "Business",
  "Politics",
  "Sports",
  "Entertainment",
  "Health",
  "Lifestyle",
];

export default function Home() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [options, setOptions] = useState<PollOption[]>([]);
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email?: string;
  } | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadPolls() {
      setLoading(true);
      setErrorMessage("");

      try {
        const [
          { data: pollData, error: pollError },
          { data: optionData, error: optionError },
        ] = await Promise.all([
          supabase
            .from("polls")
            .select("*")
            .order("created_at", { ascending: false }),

          supabase
            .from("poll_options")
            .select("id, poll_id, option_text")
            .order("created_at", { ascending: true }),
        ]);

        if (pollError) throw pollError;
        if (optionError) throw optionError;

        const loadedPolls = (pollData ?? []) as Poll[];
        const loadedOptions = (optionData ?? []) as PollOption[];

        const countResults = await Promise.all(
          loadedPolls.map(async (poll) => {
            const { data, error } = await supabase.rpc(
              "get_poll_vote_counts",
              { p_poll_id: poll.id }
            );

            if (error) throw error;

            const total = (data ?? []).reduce(
              (sum: number, item: { vote_count: number | string }) =>
                sum + Number(item.vote_count),
              0
            );

            return { pollId: poll.id, total };
          })
        );

        if (!mounted) return;

        const counts: Record<string, number> = {};

        for (const result of countResults) {
          counts[result.pollId] = result.total;
        }

        setPolls(loadedPolls);
        setOptions(loadedOptions);
        setVoteCounts(counts);
      } catch (error) {
        if (!mounted) return;

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load polls. Please try again."
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadPolls();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadCurrentUser() {
      const { data } = await supabase.auth.getUser();

      if (mounted) {
        setCurrentUser(
          data.user
            ? { id: data.user.id, email: data.user.email }
            : null
        );
      }
    }

    loadCurrentUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(
        session?.user
          ? {
              id: session.user.id,
              email: session.user.email,
            }
          : null
      );
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    setLoggingOut(true);

    const { error } = await supabase.auth.signOut();

    setLoggingOut(false);

    if (error) {
      setErrorMessage(`Logout failed: ${error.message}`);
      return;
    }

    setCurrentUser(null);
  }

  const filteredPolls = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return polls.filter((poll) => {
      const matchesSearch =
        poll.question.toLowerCase().includes(searchTerm) ||
        (poll.description ?? "").toLowerCase().includes(searchTerm) ||
        poll.category.toLowerCase().includes(searchTerm);

      const matchesCategory =
        selectedCategory === "All" ||
        poll.category.toLowerCase() === selectedCategory.toLowerCase();

      return matchesSearch && matchesCategory;
    });
  }, [polls, search, selectedCategory]);

  const totalOptions = options.length;

  const totalVotes = Object.values(voteCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  const categoryCount = new Set(polls.map((poll) => poll.category)).size;

  function getPollOptions(pollId: string) {
    return options.filter((option) => option.poll_id === pollId);
  }

  function getPollVotes(pollId: string) {
    return voteCounts[pollId] ?? 0;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* HEADER */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-xl font-bold text-white">
              O
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                OpinionHub
              </h1>
              <p className="text-xs text-slate-500">
                Your opinion. Your voice.
              </p>
            </div>
          </Link>

          <nav className="hidden gap-6 md:flex">
            <a
              href="#polls"
              className="text-sm font-medium text-slate-600 hover:text-indigo-600"
            >
              Explore
            </a>
            <a
              href="#categories"
              className="text-sm font-medium text-slate-600 hover:text-indigo-600"
            >
              Categories
            </a>
            <a
              href="#how-it-works"
              className="text-sm font-medium text-slate-600 hover:text-indigo-600"
            >
              How It Works
            </a>
          </nav>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Link
              href="/create"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Create Poll
            </Link>

            {currentUser ? (
              <>
                <span
                  className="hidden max-w-48 truncate text-sm text-slate-600 sm:inline"
                  title={currentUser.email ?? ""}
                >
                  {currentUser.email ?? "Signed in"}
                </span>
                <Link
                  href="/profile"
                  className="text-sm font-semibold text-indigo-600 hover:underline"
                >
                  Account
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {loggingOut ? "Logging out..." : "Logout"}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-semibold text-indigo-600 hover:underline"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="rounded-lg border border-indigo-600 px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO AND SEARCH */}
      <section className="bg-gradient-to-b from-white via-indigo-50 to-slate-50">
        <div className="mx-auto max-w-5xl px-6 py-16 text-center sm:py-24">
          <div className="mb-6 inline-block rounded-full border border-indigo-100 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm">
            A place for every opinion
          </div>

          <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
            Ask.
            <span className="text-indigo-600"> Vote.</span>
            <br />
            Be heard.
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Create polls on anything, collect opinions from people,
            discover different perspectives, and join meaningful
            conversations.
          </p>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              document
                .getElementById("polls")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
            className="mx-auto mt-10 max-w-3xl rounded-2xl border border-indigo-100 bg-white p-3 shadow-lg shadow-indigo-100/60"
            role="search"
          >
            <label
              htmlFor="homepage-poll-search"
              className="mb-2 block text-left text-sm font-bold text-slate-800"
            >
              Search polls and topics
            </label>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border-2 border-slate-300 bg-white px-4 transition focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-6 w-6 shrink-0 text-slate-500"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m16 16 4 4" />
                </svg>

                <input
                  id="homepage-poll-search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Try technology, education, sports..."
                  aria-label="Search polls by question, description, or category"
                  className="min-w-0 flex-1 bg-transparent py-4 text-base text-slate-900 outline-none placeholder:text-slate-500"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="shrink-0 rounded-md px-2 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                    aria-label="Clear search"
                  >
                    Clear
                  </button>
                )}
              </div>

              <button
                type="submit"
                className="rounded-xl bg-indigo-600 px-8 py-4 text-base font-bold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200"
              >
                Search Polls
              </button>
            </div>

            <p className="mt-3 text-left text-sm text-slate-500">
              Search results update as you type. You can also filter by
              category below.
            </p>
          </form>

          {search.trim() !== "" && (
            <p
              className="mt-4 text-sm font-semibold text-indigo-700"
              aria-live="polite"
            >
              {loading
                ? "Searching polls..."
                : `${filteredPolls.length} ${
                    filteredPolls.length === 1 ? "poll" : "polls"
                  } found for "${search.trim()}"`}
            </p>
          )}

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setSelectedCategory("All");
              document
                .getElementById("polls")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
            className="mt-5 text-sm font-semibold text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-indigo-700"
          >
            Browse all polls
          </button>
        </div>
      </section>

      {/* LIVE STATISTICS */}
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-5xl grid-cols-2 md:grid-cols-4">
          {[
            { value: polls.length, label: "Polls Created" },
            { value: totalVotes.toLocaleString(), label: "Votes Cast" },
            {
              value: totalOptions.toLocaleString(),
              label: "Answer Options",
            },
            { value: categoryCount, label: "Categories Used" },
          ].map((stat) => (
            <div key={stat.label} className="p-8 text-center">
              <p className="text-3xl font-bold text-slate-900">
                {loading ? "—" : stat.value}
              </p>
              <p className="mt-1 text-sm text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* EXPLORE POLLS */}
      <section id="polls" className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-wider text-indigo-600">
            Discover
          </p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            Explore Polls
          </h2>
          <p className="mt-2 text-slate-500">
            Discover questions people are answering in the community.
          </p>
        </div>

        {/* CATEGORY FILTERS */}
        <div className="mb-8 flex flex-wrap gap-2">
          {["All", ...categories].map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              aria-pressed={selectedCategory === category}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                selectedCategory === category
                  ? "bg-indigo-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-indigo-400 hover:text-indigo-600"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <p className="font-semibold text-slate-700">Loading polls...</p>
            <p className="mt-2 text-sm text-slate-500">
              Connecting to the OpinionHub database.
            </p>
          </div>
        ) : errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-white p-8 text-center">
            <h3 className="text-lg font-bold text-slate-900">
              Could not load polls
            </h3>
            <p className="mt-3 break-words text-sm text-red-600">
              {errorMessage}
            </p>
            <p className="mt-3 text-sm text-slate-500">
              Check your Supabase connection and database access policies.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Try Again
            </button>
          </div>
        ) : filteredPolls.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <h3 className="text-xl font-bold text-slate-900">
              No polls found
            </h3>
            <p className="mt-2 text-slate-500">
              Try another search or category, or create a new poll.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSelectedCategory("All");
              }}
              className="mt-5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Clear filters
            </button>
            <div>
              <Link
                href="/create"
                className="mt-4 inline-block font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Create a Poll →
              </Link>
            </div>
          </div>
        ) : (
          <>
            <p className="mb-5 text-sm text-slate-500">
              Showing {filteredPolls.length}{" "}
              {filteredPolls.length === 1 ? "poll" : "polls"}
            </p>

            <div className="grid gap-6 lg:grid-cols-3">
              {filteredPolls.map((poll) => {
                const pollOptions = getPollOptions(poll.id);
                const pollVotes = getPollVotes(poll.id);
                const isClosed =
                  poll.closing_date !== null &&
                  new Date(poll.closing_date).getTime() <= Date.now();

                return (
                  <article
                    key={poll.id}
                    className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
                        {poll.category}
                      </span>
                      {isClosed && (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          Closed
                        </span>
                      )}
                    </div>

                    <h3 className="mt-5 text-lg font-bold leading-7 text-slate-900">
                      {poll.question}
                    </h3>

                    {poll.description && (
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">
                        {poll.description}
                      </p>
                    )}

                    <div className="mt-5 flex-1 space-y-3">
                      {pollOptions.length > 0 ? (
                        pollOptions.slice(0, 4).map((option, index) => (
                          <div
                            key={option.id}
                            className="flex items-center rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-700"
                          >
                            <span className="mr-3 font-bold text-indigo-600">
                              {String.fromCharCode(65 + index)}
                            </span>
                            <span className="break-words">
                              {option.option_text}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">
                          No answer options available.
                        </p>
                      )}

                      {pollOptions.length > 4 && (
                        <p className="text-xs text-slate-500">
                          +{pollOptions.length - 4} more options
                        </p>
                      )}
                    </div>

                    <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
                      <span className="text-sm text-slate-500">
                        {pollVotes.toLocaleString()}{" "}
                        {pollVotes === 1 ? "vote" : "votes"}
                      </span>

                      <Link
                        href={`/polls/${poll.id}`}
                        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600"
                      >
                        View Poll →
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* CATEGORIES */}
      <section id="categories" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-indigo-600">
              Explore
            </p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">
              Browse Categories
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-500">
              Find polls and conversations across different areas of interest.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => {
                  setSelectedCategory(category);
                  document
                    .getElementById("polls")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className={`rounded-xl border bg-white p-6 font-semibold shadow-sm transition hover:border-indigo-400 hover:text-indigo-600 ${
                  selectedCategory === category
                    ? "border-indigo-500 text-indigo-600"
                    : "border-slate-200 text-slate-700"
                }`}
              >
                {category}
                <span className="mt-1 block text-xs font-normal text-slate-500">
                  {
                    polls.filter(
                      (poll) =>
                        poll.category.toLowerCase() ===
                        category.toLowerCase()
                    ).length
                  }{" "}
                  polls
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-indigo-600">
              Simple Process
            </p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">
              How OpinionHub Works
            </h2>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              {
                number: "1",
                title: "Create a Poll",
                description:
                  "Create a question, add answer choices, select your settings, and publish it.",
              },
              {
                number: "2",
                title: "Collect Opinions",
                description:
                  "Share your poll and allow people to vote and express their opinions.",
              },
              {
                number: "3",
                title: "Understand Results",
                description:
                  "View results, compare responses, and understand what people think.",
              },
            ].map((step) => (
              <div
                key={step.number}
                className="rounded-2xl bg-white p-8 text-center shadow-sm"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-600">
                  {step.number}
                </div>
                <h3 className="mt-5 text-lg font-bold">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="bg-indigo-600 px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-white sm:text-4xl">
          Have something to ask?
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-indigo-100">
          Create a poll and start collecting opinions from your community.
        </p>
        <Link
          href="/create"
          className="mt-8 inline-block rounded-xl bg-white px-8 py-3 font-semibold text-indigo-700 hover:bg-indigo-50"
        >
          Create Your First Poll
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 px-6 py-12 text-center">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white">
              O
            </div>
            <span className="font-bold text-white">OpinionHub</span>
          </div>
          <p className="mt-3 text-sm text-slate-400">
            Your opinion. Your voice.
          </p>
          <p className="mt-6 text-xs text-slate-500">
            © 2026 OpinionHub. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
