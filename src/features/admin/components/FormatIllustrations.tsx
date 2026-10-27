import type { SeedingMode, TournamentFormat } from "@/lib/types";
import { lowerPowerOfTwo } from "@/lib/domain/bracket-generator";
import { groupSizes } from "@/lib/domain/group-draw";

// Imagenes referenciales (SVG) para explicar formatos y opciones en el panel admin.
const C = {
  navy: "#171B4F",
  electric: "#2F46FF",
  yellow: "#F0E834",
  wash: "#EEF1F5",
  line: "#9AA1C2",
  muted: "#5F6475",
  bronze: "#C08A3E",
  white: "#FFFFFF"
};

function Svg({ viewBox, children, label }: { viewBox: string; children: React.ReactNode; label: string }) {
  return (
    <svg viewBox={viewBox} role="img" aria-label={label} className="block h-auto w-full">
      {children}
    </svg>
  );
}

function Team({ x, y, w = 46, text, tone = "white" }: { x: number; y: number; w?: number; text: string; tone?: "white" | "yellow" | "electric" }) {
  const fill = tone === "yellow" ? C.yellow : tone === "electric" ? C.electric : C.white;
  const color = tone === "electric" ? C.white : C.navy;
  return (
    <g>
      <rect x={x} y={y} width={w} height={14} rx={3} fill={fill} stroke={C.navy} strokeWidth={0.8} />
      <text x={x + w / 2} y={y + 10} textAnchor="middle" fontSize={7.5} fontWeight={700} fill={color}>
        {text}
      </text>
    </g>
  );
}

function Link({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const xm = (x1 + x2) / 2;
  return <path d={`M${x1} ${y1} H${xm} V${y2} H${x2}`} fill="none" stroke={C.line} strokeWidth={1.1} />;
}

/** Llave de eliminacion directa generica: columnas de partidos que se reducen a la mitad. */
function Bracket({ x, y, height, rounds, labels }: { x: number; y: number; height: number; rounds: number; labels?: string[] }) {
  const colW = 58;
  const items: React.ReactNode[] = [];
  for (let r = 0; r < rounds; r += 1) {
    const count = 2 ** (rounds - r - 1);
    const slot = height / count;
    for (let k = 0; k < count; k += 1) {
      const cy = y + slot * (k + 0.5);
      const cx = x + r * colW;
      const final = r === rounds - 1;
      items.push(<Team key={`${r}-${k}`} x={cx} y={cy - 7} text={final ? "Final" : labels?.[r] ?? "vs"} tone={final ? "yellow" : "white"} />);
      if (r > 0) {
        const prevSlot = height / (count * 2);
        items.push(<Link key={`l${r}-${k}a`} x1={cx - colW + 46} y1={y + prevSlot * (2 * k + 0.5)} x2={cx} y2={cy} />);
        items.push(<Link key={`l${r}-${k}b`} x1={cx - colW + 46} y1={y + prevSlot * (2 * k + 1.5)} x2={cx} y2={cy} />);
      }
    }
  }
  return <g>{items}</g>;
}

export function FormatIllustration({ format }: { format: TournamentFormat }) {
  if (format === "league") {
    const teams = ["A", "B", "C", "D"];
    return (
      <Svg viewBox="0 0 240 120" label="Liga: todos contra todos y tabla de posiciones">
        {teams.map((team, row) =>
          teams.map((other, col) => (
            <g key={`${team}${other}`}>
              <rect x={30 + col * 22} y={22 + row * 22} width={20} height={20} rx={2}
                fill={row === col ? C.navy : C.white} stroke={C.line} strokeWidth={0.8} />
              {row !== col ? (
                <text x={40 + col * 22} y={35 + row * 22} textAnchor="middle" fontSize={7} fill={C.muted}>vs</text>
              ) : null}
            </g>
          ))
        )}
        {teams.map((team, i) => (
          <g key={team}>
            <text x={22} y={35 + i * 22} textAnchor="end" fontSize={8} fontWeight={700} fill={C.navy}>{team}</text>
            <text x={40 + i * 22} y={16} textAnchor="middle" fontSize={8} fontWeight={700} fill={C.navy}>{team}</text>
          </g>
        ))}
        <text x={124} y={16} fontSize={8} fontWeight={700} fill={C.navy}>Tabla</text>
        {[["1", "B", "9"], ["2", "A", "6"], ["3", "D", "3"], ["4", "C", "0"]].map(([pos, team, pts], i) => (
          <g key={pos}>
            <rect x={124} y={22 + i * 22} width={100} height={20} rx={3} fill={i === 0 ? C.yellow : C.wash} stroke={C.line} strokeWidth={0.6} />
            <text x={132} y={35 + i * 22} fontSize={8} fontWeight={700} fill={C.navy}>{pos}.  Equipo {team}</text>
            <text x={216} y={35 + i * 22} textAnchor="end" fontSize={8} fontWeight={700} fill={C.electric}>{pts} pts</text>
          </g>
        ))}
      </Svg>
    );
  }

  if (format === "single_elimination") {
    return (
      <Svg viewBox="0 0 240 120" label="Eliminacion directa: llave hasta la final">
        <Bracket x={10} y={8} height={104} rounds={3} labels={["Cuartos", "Semi"]} />
        <text x={186} y={52} fontSize={8} fontWeight={700} fill={C.navy}>Campeón</text>
        <text x={186} y={64} fontSize={7} fill={C.muted}>El que pierde</text>
        <text x={186} y={73} fontSize={7} fill={C.muted}>queda fuera</text>
      </Svg>
    );
  }

  return (
    <Svg viewBox="0 0 262 120" label="Grupos y luego eliminacion directa">
      {["A", "B", "C", "D"].map((group, i) => (
        <g key={group}>
          <rect x={6} y={6 + i * 28} width={64} height={24} rx={4} fill={C.wash} stroke={C.navy} strokeWidth={0.8} />
          <text x={12} y={16 + i * 28} fontSize={7.5} fontWeight={800} fill={C.navy}>Grupo {group}</text>
          <text x={12} y={26 + i * 28} fontSize={6.5} fill={C.muted}>1° y 2° pasan</text>
          <path d={`M70 ${18 + i * 28} H84`} stroke={C.electric} strokeWidth={1.4} markerEnd="url(#fmt-arrow)" />
        </g>
      ))}
      <defs>
        <marker id="fmt-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0 0 L6 3 L0 6 z" fill={C.electric} />
        </marker>
      </defs>
      <Bracket x={92} y={8} height={104} rounds={3} labels={["Cuartos", "Semi"]} />
    </Svg>
  );
}

export function SeedingIllustration({ mode }: { mode: SeedingMode }) {
  const order = mode === "random" ? ["3", "1", "4", "2"] : ["1", "2", "3", "4"];
  const label = {
    registration_order: "Orden de inscripcion",
    random: "Sorteo",
    manual: "Lo decide el admin",
    ranking: "Por ranking previo"
  }[mode];
  return (
    <Svg viewBox="0 0 240 90" label={`Sembrado: ${label}`}>
      <text x={8} y={12} fontSize={8} fontWeight={700} fill={C.navy}>{label}</text>
      {order.map((seed, i) => (
        <Team key={seed} x={8} y={20 + i * 17} w={40} text={`#${seed}`} tone={i === 0 ? "electric" : "white"} />
      ))}
      <path d="M54 46 H74" stroke={C.electric} strokeWidth={1.4} />
      <Team x={80} y={22} w={70} text={`#${order[0]} vs #${order[3]}`} />
      <Team x={80} y={56} w={70} text={`#${order[1]} vs #${order[2]}`} />
      <Link x1={150} y1={29} x2={170} y2={46} />
      <Link x1={150} y1={63} x2={170} y2={46} />
      <Team x={170} y={39} w={58} text="Final" tone="yellow" />
    </Svg>
  );
}

export function ThirdPlaceIllustration() {
  return (
    <Svg viewBox="0 0 240 90" label="Partido por el tercer lugar">
      <Team x={8} y={14} w={56} text="Semi 1" />
      <Team x={8} y={60} w={56} text="Semi 2" />
      <Link x1={64} y1={21} x2={100} y2={30} />
      <Link x1={64} y1={67} x2={100} y2={30} />
      <Team x={100} y={23} w={64} text="Final (ganadores)" tone="yellow" />
      <path d="M64 24 Q90 60 100 64 M64 70 Q90 64 100 64" fill="none" stroke={C.bronze} strokeWidth={1.1} strokeDasharray="3 2" />
      <rect x={100} y={57} width={64} height={14} rx={3} fill={C.bronze} />
      <text x={132} y={67} textAnchor="middle" fontSize={7.5} fontWeight={700} fill={C.white}>3er lugar</text>
      <text x={172} y={33} fontSize={7} fill={C.muted}>Campeón</text>
      <text x={172} y={67} fontSize={7} fill={C.muted}>Perdedores</text>
      <text x={172} y={76} fontSize={7} fill={C.muted}>de semis</text>
    </Svg>
  );
}

export function ByesIllustration() {
  return (
    <Svg viewBox="0 0 240 90" label="Byes: equipos que pasan directo">
      <text x={8} y={12} fontSize={8} fontWeight={700} fill={C.navy}>6 equipos → llave de 8</text>
      <Team x={8} y={20} w={56} text="#1 pasa" tone="electric" />
      <Team x={8} y={38} w={56} text="#2 pasa" tone="electric" />
      <Team x={8} y={56} w={56} text="#3 vs #6" />
      <Team x={8} y={74} w={56} text="#4 vs #5" />
      <Link x1={64} y1={27} x2={100} y2={36} />
      <Link x1={64} y1={63} x2={100} y2={36} />
      <Link x1={64} y1={45} x2={100} y2={72} />
      <Link x1={64} y1={81} x2={100} y2={72} />
      <Team x={100} y={29} w={50} text="Semi" />
      <Team x={100} y={65} w={50} text="Semi" />
      <text x={158} y={40} fontSize={7} fill={C.muted}>Los primeros</text>
      <text x={158} y={49} fontSize={7} fill={C.muted}>descansan una</text>
      <text x={158} y={58} fontSize={7} fill={C.muted}>ronda</text>
    </Svg>
  );
}

export function GroupCountIllustration({ teams, groups }: { teams: number; groups: number }) {
  const sizes = teams >= groups ? groupSizes(teams, Math.max(1, groups)) : [];
  const width = Math.max(240, sizes.length * 46 + 16);
  return (
    <Svg viewBox={`0 0 ${width} 96`} label={`${teams} equipos en ${groups} grupos`}>
      {sizes.map((size, i) => (
        <g key={i}>
          <rect x={8 + i * 46} y={8} width={40} height={80} rx={4} fill={C.wash} stroke={C.navy} strokeWidth={0.8} />
          <text x={28 + i * 46} y={20} textAnchor="middle" fontSize={8} fontWeight={800} fill={C.navy}>
            {String.fromCharCode(65 + i)}
          </text>
          {Array.from({ length: Math.min(size, 5) }, (_, k) => (
            <rect key={k} x={14 + i * 46} y={26 + k * 12} width={28} height={9} rx={2}
              fill={k < 2 ? C.yellow : C.white} stroke={C.line} strokeWidth={0.5} />
          ))}
        </g>
      ))}
    </Svg>
  );
}

/** Vista previa con los datos reales del borrador: grupos y rondas que se generarian. */
export function FormatPreview({
  format,
  maxTeams,
  groupCount,
  thirdPlace
}: {
  format: TournamentFormat;
  maxTeams: number;
  groupCount: number;
  thirdPlace: boolean;
}) {
  const knockoutTeams = format === "groups_then_knockout" ? Math.min(maxTeams, groupCount * 2) : maxTeams;
  const rounds = knockoutRounds(knockoutTeams, thirdPlace);
  const sizes = format === "groups_then_knockout" && maxTeams >= groupCount ? groupSizes(maxTeams, groupCount) : [];

  return (
    <div className="space-y-3">
      {format === "league" ? (
        <p className="text-sm font-semibold text-ink">
          {maxTeams} equipos, todos contra todos: cada equipo juega {Math.max(0, maxTeams - 1)} partidos y gana quien sume
          más puntos en la tabla.
        </p>
      ) : null}

      {sizes.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {sizes.map((size, i) => (
            <span key={i} className="rounded-md border border-brand-navy/30 bg-white px-2.5 py-1.5 text-xs font-bold text-brand-navy">
              Grupo {String.fromCharCode(65 + i)} · {size} equipos
            </span>
          ))}
          <span className="rounded-md bg-brand-yellow px-2.5 py-1.5 text-xs font-black text-brand-navy">
            Pasan {knockoutTeams} a la llave
          </span>
        </div>
      ) : null}

      {format !== "league" ? (
        <div className="flex flex-wrap items-center gap-2">
          {rounds.map((round, i) => (
            <span key={round.name} className="flex items-center gap-2">
              {i > 0 ? <span className="text-brand-muted">→</span> : null}
              <span
                className={`rounded-md px-2.5 py-1.5 text-xs font-bold ${
                  round.name === "Final" ? "bg-brand-yellow text-brand-navy" : "bg-brand-navy text-white"
                }`}
              >
                {round.name} · {round.matches} {round.matches === 1 ? "partido" : "partidos"}
              </span>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function knockoutRounds(teams: number, thirdPlace: boolean) {
  if (teams < 2) return [];
  const lower = lowerPowerOfTwo(teams);
  const rounds: Array<{ name: string; matches: number }> = [];
  if (lower !== teams) rounds.push({ name: "Preliminar", matches: teams - lower });
  const names: Record<number, string> = { 2: "Final", 4: "Semifinal", 8: "Cuartos", 16: "Octavos", 32: "16avos" };
  for (let size = lower; size >= 2; size /= 2) {
    rounds.push({ name: names[size] ?? `Ronda de ${size}`, matches: size / 2 });
  }
  if (thirdPlace && lower >= 4) rounds.splice(rounds.length - 1, 0, { name: "3er lugar", matches: 1 });
  return rounds;
}
