import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Sprout } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { CREDENTIAL_HINTS } from "../../data/demoData";
import { Button, Card, Input } from "../../components/common/ui";

function dashboardFor(role: string): string {
  if (role === "buyer") return "/buyer";
  if (role === "supplier") return "/supplier";
  return "/admin";
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.includes("@")) {
      setFieldError("Enter a valid email address.");
      return;
    }
    if (password.length < 4) {
      setFieldError("Password must be at least 4 characters.");
      return;
    }
    setFieldError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(dashboardFor(user.role), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-brand-950 p-10 text-white md:flex">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-white/10"><Sprout size={22} /></span>
          <span className="text-xl font-bold">AgriPulse</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight">Direct farm trade,<br />verified &amp; transparent.</h1>
          <p className="mt-4 max-w-md text-brand-100">AgriPulse connects agricultural supply with business demand. Buyers post requirements. FPOs list graded produce. AgriPulse matches price, grade, and distance.</p>
          <p className="mt-4 text-sm font-semibold uppercase tracking-widest text-brand-200">Connect. Trade. Grow Together.</p>
          <dl className="mt-8 grid max-w-md grid-cols-3 gap-4 text-sm">
            <div><dt className="text-2xl font-bold">6,000 kg</dt><dd className="text-brand-200">Ravi FPO tomatoes</dd></div>
            <div><dt className="text-2xl font-bold">₹27/kg</dt><dd className="text-brand-200">Grade A, Rajahmundry</dd></div>
            <div><dt className="text-2xl font-bold">5,000 kg</dt><dd className="text-brand-200">ABC Foods demand</dd></div>
          </dl>
        </div>
        <p className="text-xs text-brand-200">B2B agri exchange · demo build (Request 1/7)</p>
      </div>

      <div className="flex items-center justify-center bg-cream-50 p-6">
        <Card className="w-full max-w-md p-6">
          <h2 className="text-xl font-bold text-stone-900">Sign in to AgriPulse</h2>
          <p className="mt-1 text-sm text-stone-500">Use a demo account to continue.</p>
          <form onSubmit={onSubmit} className="mt-5 space-y-4" noValidate>
            <Input label="Email" type="email" name="email" autoComplete="username" placeholder="buyer@agripulse.demo" value={email} onChange={(e) => setEmail(e.target.value)} error={fieldError && !email.includes("@") ? fieldError : undefined} />
            <div>
              <Input label="Password" type={show ? "text" : "password"} name="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShow((s) => !s)} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
                {show ? <EyeOff size={14} /> : <Eye size={14} />} {show ? "Hide" : "Show"} password
              </button>
            </div>
            {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
            <Button type="submit" loading={loading} className="w-full">Sign in</Button>
          </form>
          <div className="mt-5 rounded-md border border-stone-200 bg-stone-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Demo credentials</p>
            <ul className="mt-2 space-y-1 text-xs text-stone-600">
              {CREDENTIAL_HINTS.map((c) => (
                <li key={c.email}>
                  <button
                    type="button"
                    className="hover:text-brand-800 hover:underline"
                    onClick={() => { setEmail(c.email); setPassword(c.password); setError(""); }}
                  >
                    <strong>{c.role}</strong> · {c.email} · {c.password}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}
