export const DEFAULT_PAYMENT_CONTACT_PHONES = [
  "+51988765715",
  "+51921580174",
  "+51984000201",
  "+51923037653"
] as const;

export const DEFAULT_PAYMENT_CONTACT_PHONE = "+51984000201";

export const DEFAULT_PAYMENT_WHATSAPP_TEXT =
  "Hola, solicito mi código único de inscripción. Adjunto la captura del Yape para validar el pago.";

export const DEFAULT_PAYMENT_CONTACT_WHATSAPP_URL = buildPaymentWhatsappUrl(
  DEFAULT_PAYMENT_CONTACT_PHONE
);

export function buildPaymentWhatsappUrl(
  phone: string,
  text = DEFAULT_PAYMENT_WHATSAPP_TEXT
) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";

  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function buildPaymentContactLinks(phone?: string, whatsappUrl?: string) {
  const links = new Map<
    string,
    {
      displayPhone: string;
      whatsappUrl: string;
    }
  >();

  addPaymentContactLink(links, phone, whatsappUrl);
  DEFAULT_PAYMENT_CONTACT_PHONES.forEach((defaultPhone) =>
    addPaymentContactLink(links, defaultPhone)
  );

  return [...links.values()];
}

function addPaymentContactLink(
  links: Map<string, { displayPhone: string; whatsappUrl: string }>,
  phone?: string,
  whatsappUrl?: string
) {
  const digits = phone?.replace(/\D/g, "");
  if (!digits || links.has(digits)) return;

  links.set(digits, {
    displayPhone: formatPaymentContactPhone(digits),
    whatsappUrl: normalizePaymentWhatsappUrl(digits, whatsappUrl)
  });
}

function normalizePaymentWhatsappUrl(digits: string, whatsappUrl?: string) {
  if (!whatsappUrl) return buildPaymentWhatsappUrl(digits);

  try {
    const parsed = new URL(whatsappUrl);
    if (!parsed.hostname.endsWith("wa.me")) return buildPaymentWhatsappUrl(digits);

    parsed.pathname = `/${digits}`;
    if (!parsed.searchParams.has("text")) {
      parsed.searchParams.set("text", DEFAULT_PAYMENT_WHATSAPP_TEXT);
    }

    return parsed.toString();
  } catch {
    return buildPaymentWhatsappUrl(digits);
  }
}

function formatPaymentContactPhone(digits: string) {
  if (digits.startsWith("51") && digits.length === 11) return digits.slice(2);

  return digits;
}

export type RegistrationSport = "futsal" | "voley" | "futbol";

const registrationSportNames: Record<RegistrationSport, string> = {
  futsal: "futsal",
  voley: "vóley",
  futbol: "fútbol"
};

export function buildRegistrationWhatsappText(sport?: RegistrationSport) {
  const championship = sport
    ? `el campeonato de ${registrationSportNames[sport]}`
    : "el campeonato";

  return `Hola, buenas tardes. Quiero inscribir a mi equipo en ${championship}. Deseo realizar el pago y solicitar mi código de acceso. ¿Podrían brindarme información?`;
}

export function buildOrganizerContactLinks(sport?: RegistrationSport) {
  const text = buildRegistrationWhatsappText(sport);

  return DEFAULT_PAYMENT_CONTACT_PHONES.map((phone) => {
    const local = formatPaymentContactPhone(phone.replace(/\D/g, ""));

    return {
      phone,
      displayPhone: local.replace(/^(\d{3})(\d{3})(\d{3})$/, "$1 $2 $3"),
      whatsappUrl: buildPaymentWhatsappUrl(phone, text)
    };
  });
}
