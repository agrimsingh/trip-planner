import { NextRequest, NextResponse } from "next/server";
import { extractIntent } from "@/lib/llm";
import {
  scoreHotel,
  selectBestBrand,
  getHighlights,
  type ScoredHotel,
} from "@/lib/match";
import { getAncillariesForIntent } from "@/lib/ancillaries";
import { buildBrandDeepLink } from "@/lib/brandLinks";
import { searchBrandProperties } from "@/lib/exa";
import type { PlanOption } from "@/types/plan";
import type { Hotel } from "@/types/hotel";

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // requests per window
const RATE_WINDOW = 60000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Extract intent
    const intent = await extractIntent(prompt);

    // Search for hotels using Exa (with timeout fallback)
    const searchLocation = intent.location.trim();
    const searchPromises = [
      searchBrandProperties(searchLocation, "marriott", 8),
      searchBrandProperties(searchLocation, "hilton", 8),
      searchBrandProperties(searchLocation, "hyatt", 8),
    ];

    // Add timeout wrapper (4s per brand)
    const timeoutPromise = (promise: Promise<any>, timeoutMs: number) =>
      Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), timeoutMs)
        ),
      ]).catch(() => []);

    const perBrand = await Promise.allSettled(
      searchPromises.map((p) => timeoutPromise(p, 4000))
    );

    const exaItems = perBrand
      .filter((r) => r.status === "fulfilled")
      .flatMap((r) => (r as PromiseFulfilledResult<any>).value)
      .flat();

    // Set budget-typical prices if budget is specified
    if (intent.budget) {
      const budgetPrices: Record<string, number> = {
        value: 100,
        mid: 250,
        premium: 525,
        luxury: 1000,
      };
      const price = budgetPrices[intent.budget] || 250;
      exaItems.forEach((item) => {
        item.hotel.basePriceUsd = price;
      });
    }

    const allHotels = exaItems.map((item) => item.hotel);
    const urlById = new Map(
      exaItems.map((item) => [item.hotel.id, item.bookUrl])
    );

    // Score all hotels
    const scoredHotels: ScoredHotel[] = allHotels.map((hotel) => ({
      hotel,
      score: scoreHotel(hotel, intent),
    }));

    // Filter hotels - prioritize location matches
    const filtered = scoredHotels.filter((sh) => {
      // If no location specified, allow hotels with non-negative scores
      if (intent.location.trim().length === 0) {
        return sh.score >= 0;
      }

      // If location is specified, require positive score (location match is heavily weighted)
      // Hotels with wrong locations will have negative scores due to penalty
      return sh.score > 0;
    });

    // Sort by score descending to prioritize best matches
    filtered.sort((a, b) => b.score - a.score);

    if (filtered.length === 0) {
      return NextResponse.json(
        {
          error:
            "No hotels found matching your criteria. Try adjusting your search.",
        },
        { status: 404 }
      );
    }

    // Select best brand
    const bestBrand = selectBestBrand(filtered);

    // Get top 2-3 hotels from best brand
    const brandHotels = filtered
      .filter((sh) => sh.hotel.brand === bestBrand)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    if (brandHotels.length === 0) {
      return NextResponse.json(
        {
          error:
            "No hotels found for selected brand. Try adjusting your search.",
        },
        { status: 404 }
      );
    }

    // Build plan option
    const planOption: PlanOption = {
      brand: bestBrand,
      rationale: `Selected ${
        bestBrand.charAt(0).toUpperCase() + bestBrand.slice(1)
      } based on your preferences for ${intent.mood} experiences${
        intent.location ? ` in ${intent.location}` : ""
      }.`,
      hotels: brandHotels.map((scored) => ({
        hotel: scored.hotel,
        score: scored.score,
        highlights: getHighlights(scored.hotel, intent),
        ancillaries: getAncillariesForIntent(intent, scored.hotel).slice(0, 4), // Limit to 4
        bookUrl:
          urlById.get(scored.hotel.id) ?? buildBrandDeepLink(scored.hotel),
      })),
    };

    return NextResponse.json(planOption);
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
