import assert from "node:assert/strict";
import test from "node:test";
import { mapEvent, type EventRow } from "../src/lib/data-mappers";

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
      paymentContactPhone: "+51923037653",
      themePrimaryColor: "#28398f"
    }
  }
};

test("maps championship branding from schedule_config when schema columns are absent", () => {
  const event = mapEvent(baseEventRow);

  assert.equal(event.maxTeams, 12);
  assert.equal(event.careerLogoUrl, "/uploads/championship-assets/logo.png");
  assert.equal(event.paymentQrYapeUrl, "/uploads/championship-assets/yape.png");
  assert.equal(event.paymentContactPhone, "+51923037653");
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
