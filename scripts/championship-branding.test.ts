import assert from "node:assert/strict";
import test from "node:test";
import { mapEvent, type EventRow } from "../src/lib/data-mappers";
import {
  buildOrganizerContactLinks,
  buildPaymentContactLinks,
  DEFAULT_PAYMENT_CONTACT_PHONE,
  DEFAULT_PAYMENT_CONTACT_WHATSAPP_URL
} from "../src/lib/payment-contact";

const baseEventRow: EventRow = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Campeonato Futbol 11",
  sport_id: "sport-futbol",
  category: "Libre",
  format_id: "format-knockout",
  status: "registration",
  registration_fee: 35,
  registration_open_until: "2026-07-08T23:59:00-05:00",
  max_teams: 12,
  min_players: 11,
  max_players: 18,
  points_win: 0,
  points_draw: 0,
  points_loss: 0,
  rules_summary: "Eliminacion directa.",
  schedule_config: {
    startTime: "08:00",
    matchDurationMinutes: 90,
    transitionMinutes: 20,
    courts: ["Campo Futbol 11 Principal"],
    courtCount: 1,
    minimumRestMinutes: 120,
    allowCompactPreview: true,
    branding: {
      careerLogoUrl: "/uploads/championship-assets/logo.png",
      paymentQrYapeUrl: "/uploads/championship-assets/yape.png",
      paymentContactPhone: DEFAULT_PAYMENT_CONTACT_PHONE,
      themePrimaryColor: "#28398f"
    }
  }
};

test("maps championship branding from schedule_config when schema columns are absent", () => {
  const event = mapEvent(baseEventRow);

  assert.equal(event.maxTeams, 12);
  assert.equal(event.careerLogoUrl, "/uploads/championship-assets/logo.png");
  assert.equal(event.paymentQrYapeUrl, "/uploads/championship-assets/yape.png");
  assert.equal(event.paymentContactPhone, DEFAULT_PAYMENT_CONTACT_PHONE);
  assert.equal(event.paymentContactWhatsappUrl, DEFAULT_PAYMENT_CONTACT_WHATSAPP_URL);
  assert.equal(event.themePrimaryColor, "#28398f");
});

test("prefers explicit branding columns over schedule_config fallback", () => {
  const event = mapEvent({
    ...baseEventRow,
    career_logo_url: "/column-logo.png",
    payment_qr_yape_url: "/column-yape.png"
  });

  assert.equal(event.careerLogoUrl, "/column-logo.png");
  assert.equal(event.paymentQrYapeUrl, "/column-yape.png");
});

test("normalizes whatsapp url to the configured phone", () => {
  const event = mapEvent({
    ...baseEventRow,
    payment_contact_phone: DEFAULT_PAYMENT_CONTACT_PHONE,
    payment_contact_whatsapp_url: "https://wa.me/51000000000?text=Hola"
  });

  assert.equal(event.paymentContactWhatsappUrl, "https://wa.me/51984000201?text=Hola");
});

test("builds all official payment whatsapp contacts without names", () => {
  const contacts = buildPaymentContactLinks(
    DEFAULT_PAYMENT_CONTACT_PHONE,
    DEFAULT_PAYMENT_CONTACT_WHATSAPP_URL
  );

  assert.deepEqual(
    contacts.map((contact) => contact.displayPhone),
    ["984000201", "988765715", "921580174", "923037653"]
  );
  assert.equal(
    contacts[3].whatsappUrl,
    "https://wa.me/51923037653?text=Hola%2C%20solicito%20mi%20c%C3%B3digo%20%C3%BAnico%20de%20inscripci%C3%B3n.%20Adjunto%20la%20captura%20del%20Yape%20para%20validar%20el%20pago."
  );
});

test("builds organizer whatsapp links with a message per sport", () => {
  const futsal = buildOrganizerContactLinks("futsal");
  const voley = buildOrganizerContactLinks("voley");

  assert.deepEqual(
    futsal.map((contact) => contact.displayPhone),
    ["988 765 715", "921 580 174", "984 000 201", "923 037 653"]
  );
  assert.deepEqual(
    futsal.map((contact) => new URL(contact.whatsappUrl).pathname),
    ["/51988765715", "/51921580174", "/51984000201", "/51923037653"]
  );
  assert.equal(
    new URL(futsal[0].whatsappUrl).searchParams.get("text"),
    "Hola, buenas tardes. Quiero inscribir a mi equipo en el campeonato de futsal. Deseo realizar el pago y solicitar mi código de acceso. ¿Podrían brindarme información?"
  );
  assert.equal(
    new URL(voley[2].whatsappUrl).searchParams.get("text"),
    "Hola, buenas tardes. Quiero inscribir a mi equipo en el campeonato de vóley. Deseo realizar el pago y solicitar mi código de acceso. ¿Podrían brindarme información?"
  );
});
