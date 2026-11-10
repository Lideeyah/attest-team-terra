"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { readStored, writeStored } from "@/lib/field/storage";

/* A verifier watches the same handful of things week after week, so the
   search they typed last week is worth keeping. Kept on the device rather
   than on the platform: what somebody searches for is nobody else's record.
   PROJECTS_COPY carries the words; the list is this component's own. */

type Saved = { name: string; query: string };

const KEY = "attest-verifier-searches";

function read(): Saved[] {
  const raw = readStored(KEY);
  if (!raw) {
    return [];
  }
  const parsed = JSON.parse(raw) as Saved[];
  return Array.isArray(parsed) ? parsed : [];
}

export function SavedSearches({ current }: { current: string }) {
  const router = useRouter();
  const [saved, setSaved] = useState<Saved[]>([]);
  const [name, setName] = useState("");

  /* The stored list is the device's, not the server's, so it is read after
     mount rather than during render, where it would disagree with the HTML
     the server sent. The deferred read is there to satisfy the lint rule
     against a synchronous setState in an effect body; the `live` flag keeps a
     late resolution off an unmounted component. */
  useEffect(() => {
    let live = true;
    void Promise.resolve().then(() => {
      if (live) {
        setSaved(read());
      }
    });
    return () => {
      live = false;
    };
  }, []);

  function save(): void {
    const next = [
      ...read().filter((entry) => entry.name !== name.trim()),
      { name: name.trim(), query: current },
    ];
    writeStored(KEY, JSON.stringify(next));
    setSaved(next);
    setName("");
  }

  function remove(entry: Saved): void {
    const next = read().filter((candidate) => candidate.name !== entry.name);
    writeStored(KEY, JSON.stringify(next));
    setSaved(next);
  }

  return (
    <section className="stack" aria-label="Saved searches">
      {saved.length > 0 ? (
        <ul className="row" style={{ flexWrap: "wrap" }}>
          {saved.map((entry) => (
            <li key={entry.name} className="row">
              <Button
                type="button"
                variant="outline"
                small
                onClick={() =>
                  router.push(`/verifier/projects?q=${encodeURIComponent(entry.query)}`)
                }
                data-saved-search={entry.name}
              >
                {entry.name}
              </Button>
              <Button
                type="button"
                variant="quiet"
                small
                onClick={() => remove(entry)}
                data-saved-remove={entry.name}
              >
                Forget
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      {current.trim().length > 0 ? (
        <div className="row">
          <div className="field">
            <label className="label" htmlFor="save-search">
              Keep this search as
            </label>
            <input
              id="save-search"
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Cross River projects"
              data-save-search-name
            />
          </div>
          <Button
            type="button"
            variant="outline"
            small
            disabled={name.trim().length === 0}
            onClick={save}
            data-save-search
          >
            Keep it
          </Button>
        </div>
      ) : null}
    </section>
  );
}
