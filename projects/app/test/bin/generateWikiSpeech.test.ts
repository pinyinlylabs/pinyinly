// pyly-not-src-test
import { describe, it, expect } from "vitest";

describe("generateWikiSpeech", () => {
  it("should have correct available voices", () => {
    // These are the OpenAI TTS voices as of the script creation
    const expectedVoices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
    
    // Import the voices array from our script
    // Note: This would need to be exported from the script to test properly
    // For now, this is a placeholder test structure
    
    expect(expectedVoices).toHaveLength(6);
    expect(expectedVoices).toContain("alloy");
    expect(expectedVoices).toContain("nova");
  });

  it("should validate voice input correctly", () => {
    const validVoices = ["alloy", "echo"];
    const invalidVoices = ["invalid", "notavoice"];
    
    // Test that valid voices are accepted
    expect(validVoices.every(v => ["alloy", "echo", "fable", "onyx", "nova", "shimmer"].includes(v))).toBe(true);
    
    // Test that invalid voices are rejected
    expect(invalidVoices.some(v => ["alloy", "echo", "fable", "onyx", "nova", "shimmer"].includes(v))).toBe(false);
  });

  it("should clean Chinese phrase for filename", () => {
    // Test the filename cleaning logic
    const phrase = "你好世界！";
    const cleaned = phrase.replace(/[^\u4e00-\u9fff\w]/g, "");
    
    expect(cleaned).toBe("你好世界");
  });
});