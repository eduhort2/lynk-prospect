import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { passwordChecks, passwordStrength } from "@/lib/validations/password";

export function PasswordStrength({ password }: { password: string }) {
  const strength = passwordStrength(password);
  const checks = passwordChecks(password);

  return (
    <div className="mt-3" aria-live="polite">
      <div className="mb-2 flex items-center justify-between text-[11px]">
        <span className="text-zinc-500">Força da senha</span>
        <span className={cn("font-medium", strength.score === 1 ? "text-red-300" : strength.score === 2 ? "text-amber-300" : strength.score === 3 ? "text-primary-light" : "text-zinc-600")}>{strength.label}</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5" aria-hidden="true">
        {[1, 2, 3].map((step) => (
          <span key={step} className={cn("h-1.5 rounded-full bg-white/[.07] transition-colors", strength.score >= step && strength.color)} />
        ))}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {checks.map((rule) => (
          <div key={rule.id} className={cn("flex items-center gap-1.5 text-[11px]", rule.passed ? "text-primary-light" : "text-zinc-500")}>
            {rule.passed ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
            <span>{rule.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
