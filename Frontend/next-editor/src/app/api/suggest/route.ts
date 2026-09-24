import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

let n1Model: Record<string, string[]> | null = null;
let n2Model: Record<string, string[]> | null = null;

// Load lazily to prevent slowing down build time
function loadModels() {
    if (!process.cwd()) return;

    if (!n1Model) {
        try {
            const n1Path = path.join(process.cwd(), 'model', 'markov_n1.json');
            n1Model = JSON.parse(fs.readFileSync(n1Path, 'utf8'));
        } catch (e) { console.error("Could not load n1", e); n1Model = {} }
    }
    if (!n2Model) {
        try {
            const n2Path = path.join(process.cwd(), 'model', 'markov_n2.json');
            n2Model = JSON.parse(fs.readFileSync(n2Path, 'utf8'));
        } catch (e) { console.error("Could not load n2", e); n2Model = {} }
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { text } = body;

        if (!text || typeof text !== "string") {
            return NextResponse.json({ suggestions: [] });
        }

        loadModels();

        // Extract words, ignoring punctuation for matching
        const words = text
            .replace(/[^\w\s'àâäéèêëïîôöùûüÿœæñ-]/gi, '')
            .trim()
            .split(/\s+/)
            .filter(w => w.length > 0);

        const lastWord = words[words.length - 1]?.toLowerCase();
        const secondLastWord = words[words.length - 2]?.toLowerCase();

        let suggestions: string[] = [];

        if (secondLastWord && lastWord && n2Model) {
            const bigram = `${secondLastWord} ${lastWord}`;
            if (n2Model[bigram]) {
                suggestions = n2Model[bigram];
            }
        }

        if (suggestions.length === 0 && lastWord && n1Model) {
            if (n1Model[lastWord]) {
                suggestions = n1Model[lastWord];
            }
        }

        // Return top 4
        return NextResponse.json({ suggestions: suggestions.slice(0, 4) });
    } catch (error) {
        console.error("Suggestion Error:", error);
        return NextResponse.json({ suggestions: [] }, { status: 500 });
    }
}
