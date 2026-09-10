"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/actions/auth";

export default function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    loginAction,
    null,
  );

  return (
    <form action={action} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <div>
        <label htmlFor="email" className="label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          autoFocus
          className="field"
        />
      </div>

      <div>
        <label htmlFor="password" className="label">
          Lozinka
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="field"
        />
      </div>

      {state?.error ? (
        <p className="border border-sale/30 bg-sale/5 px-3 py-2 text-sm text-sale">
          {state.error}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="btn-dark w-full">
        {pending ? "Prijavljujem..." : "Prijavi se"}
      </button>
    </form>
  );
}
