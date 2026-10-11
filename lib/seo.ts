import type { Metadata } from "next";
export const SITE_URL = "https://www.aucklandknights.co.nz";
export const CLUB_NAME = "Auckland Knights Chess Club";
export function pageMetadata(title: string, description: string, path: string): Metadata {
  const url = `${SITE_URL}${path}`;
  return { title, description, alternates: { canonical: url }, openGraph: { title: `${title} | ${CLUB_NAME}`, description, url, siteName: CLUB_NAME, locale: "en_NZ", type: "website", images: [{ url: `${SITE_URL}/logo.png`, alt: CLUB_NAME }] }, twitter: { card: "summary", title: `${title} | ${CLUB_NAME}`, description, images: [`${SITE_URL}/logo.png`] } };
}
export function jsonLd(data: unknown) { return JSON.stringify(data).replace(/</g, "\\u003c"); }
export function plainDescription(value: unknown) { return String(value || "").replace(/<[^>]*>/g, " ").replace(/[#*_`]/g, "").replace(/\s+/g, " ").trim().slice(0, 160); }
export const registrationAnswers = [
  { question: "Who can join Auckland Knights Chess Club?", answer: "Children, beginners and adults are welcome. The club serves East Auckland and South Auckland. Use the Join page to register or find your existing member record." },
  { question: "Do I need membership to enter a tournament?", answer: "Club events require active membership. General and open events welcome everyone. Tournament entry fees are separate from membership fees, including for club members." },
  { question: "What details do I need to register?", answer: "Provide your name, email, phone number and date of birth. Include your FIDE and NZCF IDs and ratings if you have them. Check the tournament page for its entry fee, venue and schedule." },
  { question: "Where can I find tournament dates and results?", answer: "Use Tournaments for event details and registration, Calendar for club events, and Results for published results. Each tournament page lists the available result links." }
];
