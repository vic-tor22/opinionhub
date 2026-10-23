
"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "./lib/supabase";

type Poll = {
  id: string;
  question: string;
  description: string | null;
  category: string;
  multiple_answers: boolean;
  anonymous_voting: boolean;
  allow_comments: boolean;
  closing_date: string | null;
};

type PollOption = {
  id: string;
  poll_id: string;
  option_text: string;
};

type VoteCount = {
  option_id: string;
  vote_count: number;
};

export default function PollPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const pollId = params.id;

  const [poll, setPoll] = useState<Poll | null>(null);
  const [options, setOptions] = useState<PollOption[]>([]);
  const [voteCounts, setVoteCounts] = useState<VoteCount[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [recordingAssistedVote, setRecordingAssistedVote] =
    useState(false);

  const [voterName, setVoterName] = useState("");
  const [voterPhone, setVoterPhone] = useState("");
  const [assistedOption, setAssistedOption] = useState("");
  const [consentConfirmed, setConsentConfirmed] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadPoll = useCallback(async () => {
    if (!pollId) return;

    setLoading(true);
    setErrorMessage("");

    try {
      const {
        data: pollData,
        error: pollError,
      } = await supabase
        .from("polls")
        .select("*")
        .eq("id", pollId)
        .single();

      if (pollError) throw pollError;

      const {
        data: optionData,
        error: optionError,
      } = await supabase
        .from("poll_options")
        .select("*")
        .eq("poll_id", pollId)
        .order("created_at", { ascending: true });

      if (optionError) throw optionError;

      const {
        data: countData,
        error: countError,
      } = await supabase.rpc("get_poll_vote_counts", {
        p_poll_id: pollId,
      });

      if (countError) throw countError;

      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError) throw authError;

      setPoll(pollData as Poll);
      setOptions((optionData ?? []) as PollOption[]);
      setVoteCounts(
        ((countData ?? []) as VoteCount[]).map((item) => ({
          ...item,
          vote_count: Number(item.vote_count),
        }))
      );
      setIsLoggedIn(!!authData.user);

      const savedVote = localStorage.getItem(
        `opinionhub-voted-${pollId}`
      );

      setHasVoted(savedVote === "true");
    } catch (error) {
      console.error("Error loading poll:", error);
      setErrorMessage(
        "We could not load this poll. Check your connection and Supabase settings, then try again."
      );
    } finally {
      setLoading(false);
    }
  }, [pollId]);

  useEffect(() => {
    void loadPoll();
  }, [loadPoll]);

  function toggleOption(optionId: string) {
    if (poll?.multiple_answers) {
      setSelectedOptions((current) =>
        current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId]
      );
    } else {
      setSelectedOptions([optionId]);
    }
  }

  async function submitVote() {
    if (selectedOptions.length === 0) {
      setErrorMessage("Please select at least one option.");
      return;
    }

    if (pollClosed) {
      setErrorMessage(
        "This poll has closed and no longer accepts votes."
      );
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const rows = selectedOptions.map((optionId) => ({
        poll_id: pollId,
        option_id: optionId,
      }));

      const { error } = await supabase.from("votes").insert(rows);

      if (error) throw error;

      localStorage.setItem(`opinionhub-voted-${pollId}`, "true");
      setHasVoted(true);
      setSelectedOptions([]);

      setSuccessMessage("Your vote has been recorded!");
      await loadPoll();
    } catch (error) {
      console.error("Error submitting vote:", error);
      setErrorMessage(
        "Your vote could not be saved. Please check your Supabase permissions and try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function submitAssistedVote() {
    setErrorMessage("");
    setSuccessMessage("");

    if (!isLoggedIn) {
      setErrorMessage(
        "Please log in before recording another person's vote."
      );
      return;
    }

    if (!hasVoted) {
      setErrorMessage(
        "Vote in this poll first before recording another person's vote."
      );
      return;
    }

    if (pollClosed) {
      setErrorMessage("This poll is closed.");
      return;
    }

    const cleanName = voterName.trim();
    const cleanPhone = voterPhone.trim();

    if (cleanName.length < 2 || cleanName.length > 100) {
      setErrorMessage(
        "Enter a name between 2 and 100 characters."
      );
      return;
    }

    if (!/^[+0-9()\s-]{7,20}$/.test(cleanPhone)) {
      setErrorMessage(
        "Enter a valid phone number between 7 and 20 characters."
      );
      return;
    }

    if (!assistedOption) {
      setErrorMessage("Select the person's answer.");
      return;
    }

    if (!consentConfirmed) {
      setErrorMessage(
        "Please confirm that the person gave permission for their vote to be recorded."
      );
      return;
    }

    setRecordingAssistedVote(true);

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError) throw authError;

      const user = authData.user;

      if (!user) {
        setIsLoggedIn(false);
        throw new Error("Please log in to record an assisted vote.");
      }

      const { error } = await supabase
        .from("assisted_votes")
        .insert({
          poll_id: pollId,
          option_id: assistedOption,
          recorded_by: user.id,
          voter_name: cleanName,
          voter_phone: cleanPhone,
          authorization_confirmed: true,
        });

      if (error) {
        if (error.code === "23505") {
          throw new Error(
            "This phone number has already been recorded for this poll."
          );
        }

        throw error;
      }

      setVoterName("");
      setVoterPhone("");
      setAssistedOption("");
      setConsentConfirmed(false);

      setSuccessMessage(
        "The person's vote has been recorded successfully!"
      );

      await loadPoll();
    } catch (error) {
      console.error("Error recording assisted vote:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The vote could not be recorded. Check your Supabase permissions and try again."
      );
    } finally {
      setRecordingAssistedVote(false);
    }
  }

  function optionVoteCount(optionId: string) {
    return (
      voteCounts.find((item) => item.option_id === optionId)
        ?.vote_count ?? 0
    );
  }

  const totalVotes = voteCounts.reduce(
    (total, item) => total + item.vote_count,
    0
  );

  function optionPercentage(optionId: string) {
    if (totalVotes === 0) return 0;

    return Math.round(
      (optionVoteCount(optionId) / totalVotes) * 100
    );
  }

  const pollClosed =
    !!poll?.closing_date &&
    new Date(poll.closing_date) <= new Date();

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p className="text-gray-600">Loading poll...</p>
      </main>
    );
  }

  if (errorMessage && !poll) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p className="rounded-lg bg-red-50 p-4 text-red-700">
          {errorMessage}
        </p>
        <button
          onClick={() => void loadPoll()}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white"
        >
          Try Again
        </button>
      </main>
    );
  }

  if (!poll) return null;

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <button
        onClick={() => router.push("/")}
        className="text-sm font-medium text-blue-600 hover:underline"
      >
        ← Back to Explore
      </button>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
            {poll.category}
          </span>

          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              pollClosed
                ? "bg-red-50 text-red-700"
                : "bg-green-50 text-green-700"
            }`}
          >
            {pollClosed ? "Closed" : "Open"}
          </span>
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          {poll.question}
        </h1>

        {poll.description && (
          <p className="mt-3 whitespace-pre-wrap text-gray-600">
            {poll.description}
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-4 text-sm text-gray-500">
          <span>
            {totalVotes} recorded vote
            {totalVotes === 1 ? "" : "s"}
          </span>

          <span>
            {poll.multiple_answers
              ? "Multiple answers allowed"
              : "Choose one answer"}
          </span>
        </div>
      </section>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
        >
          {successMessage}
        </div>
      )}

      {!hasVoted && !pollClosed && (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">
            Cast your vote
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            {poll.multiple_answers
              ? "Select all answers that apply."
              : "Select one answer."}
          </p>

          <div className="mt-5 space-y-3">
            {options.map((option) => (
              <label
                key={option.id}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                  selectedOptions.includes(option.id)
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-blue-300"
                }`}
              >
                <input
                  type={
                    poll.multiple_answers ? "checkbox" : "radio"
                  }
                  name="poll-answer"
                  checked={selectedOptions.includes(option.id)}
                  onChange={() => toggleOption(option.id)}
                  className="h-4 w-4 accent-blue-600"
                />

                <span className="text-gray-800">
                  {option.option_text}
                </span>
              </label>
            ))}
          </div>

          <button
            onClick={() => void submitVote()}
            disabled={submitting || options.length === 0}
            className="mt-5 w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Vote"}
          </button>
        </section>
      )}

      {(hasVoted || pollClosed) && (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">
            Poll Results
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Results include normal votes and recorded assisted votes.
          </p>

          <div className="mt-5 space-y-5">
            {options.map((option) => {
              const count = optionVoteCount(option.id);
              const percentage = optionPercentage(option.id);

              return (
                <div key={option.id}>
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <span className="font-medium text-gray-800">
                      {option.option_text}
                    </span>

                    <span className="shrink-0 text-sm text-gray-500">
                      {count} · {percentage}%
                    </span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {hasVoted && !pollClosed && (
        <section className="rounded-2xl border border-blue-200 bg-blue-50/50 p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Record Another Person&apos;s Vote
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              If another person has given you permission to record
              their choice, enter their details below. Their name
              and phone number are kept out of the public results.
            </p>
          </div>

          {!isLoggedIn ? (
            <div className="rounded-xl border border-blue-100 bg-white p-4">
              <p className="text-sm text-gray-700">
                You must be logged in to record another person&apos;s
                vote.
              </p>

              <button
                onClick={() => router.push("/login")}
                className="mt-3 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
              >
                Log In
              </button>
            </div>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void submitAssistedVote();
              }}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="voterName"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Voter&apos;s Name
                </label>

                <input
                  id="voterName"
                  type="text"
                  autoComplete="name"
                  minLength={2}
                  maxLength={100}
                  required
                  value={voterName}
                  onChange={(event) =>
                    setVoterName(event.target.value)
                  }
                  placeholder="Enter the person's name"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="voterPhone"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Voter&apos;s Phone Number
                </label>

                <input
                  id="voterPhone"
                  type="tel"
                  autoComplete="off"
                  maxLength={20}
                  required
                  value={voterPhone}
                  onChange={(event) =>
                    setVoterPhone(event.target.value)
                  }
                  placeholder="e.g. +254712345678"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <fieldset>
                <legend className="mb-2 text-sm font-medium text-gray-700">
                  Which option did this person choose?
                </legend>

                <div className="space-y-2">
                  {options.map((option) => (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border bg-white p-3 ${
                        assistedOption === option.id
                          ? "border-blue-500"
                          : "border-gray-200"
                      }`}
                    >
                      <input
                        type="radio"
                        name="assistedOption"
                        value={option.id}
                        checked={assistedOption === option.id}
                        onChange={() =>
                          setAssistedOption(option.id)
                        }
                        required
                        className="h-4 w-4 accent-blue-600"
                      />

                      <span className="text-sm text-gray-800">
                        {option.option_text}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4">
                <input
                  type="checkbox"
                  checked={consentConfirmed}
                  onChange={(event) =>
                    setConsentConfirmed(event.target.checked)
                  }
                  required
                  className="mt-1 h-4 w-4 accent-blue-600"
                />

                <span className="text-sm leading-5 text-gray-700">
                  I confirm that this person gave permission for
                  their choice and contact details to be recorded.
                </span>
              </label>

              <button
                type="submit"
                disabled={recordingAssistedVote}
                className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {recordingAssistedVote
                  ? "Recording Vote..."
                  : "Record This Vote"}
              </button>

              <p className="text-xs leading-5 text-gray-500">
                Each phone number can be recorded only once per
                poll. Avoid entering anyone&apos;s details without
                their permission.
              </p>
            </form>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Share This Poll
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Invite others to participate in this poll.
        </p>

        <button
          onClick={() => {
            void navigator.clipboard
              .writeText(window.location.href)
              .then(() => {
                setErrorMessage("");
                setSuccessMessage("Poll link copied!");
              })
              .catch(() => {
                setErrorMessage(
                  "Could not copy the link. Copy it from your browser's address bar instead."
                );
              });
          }}
          className="mt-4 rounded-xl border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
        >
          Copy Poll Link
        </button>
      </section>

      {poll.allow_comments && (
        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Comments
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Comments are not enabled yet. We can add this feature
            after voting is working correctly.
          </p>
        </section>
      )}
    </main>
  );
}
