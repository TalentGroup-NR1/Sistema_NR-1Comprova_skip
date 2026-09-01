import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Cake, PartyPopper, Trophy, Sparkles } from "lucide-react";
import { useMemo } from "react";

interface BirthdayGreetingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colaboradorName: string;
  isBirthday: boolean;
  isWorkAnniversary: boolean;
  yearsAtCompany?: number;
  companyName?: string;
  companyLogo?: string | null;
  eventDate?: Date | null;
}


const CONFETTI_COLORS = [
  "bg-yellow-400",
  "bg-pink-500",
  "bg-sky-400",
  "bg-emerald-400",
  "bg-orange-400",
  "bg-fuchsia-500",
  "bg-rose-400",
  "bg-amber-300",
];

const BALLOONS = ["🎈", "🎈", "🎀", "🎁", "🎈", "🪅"];

export function BirthdayGreetingModal({
  open,
  onOpenChange,
  colaboradorName,
  isBirthday,
  isWorkAnniversary,
  yearsAtCompany,
  companyName,
  companyLogo,
  eventDate,
}: BirthdayGreetingModalProps) {
  const firstName = colaboradorName.split(" ")[0];
  const displayCompany = "TALENT GROUP";
  const dateLabel = eventDate
    ? `Em ${String(eventDate.getDate()).padStart(2, "0")}/${String(eventDate.getMonth() + 1).padStart(2, "0")}`
    : "Hoje";


  // Generate confetti config once per open
  const confetti = useMemo(
    () =>
      Array.from({ length: 32 }).map((_, i) => ({
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 4}s`,
        duration: `${3 + Math.random() * 3}s`,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 6 + Math.round(Math.random() * 8),
        rounded: Math.random() > 0.5 ? "rounded-full" : "rounded-sm",
      })),
    [open],
  );

  const balloons = useMemo(
    () =>
      BALLOONS.map((emoji, i) => ({
        emoji,
        left: `${5 + i * 16 + Math.random() * 6}%`,
        delay: `${Math.random() * 3}s`,
        duration: `${6 + Math.random() * 4}s`,
        size: 28 + Math.round(Math.random() * 18),
      })),
    [open],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border-0 max-h-[95vh]">
        <div className="relative bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground p-6 md:p-10 text-center overflow-hidden">
          {/* Confetti layer */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {confetti.map((c, i) => (
              <span
                key={`c-${i}`}
                className={`absolute top-0 ${c.color} ${c.rounded} animate-confetti shadow-sm`}
                style={{
                  left: c.left,
                  width: `${c.size}px`,
                  height: `${c.size * 1.6}px`,
                  animationDelay: c.delay,
                  animationDuration: c.duration,
                }}
              />
            ))}
            {balloons.map((b, i) => (
              <span
                key={`b-${i}`}
                className="absolute bottom-0 animate-balloon drop-shadow-lg"
                style={{
                  left: b.left,
                  fontSize: `${b.size}px`,
                  animationDelay: b.delay,
                  animationDuration: b.duration,
                }}
              >
                {b.emoji}
              </span>
            ))}
          </div>

          {/* Decorative emojis */}
          <div className="absolute top-4 left-5 text-4xl animate-wiggle">🎉</div>
          <div className="absolute top-4 right-5 text-4xl animate-wiggle" style={{ animationDelay: "0.3s" }}>🎊</div>
          <div className="absolute bottom-5 left-6 text-3xl animate-sparkle">✨</div>
          <div className="absolute bottom-5 right-6 text-3xl animate-sparkle" style={{ animationDelay: "0.5s" }}>✨</div>

          <div className="relative">
            {/* Logo */}
            {companyLogo ? (
              <div className="flex justify-center mb-3">
                <div className="bg-white rounded-2xl p-3 shadow-2xl">
                  <img
                    src={companyLogo}
                    alt={companyName || "Empresa"}
                    className="h-14 md:h-16 w-auto object-contain"
                  />
                </div>
              </div>
            ) : (
              <div className="flex justify-center mb-3">
                <div className="bg-white/20 backdrop-blur rounded-full p-4">
                  <Sparkles className="h-10 w-10 animate-sparkle" />
                </div>
              </div>
            )}

            {/* Main icon */}
            <div className="flex justify-center gap-3 mb-3">
              {isBirthday && <Cake className="h-14 w-14 md:h-16 md:w-16 drop-shadow-2xl animate-bounce-slow" />}
              {isWorkAnniversary && <Trophy className="h-14 w-14 md:h-16 md:w-16 drop-shadow-2xl animate-bounce-slow" />}
              {!isBirthday && !isWorkAnniversary && <PartyPopper className="h-14 w-14 md:h-16 md:w-16 animate-bounce-slow" />}
            </div>

            {/* Messages */}
            {isBirthday && (
              <div className="mb-4">
                <h2 className="text-3xl md:text-4xl font-bold mb-2 drop-shadow-lg">
                  🎂 Feliz Aniversário, {firstName}!
                </h2>
                <p className="text-primary-foreground/95 text-base md:text-lg">
                  {dateLabel} é o seu dia! Que este novo ciclo seja repleto de alegrias,
                  conquistas e muita saúde.
                </p>

              </div>
            )}

            {isWorkAnniversary && yearsAtCompany !== undefined && (
              <div className="mb-4">
                <h2 className="text-3xl md:text-4xl font-bold mb-2 drop-shadow-lg">
                  🏆 Parabéns, {firstName}!
                </h2>
                <p className="text-primary-foreground/95 text-base md:text-lg">
                  {dateLabel} você completa{" "}
                  <strong>
                    {yearsAtCompany} {yearsAtCompany === 1 ? "ano" : "anos"}
                  </strong>{" "}
                  de jornada na {displayCompany}.
                  Obrigado por fazer parte desta história!
                </p>

              </div>
            )}

            <div className="bg-white/15 backdrop-blur rounded-xl py-3 px-4 mb-4">
              <p className="text-sm md:text-base font-medium">
                Toda a equipe deseja a você um dia incrível! 💙
              </p>
            </div>

            <Button
              variant="secondary"
              size="lg"
              onClick={() => onOpenChange(false)}
              className="w-full font-semibold text-base"
            >
              Obrigado(a)! 🙏
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
