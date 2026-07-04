import assert from "node:assert/strict";
import test from "node:test";
import {
  canRoleAccess,
  loginPathFor,
  requiredRoleForPath,
  roleHomePath
} from "../src/lib/route-access";

test("protected private routes map to the expected server role", () => {
  assert.equal(requiredRoleForPath("/admin"), "admin");
  assert.equal(requiredRoleForPath("/admin/resultados"), "admin");
  assert.equal(requiredRoleForPath("/delegado/plantel"), "delegate");
  assert.equal(requiredRoleForPath("/arbitro/partidos/match-1/live"), "referee");
  assert.equal(requiredRoleForPath("/c/default/fixture"), null);
});

test("admin can access private panels while delegate and referee stay scoped", () => {
  assert.equal(canRoleAccess("admin", "admin"), true);
  assert.equal(canRoleAccess("admin", "delegate"), true);
  assert.equal(canRoleAccess("admin", "referee"), true);
  assert.equal(canRoleAccess("delegate", "delegate"), true);
  assert.equal(canRoleAccess("delegate", "referee"), false);
  assert.equal(canRoleAccess("referee", "referee"), true);
  assert.equal(canRoleAccess("referee", "admin"), false);
  assert.equal(canRoleAccess("viewer", "admin"), false);
  assert.equal(canRoleAccess(null, "admin"), false);
});

test("unauthorized users are routed to login or their own panel", () => {
  assert.equal(loginPathFor("/admin/resultados"), "/login?next=%2Fadmin%2Fresultados");
  assert.equal(roleHomePath("delegate"), "/delegado");
  assert.equal(roleHomePath("referee"), "/arbitro");
  assert.equal(roleHomePath("viewer"), "/");
});
