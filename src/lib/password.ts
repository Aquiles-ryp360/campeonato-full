import "server-only";

import { randomInt } from "node:crypto";

const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const lowercase = "abcdefghijkmnopqrstuvwxyz";
const numbers = "23456789";
const symbols = "!@#$%*-_?";
const allCharacters = `${uppercase}${lowercase}${numbers}${symbols}`;

export function generateTemporaryPassword(length = 14) {
  if (length < 8) {
    throw new Error("Temporary passwords must have at least 8 characters");
  }

  // Temporary password generated on the server, never in the browser.
  const requiredCharacters = [
    pickRandomCharacter(uppercase),
    pickRandomCharacter(lowercase),
    pickRandomCharacter(numbers),
    pickRandomCharacter(symbols)
  ];

  const remainingCharacters = Array.from({ length: length - requiredCharacters.length }, () =>
    pickRandomCharacter(allCharacters)
  );

  return shuffleCharacters([...requiredCharacters, ...remainingCharacters]).join("");
}

function pickRandomCharacter(characters: string) {
  return characters[randomInt(0, characters.length)];
}

function shuffleCharacters(characters: string[]) {
  const output = [...characters];

  for (let index = output.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index + 1);
    [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
  }

  return output;
}
