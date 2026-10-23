
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../polls/[id]/lib/supabase";

export default function CreatePollPage() {
  const router = useRouter();

  const [options, setOptions] = useState(["", ""]);
  const [multipleAnswers, setMultipleAnswers] = useState(false);
  const [anonymousVoting, setAnonymousVoting] = useState(false);
  const [allowComments, setAllowComments] = useState(true);

  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [closingDate, setClosingDate] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const inputClass =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-normal text-slate-900 placeholder:text-slate-500 caret-indigo-600 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100";

  function addOption() {
    setOptions([...options, ""]);
  }

  function removeOption(index: number) {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  }

  function updateOption(index: number, value: string) {
    const updatedOptions = [...options];
    updatedOptions[index] = value;
    setOptions(updatedOptions);
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const cleanedOptions = options
        .map((option) => option.trim())
        .filter((option) => option !== "");

      if (!question.trim()) {
        setErrorMessage("Please enter a poll question.");
        return;
      }

      if (!category) {
        setErrorMessage("Please select a category.");
        return;
      }

      if (cleanedOptions.length < 2) {
        setErrorMessage("Please provide at least two answer options.");
        return;
      }

      // Get the currently logged-in user.
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setErrorMessage(
          "Please log in before creating a poll."
        );
        return;
      }

      // Create the poll and associate it with its creator.
      const { data: poll, error: pollError } = await supabase
        .from("polls")
        .insert({
          question: question.trim(),
          description: description.trim() || null,
          category,
          multiple_answers: multipleAnswers,
          anonymous_voting: anonymousVoting,
          allow_comments: allowComments,
          closing_date: closingDate || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (pollError) {
        console.error("Poll creation error:", pollError);
        throw new Error(pollError.message);
      }

      if (!poll) {
        throw new Error("The poll could not be created.");
      }

      // Save the answer options.
      const optionRows = cleanedOptions.map((option) => ({
        poll_id: poll.id,
        option_text: option,
      }));

      const { error: optionsError } = await supabase
        .from("poll_options")
        .insert(optionRows);

      if (optionsError) {
        console.error(
          "Options creation error:",
          optionsError
        );
        throw new Error(optionsError.message);
      }

      // Open the newly created poll.
      router.push(`/polls/${poll.id}`);
    } catch (error) {
      console.error("Create poll error:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while creating your poll."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5">
          <a href="/" className="text-2xl font-bold text-blue-600">
            OpinionHub
          </a>

          <nav className="hidden gap-8 md:flex">
            <a
              href="/"
              className="text-sm font-medium text-slate-700 hover:text-blue-600"
            >
              Explore
            </a>
            <a
              href="/#categories"
              className="text-sm font-medium text-slate-700 hover:text-blue-600"
            >
              Categories
            </a>
            <a
              href="/#how-it-works"
              className="text-sm font-medium text-slate-700 hover:text-blue-600"
            >
              How It Works
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="/login"
              className="hidden rounded-lg px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100 sm:block"
            >
              Sign In
            </a>

            <a
              href="/create"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Create Poll
            </a>
          </div>
        </div>
      </header>

      {/* Page heading */}
      <section className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-10 text-center">
          <p className="mb-3 text-sm font-bold uppercase tracking-wide text-blue-700">
            OpinionHub
          </p>

          <h1 className="text-4xl font-bold text-slate-950">
            Create a Poll
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-base text-slate-700">
            Ask a question, collect opinions, and discover what people think.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Poll Information */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-bold text-slate-950">
              Poll Information
            </h2>

            <p className="mt-1 text-sm text-slate-700">
              Tell people what you want their opinion about.
            </p>

            <div className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="question"
                  className="mb-2 block text-sm font-bold text-slate-800"
                >
                  Poll Question
                </label>

                <input
                  id="question"
                  type="text"
                  required
                  value={question}
                  onChange={(event) =>
                    setQuestion(event.target.value)
                  }
                  placeholder="What would you like to ask?"
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="mb-2 block text-sm font-bold text-slate-800"
                >
                  Description
                </label>

                <textarea
                  id="description"
                  rows={4}
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  placeholder="Give voters some additional context..."
                  className={`${inputClass} resize-y`}
                />
              </div>

              <div>
                <label
                  htmlFor="category"
                  className="mb-2 block text-sm font-bold text-slate-800"
                >
                  Category
                </label>

                <select
                  id="category"
                  required
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value)
                  }
                  className={`${inputClass} cursor-pointer`}
                >
                  <option value="">Select a category</option>
                  <option value="technology">Technology</option>
                  <option value="education">Education</option>
                  <option value="business">Business</option>
                  <option value="politics">Politics</option>
                  <option value="sports">Sports</option>
                  <option value="entertainment">Entertainment</option>
                  <option value="health">Health</option>
                  <option value="lifestyle">Lifestyle</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Answer Options */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-bold text-slate-950">
              Answer Options
            </h2>

            <p className="mt-1 text-sm text-slate-700">
              Add at least two choices for voters.
            </p>

            <div className="mt-6 space-y-3">
              {options.map((option, index) => (
                <div key={index} className="flex gap-3">
                  <div className="flex min-w-0 flex-1 items-center">
                    <span className="mr-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">
                      {index + 1}
                    </span>

                    <input
                      type="text"
                      required
                      value={option}
                      onChange={(event) =>
                        updateOption(index, event.target.value)
                      }
                      placeholder={`Option ${index + 1}`}
                      className={inputClass}
                    />
                  </div>

                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      className="rounded-xl border border-red-300 px-4 text-sm font-semibold text-red-700 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addOption}
              className="mt-5 rounded-xl border border-blue-300 px-4 py-3 text-sm font-bold text-blue-700 hover:bg-blue-50"
            >
              + Add another option
            </button>
          </div>

          {/* Poll Settings */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-bold text-slate-950">
              Poll Settings
            </h2>

            <div className="mt-6 space-y-4">
              <label className="flex cursor-pointer gap-4 rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={multipleAnswers}
                  onChange={(event) =>
                    setMultipleAnswers(event.target.checked)
                  }
                  className="mt-1 h-5 w-5 accent-blue-600"
                />

                <div>
                  <p className="font-bold text-slate-900">
                    Allow multiple answers
                  </p>
                  <p className="text-sm text-slate-700">
                    Allow voters to select more than one option.
                  </p>
                </div>
              </label>

              <label className="flex cursor-pointer gap-4 rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={anonymousVoting}
                  onChange={(event) =>
                    setAnonymousVoting(event.target.checked)
                  }
                  className="mt-1 h-5 w-5 accent-blue-600"
                />

                <div>
                  <p className="font-bold text-slate-900">
                    Anonymous voting
                  </p>
                  <p className="text-sm text-slate-700">
                    Keep voter identities private.
                  </p>
                </div>
              </label>

              <label className="flex cursor-pointer gap-4 rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={allowComments}
                  onChange={(event) =>
                    setAllowComments(event.target.checked)
                  }
                  className="mt-1 h-5 w-5 accent-blue-600"
                />

                <div>
                  <p className="font-bold text-slate-900">
                    Allow comments
                  </p>
                  <p className="text-sm text-slate-700">
                    Let voters discuss the poll.
                  </p>
                </div>
              </label>

              <div>
                <label
                  htmlFor="closingDate"
                  className="mb-2 block text-sm font-bold text-slate-800"
                >
                  Poll Closing Date
                </label>

                <input
                  id="closingDate"
                  type="date"
                  value={closingDate}
                  onChange={(event) =>
                    setClosingDate(event.target.value)
                  }
                  min={new Date().toLocaleDateString("en-CA")}
                  className={inputClass}
                />

                <p className="mt-2 text-sm text-slate-600">
                  Leave empty if the poll should remain open.
                </p>
              </div>
            </div>
          </div>

          {/* Error */}
          {errorMessage && (
            <div
              role="alert"
              className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-800"
            >
              {errorMessage}
            </div>
          )}

          {/* Publish */}
          <div className="flex flex-col gap-4 rounded-2xl bg-blue-700 p-6 text-white sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold">
                Ready to publish?
              </h2>
              <p className="mt-1 text-sm text-blue-100">
                Your poll will be available for people to vote on.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-white px-6 py-3 font-bold text-blue-800 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Publishing..." : "Publish Poll"}
            </button>
          </div>
        </form>
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
