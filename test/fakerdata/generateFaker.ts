import { faker } from "@faker-js/faker"

function getFakeJwtPayload() {
  return {
    sub: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    orgId: faker.string.uuid(),
    roles: faker.helpers.arrayElements(["admin", "poweruser", "user", "editor", "viewer"], { min: 1, max: 3 }),
  }
}

const fakery = []
for (let i = 0; i < 1000; i++) {
  fakery.push(getFakeJwtPayload())
}

Bun.write("jwtPayloads.json", JSON.stringify(fakery, null, 2))
