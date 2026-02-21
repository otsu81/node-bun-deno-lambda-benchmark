import { faker } from "@faker-js/faker"

// Generate ~100KB of text data for compression benchmark
const paragraphs: string[] = []

while (paragraphs.join("\n").length < 100 * 1024) {
  paragraphs.push(faker.lorem.paragraphs(5))
}

const text = paragraphs.join("\n")
const base64 = Buffer.from(text).toString("base64")

console.log(`Generated text size: ${(text.length / 1024).toFixed(2)} KB`)
console.log(`Base64 size: ${(base64.length / 1024).toFixed(2)} KB`)

await Bun.write("test/fakerdata/compressionData.json", JSON.stringify({ data: base64 }))
console.log("Written to test/fakerdata/compressionData.json")
